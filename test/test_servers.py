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

def test_create_server_success(user_factory, server_factory):
    """Ensure an authenticated user can create a server and it gets cleaned up."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    
    # Use factory for automatic cleanup
    response = server_factory(session, name="My Awesome Server", icon_url="https://example.com/icon.png")
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My Awesome Server"
    assert "id" in data

def test_list_servers(user_factory, server_factory):
    """Ensure a user can fetch a list of servers they are a member of."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    
    # Create two servers via factory
    server_factory(session, name="Server 1")
    server_factory(session, name="Server 2")
    
    response = session.get(f"{BASE_URL}/servers/")
    
    assert response.status_code == 200
    servers = response.json()
    assert len(servers) == 2

# ---------------------------------------------------------
# READ & UPDATE SERVER TESTS
# ---------------------------------------------------------

def test_server_details_success(user_factory, server_factory):
    """Ensure a member can fetch specific server details."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    
    # Create server via factory
    create_res = server_factory(session, name="Details Test")
    server_id = create_res.json()["id"]
    
    response = session.get(f"{BASE_URL}/servers/{server_id}")
    
    assert response.status_code == 200
    assert response.json()["name"] == "Details Test"

def test_update_server_success(user_factory, server_factory):
    """Ensure a server owner can update the server's name and icon."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    
    create_res = server_factory(session, name="Original Name")
    server_id = create_res.json()["id"]
    
    update_payload = {"name": "Updated Name"}
    update_res = session.patch(f"{BASE_URL}/servers/{server_id}", json=update_payload)
    
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Updated Name"

# ---------------------------------------------------------
# JOIN & LEAVE SERVER TESTS
# ---------------------------------------------------------

def test_join_server_success(user_factory, server_factory):
    """Ensure a second user can join an existing server."""
    owner_payload, _ = user_factory()
    owner_session = get_auth_session(owner_payload)
    
    # Owner creates server via factory
    create_res = server_factory(owner_session, name="Community Hub")
    server_id = create_res.json()["id"]
    
    joiner_payload, _ = user_factory()
    joiner_session = get_auth_session(joiner_payload)
    
    join_res = joiner_session.post(f"{BASE_URL}/servers/{server_id}/join")
    assert join_res.status_code == 200

def test_leave_server_success_and_rejoin(user_factory, server_factory):
    """Ensure a member can leave and rejoin a server."""
    owner_payload, _ = user_factory()
    owner_session = get_auth_session(owner_payload)
    create_res = server_factory(owner_session, name="Rejoin Test")
    server_id = create_res.json()["id"]
    
    member_payload, _ = user_factory()
    member_session = get_auth_session(member_payload)
    member_session.post(f"{BASE_URL}/servers/{server_id}/join")
    
    # Leave
    assert member_session.delete(f"{BASE_URL}/servers/{server_id}/leave").status_code == 200
    
    # Rejoin
    rejoin_res = member_session.post(f"{BASE_URL}/servers/{server_id}/join")
    assert rejoin_res.status_code == 200
    assert rejoin_res.json()["message"] == "Successfully rejoined the server"

def test_owner_cannot_leave_server(user_factory, server_factory):
    """Ensure the backend blocks the server owner from leaving."""
    owner_payload, _ = user_factory()
    session = get_auth_session(owner_payload)
    
    create_res = server_factory(session, name="Owner Jail")
    server_id = create_res.json()["id"]
    
    leave_res = session.delete(f"{BASE_URL}/servers/{server_id}/leave")
    assert leave_res.status_code == 400

def test_join_server_already_member(user_factory, server_factory):
    """
    Ensure the backend returns 409 Conflict when a user attempts 
    to join a server they are already an active member of.
    """
    # Create a user and have them create a server
    payload, _ = user_factory()
    session = get_auth_session(payload)
    
    create_res = server_factory(session, name="Exclusive Club")
    server_id = create_res.json()["id"]
    
    # Attempt to join the same server again
    response = session.post(f"{BASE_URL}/servers/{server_id}/join")
    
    # Expect 409 Conflict
    assert response.status_code == 409
    assert "already a member" in response.json()["error"].lower()

def test_join_deleted_server_fails(user_factory):
    """Ensure a user cannot join a server that has been deleted (returns 404)."""
    # Owner creates a server
    owner_payload, _ = user_factory()
    owner_session = get_auth_session(owner_payload)
    
    create_res = owner_session.post(f"{BASE_URL}/servers/", json={"name": "Temporary Server"})
    assert create_res.status_code == 201
    server_id = create_res.json()["id"]
    
    # Owner deletes the server
    delete_res = owner_session.delete(f"{BASE_URL}/servers/{server_id}")
    assert delete_res.status_code == 204
    
    # A second user tries to join the now-deleted server
    joiner_payload, _ = user_factory()
    joiner_session = get_auth_session(joiner_payload)
    
    join_res = joiner_session.post(f"{BASE_URL}/servers/{server_id}/join")
    
    # Expect 404 Not Found
    assert join_res.status_code == 404
    assert "server not found" in join_res.json()["error"].lower()
