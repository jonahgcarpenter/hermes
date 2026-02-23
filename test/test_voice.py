import pytest
import requests
import websocket
import json
import time

BASE_URL = "http://localhost:8080/api"

MOCK_OFFER = {
    "type": "offer",
    "sdp": (
        "v=0\r\n"
        "o=- 1234567890 1234567890 IN IP4 127.0.0.1\r\n"
        "s=-\r\n"
        "t=0 0\r\n"
        "m=audio 9 UDP/TLS/RTP/SAVPF 111\r\n"
        "c=IN IP4 127.0.0.1\r\n"
        "a=rtpmap:111 opus/48000/2\r\n"
    )
}

def get_auth_session(payload):
    session = requests.Session()
    session.post(f"{BASE_URL}/auth/login", json={
        "identity": payload["username"],
        "password": payload["password"]
    })
    return session

# ---------------------------------------------------------
# VOICE CHANNEL TESTS
# ---------------------------------------------------------

def test_join_and_leave_voice_api(user_factory, server_factory):
    """Verify the REST endpoints for joining and leaving a voice channel."""
    # Setup
    payload, _ = user_factory()
    session = get_auth_session(payload)
    server_res = server_factory(session, name="Voice Server")
    server_id = server_res.json()["id"]
    
    channels = session.get(f"{BASE_URL}/servers/{server_id}/channels/").json()
    voice_channel = next(c for c in channels if c["type"] == "VOICE")
    channel_id = voice_channel["id"]

    # Join Voice
    join_res = session.post(f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/voice/join")
    assert join_res.status_code == 200
    assert join_res.json()["message"] == "Successfully joined voice channel"

    # Leave Voice
    leave_res = session.post(f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/voice/leave")
    assert leave_res.status_code == 200
    assert leave_res.json()["message"] == "Successfully left voice channel"

def test_voice_broadcast_events(user_factory, server_factory):
    """Verify voice join/leave via the Message WebSocket hub."""
    # Setup
    owner_payload, owner_res = user_factory()
    owner_id = owner_res.json()["id"]
    owner_session = get_auth_session(owner_payload)
    server_res = server_factory(owner_session, name="Voice Broadcast Server")
    server_id = server_res.json()["id"]
    
    channels = owner_session.get(f"{BASE_URL}/servers/{server_id}/channels/").json()
    voice_channel = next(c for c in channels if c["type"] == "VOICE")
    channel_id = voice_channel["id"]

    joiner_payload, _ = user_factory()
    joiner_session = get_auth_session(joiner_payload)
    joiner_session.post(f"{BASE_URL}/servers/{server_id}/join")

    token = joiner_session.cookies.get("hermes_session")
    ws_base = BASE_URL.replace("http://", "ws://").replace("https://", "wss://")
    
    ws_endpoint = f"{ws_base}/servers/{server_id}/channels/{channel_id}/messages/ws"
    ws_client = websocket.create_connection(f"{ws_endpoint}?token={token}")

    try:
        # Owner joins voice -> Broadcasts to Manager.Broadcast
        owner_session.post(f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/voice/join")
        
        ws_client.settimeout(2.0)
        join_event = json.loads(ws_client.recv())
        
        assert join_event["event"] == "VOICE_USER_JOINED"
        assert join_event["data"]["user_id"] == str(owner_id)

        # Owner leaves voice -> Broadcasts to Manager.Broadcast
        owner_session.post(f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/voice/leave")
        
        leave_event = json.loads(ws_client.recv())
        assert leave_event["event"] == "VOICE_USER_LEFT"
        assert leave_event["data"]["user_id"] == str(owner_id)

    finally:
        ws_client.close()

# ---------------------------------------------------------
# VOICE LOGIC TESTS
# ---------------------------------------------------------

def test_voice_signaling_handshake(user_factory, server_factory):
    """Verify that a user can establish a WebRTC signaling handshake."""
    # Setup
    owner_payload, _ = user_factory()
    owner_session = get_auth_session(owner_payload)
    server_res = server_factory(owner_session, name="Handshake Server")
    server_id = server_res.json()["id"]
    
    channels = owner_session.get(f"{BASE_URL}/servers/{server_id}/channels/").json()
    voice_channel = next(c for c in channels if c["type"] == "VOICE")
    channel_id = voice_channel["id"]

    # Open Voice WebSocket
    token = owner_session.cookies.get("hermes_session")
    ws_base = BASE_URL.replace("http://", "ws://").replace("https://", "wss://")
    ws_endpoint = f"{ws_base}/servers/{server_id}/channels/{channel_id}/voice/ws"
    ws_client = websocket.create_connection(f"{ws_endpoint}?token={token}")

    try:
        ws_client.settimeout(5.0)
        
        # Server should start gathering and sending ICE candidates immediately
        found_candidate = False
        for _ in range(5):
            msg = json.loads(ws_client.recv())
            if msg["event"] == "ICE_CANDIDATE":
                found_candidate = True
                break
        assert found_candidate, "Should receive ICE candidates from server"

        # Send WebRTC Offer
        ws_client.send(json.dumps({
            "event": "WEBRTC_OFFER",
            "data": MOCK_OFFER
        }))

        # Expect WebRTC Answer from the server
        # We might need to skip remaining ICE candidates
        received_answer = False
        for _ in range(10):
            resp = json.loads(ws_client.recv())
            if resp["event"] == "WEBRTC_ANSWER":
                received_answer = True
                assert "sdp" in resp["data"]
                assert resp["data"]["type"] == "answer"
                break
        
        assert received_answer, "Should receive WEBRTC_ANSWER after sending offer"

    finally:
        ws_client.close()

def test_voice_two_users_connection(user_factory, server_factory):
    """Verify that multiple users can connect to the same voice room and receive join events."""
    # Setup Server
    owner_payload, _ = user_factory()
    owner_session = get_auth_session(owner_payload)
    server_res = server_factory(owner_session, name="Multi-User Voice Server")
    server_id = server_res.json()["id"]
    
    channels = owner_session.get(f"{BASE_URL}/servers/{server_id}/channels/").json()
    voice_channel = next(c for c in channels if c["type"] == "VOICE")
    channel_id = voice_channel["id"]

    # Setup User B (The Listener)
    user_b_payload, user_b_res = user_factory()
    user_b_id = user_b_res.json()["id"]
    session_b = get_auth_session(user_b_payload)
    session_b.post(f"{BASE_URL}/servers/{server_id}/join")
    token_b = session_b.cookies.get("hermes_session")

    # Connect User B to the Message WS to receive metadata events
    ws_base = BASE_URL.replace("http://", "ws://").replace("https://", "wss://")
    msg_ws_endpoint = f"{ws_base}/servers/{server_id}/channels/{channel_id}/messages/ws"
    msg_ws_b = websocket.create_connection(f"{msg_ws_endpoint}?token={token_b}")

    # Setup User A (The Joiner)
    user_a_payload, user_a_res = user_factory()
    user_a_id = user_a_res.json()["id"]
    session_a = get_auth_session(user_a_payload)
    session_a.post(f"{BASE_URL}/servers/{server_id}/join")
    token_a = session_a.cookies.get("hermes_session")

    try:
        # User A joins voice via REST
        session_a.post(f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/voice/join")

        # User B receives VOICE_USER_JOINED on the message hub
        msg_ws_b.settimeout(2.0)
        event = json.loads(msg_ws_b.recv())
        assert event["event"] == "VOICE_USER_JOINED"
        assert event["data"]["user_id"] == str(user_a_id)

        # Both can establish private voice WS connections
        voice_ws_endpoint = f"{ws_base}/servers/{server_id}/channels/{channel_id}/voice/ws"
        ws_voice_a = websocket.create_connection(f"{voice_ws_endpoint}?token={token_a}")
        ws_voice_b = websocket.create_connection(f"{voice_ws_endpoint}?token={token_b}")
        
        # Verify both get answers to their offers
        for ws in [ws_voice_a, ws_voice_b]:
            ws.send(json.dumps({"event": "WEBRTC_OFFER", "data": MOCK_OFFER}))
            found = False
            for _ in range(5):
                m = json.loads(ws.recv())
                if m["event"] == "WEBRTC_ANSWER":
                    found = True; break
            assert found
            ws.close()

    finally:
        msg_ws_b.close()
