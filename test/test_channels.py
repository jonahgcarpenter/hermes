import pytest
import requests

BASE_URL = "http://localhost:8080/api"

def get_auth_session(payload):
    """Helper function to log in a user and return the authenticated session."""
    session = requests.Session()
    session.post(f"{BASE_URL}/auth/login", json={
        "identity": payload["username"],
        "password": payload["password"]
    })
    return session

# ---------------------------------------------------------
# CHANNEL CRUD TESTS
# ---------------------------------------------------------

def test_list_default_channels(user_factory, server_factory):
    """Verify that a new server automatically has its 'general' and 'voice' channels."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    
    server_res = server_factory(session, name="Default Channel Server")
    server_id = server_res.json()["id"]
    
    response = session.get(f"{BASE_URL}/servers/{server_id}/channels/")
    
    assert response.status_code == 200
    channels = response.json()
    # Expecting exactly 2: 'general' (text) and 'voice' (voice)
    assert len(channels) == 2
    names = [c["name"] for c in channels]
    assert "general" in names
    assert "voice" in names

def test_create_channel_success(user_factory, server_factory):
    """Ensure a user can create a custom channel with automatic positioning."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    server_res = server_factory(session, name="Channel Creation Server")
    server_id = server_res.json()["id"]
    
    channel_payload = {
        "name": "announcements",
        "type": "TEXT"
    }
    response = session.post(f"{BASE_URL}/servers/{server_id}/channels/", json=channel_payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "announcements"
    # The default channels are position 0 and 1, so this should be 2
    assert data["position"] == 2

def test_create_duplicate_channel_fails(user_factory, server_factory):
    """Ensure duplicate names within the same type are rejected with 409 Conflict."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    server_res = server_factory(session, name="Duplicate Server")
    server_id = server_res.json()["id"]
    
    # Try to create 'general' which already exists by default
    channel_payload = {
        "name": "general",
        "type": "TEXT"
    }
    response = session.post(f"{BASE_URL}/servers/{server_id}/channels/", json=channel_payload)
    
    assert response.status_code == 409
    assert "already exists" in response.json()["error"]

def test_update_channel_success(user_factory, server_factory):
    """Ensure channel names and positions can be updated."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    server_res = server_factory(session, name="Update Server")
    server_id = server_res.json()["id"]
    
    # Get the 'general' channel ID
    channels = session.get(f"{BASE_URL}/servers/{server_id}/channels/").json()
    channel_id = channels[0]["id"]
    
    update_payload = {
        "name": "lounge",
        "position": 10
    }
    response = session.patch(
        f"{BASE_URL}/servers/{server_id}/channels/{channel_id}", 
        json=update_payload
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "lounge"
    assert data["position"] == 10

def test_delete_channel_success(user_factory, server_factory):
    """Ensure a channel can be deleted (204 No Content)."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    server_res = server_factory(session, name="Delete Server")
    server_id = server_res.json()["id"]
    
    # Create a channel to delete
    new_channel = session.post(f"{BASE_URL}/servers/{server_id}/channels/", json={
        "name": "temporary", "type": "TEXT"
    }).json()
    channel_id = new_channel["id"]
    
    # Delete it
    response = session.delete(f"{BASE_URL}/servers/{server_id}/channels/{channel_id}")
    assert response.status_code == 204
    
    # Verify it is gone from the list
    list_res = session.get(f"{BASE_URL}/servers/{server_id}/channels/")
    channel_ids = [c["id"] for c in list_res.json()]
    assert channel_id not in channel_ids

def test_channel_not_found(user_factory, server_factory):
    """Verify 404 when accessing a channel that doesn't exist or belongs elsewhere."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    server_res = server_factory(session, name="Empty Server")
    server_id = server_res.json()["id"]
    
    # Attempting to delete a fake ID
    response = session.delete(f"{BASE_URL}/servers/{server_id}/channels/9999999")
    assert response.status_code == 404
