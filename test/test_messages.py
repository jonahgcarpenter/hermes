import pytest
import requests
import websocket
import json
import time

BASE_URL = "http://localhost:8080/api"

def get_auth_session(payload):
    session = requests.Session()
    session.post(f"{BASE_URL}/auth/login", json={
        "identity": payload["username"],
        "password": payload["password"]
    })
    return session

# ---------------------------------------------------------
# MESSAGE CRUD TESTS
# ---------------------------------------------------------

def test_send_and_list_messages(user_factory, server_factory):
    """Ensure a user can send a message and it appears in the channel history."""
    # Create user, server, and get default 'general' channel
    payload, _ = user_factory()
    session = get_auth_session(payload)
    server_res = server_factory(session, name="Message Server")
    server_id = server_res.json()["id"]
    
    channels = session.get(f"{BASE_URL}/servers/{server_id}/channels/").json()
    channel_id = channels[0]["id"] # 'general'

    # Send a message
    msg_payload = {"content": "Hello, Hermes!"}
    send_res = session.post(
        f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/messages/", 
        json=msg_payload
    )
    
    assert send_res.status_code == 201
    assert send_res.json()["content"] == "Hello, Hermes!"
    assert send_res.json()["author"]["username"] == payload["username"]

    # List messages to see if it's in history
    list_res = session.get(f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/messages/")
    assert list_res.status_code == 200
    messages = list_res.json()
    assert len(messages) >= 1
    assert messages[0]["content"] == "Hello, Hermes!"

def test_edit_message_permissions(user_factory, server_factory):
    """Ensure only the original author can edit their message."""
    # Setup Author and Message
    author_payload, _ = user_factory()
    author_session = get_auth_session(author_payload)
    server_res = server_factory(author_session, name="Permission Server")
    server_id = server_res.json()["id"]
    
    channels = author_session.get(f"{BASE_URL}/servers/{server_id}/channels/").json()
    channel_id = channels[0]["id"]
    
    msg_res = author_session.post(
        f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/messages/", 
        json={"content": "Original Content"}
    )
    message_id = msg_res.json()["id"]

    # Try to edit as a DIFFERENT user
    thief_payload, _ = user_factory()
    thief_session = get_auth_session(thief_payload)
    # Join server first
    thief_session.post(f"{BASE_URL}/servers/{server_id}/join")
    
    edit_res = thief_session.patch(
        f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/messages/{message_id}",
        json={"content": "I stole this message"}
    )
    
    assert edit_res.status_code == 403
    assert "only edit your own messages" in edit_res.json()["error"]

def test_ghost_author_in_history(user_factory, server_factory):
    """Verify messages remain but show 'Deleted User' after author deletes account."""
    # User sends a message
    author_payload, author_res = user_factory()
    author_id = author_res.json()["id"]
    author_session = get_auth_session(author_payload)
    
    server_res = server_factory(author_session, name="Ghost Test Server")
    server_id = server_res.json()["id"]
    
    channels = author_session.get(f"{BASE_URL}/servers/{server_id}/channels/").json()
    channel_id = channels[0]["id"]
    
    author_session.post(
        f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/messages/", 
        json={"content": "My final words."}
    )

    # Author deletes (ghosts) their account
    delete_res = author_session.delete(f"{BASE_URL}/users/@me")
    assert delete_res.status_code == 204

    # Another user sees the message from 'Deleted User'
    viewer_payload, _ = user_factory()
    viewer_session = get_auth_session(viewer_payload)
    viewer_session.post(f"{BASE_URL}/servers/{server_id}/join")
    
    history_res = viewer_session.get(f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/messages/")
    msg = history_res.json()[0]
    
    # The backend Preload("Author") should now pick up the ghost data
    assert msg["author"]["display_name"] == "Deleted User"
    assert msg["author"]["username"].startswith("ghost_")

def test_message_broadcast_to_websocket(user_factory, server_factory):
    """Verify message broadcast using query parameter token for WS."""
    
    # Setup owner, server, and channel
    owner_payload, _ = user_factory()
    owner_session = get_auth_session(owner_payload)
    server_res = server_factory(owner_session, name="WS Test Server")
    server_id = server_res.json()["id"]
    
    channels = owner_session.get(f"{BASE_URL}/servers/{server_id}/channels/").json()
    channel_id = channels[0]["id"] 

    # Joiner setup
    joiner_payload, _ = user_factory()
    joiner_session = get_auth_session(joiner_payload)
    joiner_session.post(f"{BASE_URL}/servers/{server_id}/join")

    # Extract the token from the session cookies
    token = joiner_session.cookies.get("hermes_session")

    # Construct URL with ?token= query parameter
    ws_base = BASE_URL.replace("http://", "ws://").replace("https://", "wss://")
    ws_endpoint = f"{ws_base}/servers/{server_id}/channels/{channel_id}/messages/ws"
    
    # Connect via query param
    ws_client = websocket.create_connection(f"{ws_endpoint}?token={token}")

    try:
        msg_content = "Query param auth test"
        owner_session.post(
            f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/messages/", 
            json={"content": msg_content}
        )

        ws_client.settimeout(2.0)
        result = ws_client.recv()
        event_data = json.loads(result)

        assert event_data["event"] == "MESSAGE_CREATE"
        assert event_data["data"]["content"] == msg_content
        
    finally:
        ws_client.close()

def test_message_update_broadcast(user_factory, server_factory):
    """Verify that editing a message triggers a MESSAGE_UPDATE event over WS."""
    # Two users in a server
    owner_payload, _ = user_factory()
    owner_session = get_auth_session(owner_payload)
    server_res = server_factory(owner_session, name="Update Broadcast Server")
    server_id = server_res.json()["id"]
    
    channels = owner_session.get(f"{BASE_URL}/servers/{server_id}/channels/").json()
    channel_id = channels[0]["id"] 

    joiner_payload, _ = user_factory()
    joiner_session = get_auth_session(joiner_payload)
    joiner_session.post(f"{BASE_URL}/servers/{server_id}/join")

    # Connect Joiner to WebSocket
    token = joiner_session.cookies.get("hermes_session")
    ws_base = BASE_URL.replace("http://", "ws://").replace("https://", "wss://")
    ws_endpoint = f"{ws_base}/servers/{server_id}/channels/{channel_id}/messages/ws"
    ws_client = websocket.create_connection(f"{ws_endpoint}?token={token}")

    try:
        # Create initial message
        msg_res = owner_session.post(
            f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/messages/", 
            json={"content": "Before Edit"}
        )
        message_id = msg_res.json()["id"]
        
        # Consume the 'CREATE' event to clear the buffer
        ws_client.settimeout(2.0)
        ws_client.recv() 

        # Edit the message
        new_content = "After Edit"
        owner_session.patch(
            f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/messages/{message_id}",
            json={"content": new_content}
        )

        # Receive MESSAGE_UPDATE
        update_result = json.loads(ws_client.recv())
        assert update_result["event"] == "MESSAGE_UPDATE"
        assert update_result["data"]["content"] == new_content
        assert update_result["data"]["id"] == message_id

    finally:
        ws_client.close()

def test_message_delete_broadcast(user_factory, server_factory):
    """Verify that deleting a message triggers a MESSAGE_DELETE event over WS."""
    # Two users in a server
    owner_payload, _ = user_factory()
    owner_session = get_auth_session(owner_payload)
    server_res = server_factory(owner_session, name="Delete Broadcast Server")
    server_id = server_res.json()["id"]
    
    channels = owner_session.get(f"{BASE_URL}/servers/{server_id}/channels/").json()
    channel_id = channels[0]["id"] 

    joiner_payload, _ = user_factory()
    joiner_session = get_auth_session(joiner_payload)
    joiner_session.post(f"{BASE_URL}/servers/{server_id}/join")

    # Connect Joiner to WebSocket
    token = joiner_session.cookies.get("hermes_session")
    ws_base = BASE_URL.replace("http://", "ws://").replace("https://", "wss://")
    ws_endpoint = f"{ws_base}/servers/{server_id}/channels/{channel_id}/messages/ws"
    ws_client = websocket.create_connection(f"{ws_endpoint}?token={token}")

    try:
        # Create message to delete
        msg_res = owner_session.post(
            f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/messages/", 
            json={"content": "Goodbye World"}
        )
        message_id = msg_res.json()["id"]
        ws_client.settimeout(2.0)
        ws_client.recv() # Clear CREATE event

        # Delete the message
        owner_session.delete(
            f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/messages/{message_id}"
        )

        # Receive MESSAGE_DELETE
        delete_result = json.loads(ws_client.recv())
        assert delete_result["event"] == "MESSAGE_DELETE"
        
        # Verify the ID is a string (as formatted in your Go controller)
        assert delete_result["data"]["id"] == str(message_id)

    finally:
        ws_client.close()

# ---------------------------------------------------------
# VALIDATION & PERMISSION OVERRIDE TESTS
# ---------------------------------------------------------

def test_send_message_validation(user_factory, server_factory):
    """Ensure message content length limits are enforced (1-2000 chars)."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    server_res = server_factory(session, name="Validation Server")
    server_id = server_res.json()["id"]
    channels = session.get(f"{BASE_URL}/servers/{server_id}/channels/").json()
    channel_id = channels[0]["id"]

    # Empty content (min=1)
    res_empty = session.post(
        f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/messages/", 
        json={"content": ""}
    )
    assert res_empty.status_code == 400

    # Content too long (max=2000)
    long_content = "a" * 2001
    res_long = session.post(
        f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/messages/", 
        json={"content": long_content}
    )
    assert res_long.status_code == 400

def test_admin_can_delete_others_message(user_factory, server_factory):
    """Verify that a server owner/admin can delete messages sent by other members."""
    # Owner creates server
    owner_payload, _ = user_factory()
    owner_session = get_auth_session(owner_payload)
    server_res = server_factory(owner_session, name="Admin Power Server")
    server_id = server_res.json()["id"]
    
    # Regular member joins and sends a message
    member_payload, _ = user_factory()
    member_session = get_auth_session(member_payload)
    member_session.post(f"{BASE_URL}/servers/{server_id}/join")
    
    channels = member_session.get(f"{BASE_URL}/servers/{server_id}/channels/").json()
    channel_id = channels[0]["id"]
    
    msg_res = member_session.post(
        f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/messages/", 
        json={"content": "I am a member"}
    )
    message_id = msg_res.json()["id"]

    # Owner deletes the member's message
    delete_res = owner_session.delete(
        f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/messages/{message_id}"
    )
    
    assert delete_res.status_code == 204

def test_member_cannot_delete_others_message(user_factory, server_factory):
    """Ensure a regular member is blocked from deleting another member's message."""
    # Create server and two members
    owner_payload, _ = user_factory()
    owner_session = get_auth_session(owner_payload)
    server_res = server_factory(owner_session, name="Security Server")
    server_id = server_res.json()["id"]

    # User A sends a message
    user_a_payload, _ = user_factory()
    session_a = get_auth_session(user_a_payload)
    session_a.post(f"{BASE_URL}/servers/{server_id}/join")
    
    channels = session_a.get(f"{BASE_URL}/servers/{server_id}/channels/").json()
    channel_id = channels[0]["id"]
    
    msg_res = session_a.post(
        f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/messages/", 
        json={"content": "User A's message"}
    )
    message_id = msg_res.json()["id"]

    # User B attempts to delete User A's message
    user_b_payload, _ = user_factory()
    session_b = get_auth_session(user_b_payload)
    session_b.post(f"{BASE_URL}/servers/{server_id}/join")

    delete_res = session_b.delete(
        f"{BASE_URL}/servers/{server_id}/channels/{channel_id}/messages/{message_id}"
    )

    # Expect 403 Forbidden
    assert delete_res.status_code == 403
    assert "not have permission" in delete_res.json()["error"]
