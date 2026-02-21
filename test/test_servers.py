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
# CREATE & LIST SERVER TESTS
# ---------------------------------------------------------

def test_create_server_success(user_factory):
    """Ensure an authenticated user can create a server."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    
    server_payload = {
        "name": "My Awesome Server",
        "icon_url": "https://example.com/icon.png"
    }
    
    response = session.post(f"{BASE_URL}/servers/", json=server_payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My Awesome Server"
    assert data["icon_url"] == "https://example.com/icon.png"
    assert "id" in data

def test_create_server_validation(user_factory):
    """Ensure server creation enforces payload rules (name required, min 2 chars)."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    
    # Missing name entirely
    res1 = session.post(f"{BASE_URL}/servers/", json={"icon_url": "https://example.com/icon.png"})
    assert res1.status_code == 400
    
    # Name too short
    res2 = session.post(f"{BASE_URL}/servers/", json={"name": "A"})
    assert res2.status_code == 400

def test_list_servers(user_factory):
    """Ensure a user can fetch a list of servers they are a member of."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    
    # Create two servers
    session.post(f"{BASE_URL}/servers/", json={"name": "Server 1"})
    session.post(f"{BASE_URL}/servers/", json={"name": "Server 2"})
    
    response = session.get(f"{BASE_URL}/servers/")
    
    assert response.status_code == 200
    servers = response.json()
    assert len(servers) == 2
    assert servers[0]["name"] == "Server 1"
    assert servers[1]["name"] == "Server 2"

# ---------------------------------------------------------
# READ, UPDATE, & DELETE SERVER TESTS
# ---------------------------------------------------------

def test_server_details_success(user_factory):
    """Ensure a member can fetch specific server details."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    
    create_res = session.post(f"{BASE_URL}/servers/", json={"name": "Details Test"})
    server_id = create_res.json()["id"]
    
    response = session.get(f"{BASE_URL}/servers/{server_id}")
    
    assert response.status_code == 200
    assert response.json()["name"] == "Details Test"

def test_update_server_success(user_factory):
    """Ensure a server owner can update the server's name and icon."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    
    create_res = session.post(f"{BASE_URL}/servers/", json={"name": "Original Name"})
    server_id = create_res.json()["id"]
    
    update_payload = {"name": "Updated Name", "icon_url": "https://example.com/new.png"}
    update_res = session.patch(f"{BASE_URL}/servers/{server_id}", json=update_payload)
    
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Updated Name"

def test_delete_server_success(user_factory):
    """Ensure a server owner can delete their server."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    
    create_res = session.post(f"{BASE_URL}/servers/", json={"name": "To Be Deleted"})
    server_id = create_res.json()["id"]
    
    delete_res = session.delete(f"{BASE_URL}/servers/{server_id}")
    assert delete_res.status_code == 204

# ---------------------------------------------------------
# JOIN & LEAVE SERVER TESTS
# ---------------------------------------------------------

def test_join_server_success(user_factory):
    """Ensure a second user can join an existing server."""
    owner_payload, _ = user_factory()
    owner_session = get_auth_session(owner_payload)
    
    # Owner creates server
    create_res = owner_session.post(f"{BASE_URL}/servers/", json={"name": "Community Hub"})
    server_id = create_res.json()["id"]
    
    # Second user logs in and joins
    joiner_payload, _ = user_factory()
    joiner_session = get_auth_session(joiner_payload)
    
    join_res = joiner_session.post(f"{BASE_URL}/servers/{server_id}/join")
    
    assert join_res.status_code == 200
    assert join_res.json()["message"] == "Successfully joined the server"

def test_join_server_already_member(user_factory):
    """Ensure joining a server you are already in returns a 409 Conflict."""
    owner_payload, _ = user_factory()
    session = get_auth_session(owner_payload)
    
    # Owner creates server (automatically joining it)
    create_res = session.post(f"{BASE_URL}/servers/", json={"name": "My Hub"})
    server_id = create_res.json()["id"]
    
    # Owner attempts to join their own server again
    join_res = session.post(f"{BASE_URL}/servers/{server_id}/join")
    
    assert join_res.status_code == 409
    assert "already a member" in join_res.json()["error"]

def test_leave_server_success_and_rejoin(user_factory):
    """Ensure a member can leave, and subsequently rejoin a server."""
    owner_payload, _ = user_factory()
    owner_session = get_auth_session(owner_payload)
    create_res = owner_session.post(f"{BASE_URL}/servers/", json={"name": "Rejoin Test"})
    server_id = create_res.json()["id"]
    
    # Member setup and join
    member_payload, _ = user_factory()
    member_session = get_auth_session(member_payload)
    member_session.post(f"{BASE_URL}/servers/{server_id}/join")
    
    # Member leaves
    leave_res = member_session.delete(f"{BASE_URL}/servers/{server_id}/leave")
    assert leave_res.status_code == 200
    
    # Verify they can no longer access server details
    details_res = member_session.get(f"{BASE_URL}/servers/{server_id}")
    assert details_res.status_code in [401, 403, 404]
    
    # Member rejoins (testing the 'left_at = nil' logic)
    rejoin_res = member_session.post(f"{BASE_URL}/servers/{server_id}/join")
    assert rejoin_res.status_code == 200
    assert rejoin_res.json()["message"] == "Successfully rejoined the server"

def test_owner_cannot_leave_server(user_factory):
    """Ensure the backend blocks the server owner from leaving."""
    owner_payload, _ = user_factory()
    session = get_auth_session(owner_payload)
    
    create_res = session.post(f"{BASE_URL}/servers/", json={"name": "Owner Jail"})
    server_id = create_res.json()["id"]
    
    leave_res = session.delete(f"{BASE_URL}/servers/{server_id}/leave")
    
    assert leave_res.status_code == 400
    assert "owner cannot leave without transferring ownership" in leave_res.json()["error"]
