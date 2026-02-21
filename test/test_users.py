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
# GET CURRENT USER TESTS
# ---------------------------------------------------------

def test_get_current_user_success(user_factory):
    """Ensure an authenticated user can fetch their own profile."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    
    response = session.get(f"{BASE_URL}/users/@me")
    
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == payload["username"]
    assert data["display_name"] == payload["display_name"]

def test_get_current_user_unauthorized():
    """Ensure unauthenticated requests are rejected."""
    response = requests.get(f"{BASE_URL}/users/@me")
    assert response.status_code == 401

# ---------------------------------------------------------
# UPDATE USER TESTS
# ---------------------------------------------------------

def test_update_user_success(user_factory):
    """Ensure users can update all fields at once, or just a single field."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    
    # Test updating ALL fields at once
    full_update_payload = {
        "username": "new_username123",
        "display_name": "Updated Name",
        "status": "Busy",
        "avatar_url": "https://example.com/avatar.png"
    }
    
    full_response = session.patch(f"{BASE_URL}/users/@me", json=full_update_payload)
    
    assert full_response.status_code == 200
    full_data = full_response.json()
    assert full_data["username"] == "new_username123"
    assert full_data["display_name"] == "Updated Name"
    assert full_data["status"] == "Busy"
    assert full_data["avatar_url"] == "https://example.com/avatar.png"

    # Test updating a SINGLE field
    single_update_payload = {
        "status": "Offline"
    }
    
    single_response = session.patch(f"{BASE_URL}/users/@me", json=single_update_payload)
    
    assert single_response.status_code == 200
    single_data = single_response.json()
    
    # Verify the specific field changed
    assert single_data["status"] == "Offline"
    
    # Verify the omitted fields were left completely alone
    assert single_data["username"] == "new_username123"
    assert single_data["display_name"] == "Updated Name"
    assert single_data["avatar_url"] == "https://example.com/avatar.png"

def test_update_user_validation_errors(user_factory):
    """Ensure the controller rejects payloads that violate length rules."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    
    # Username must be >= 3 characters per the gin binding
    response = session.patch(f"{BASE_URL}/users/@me", json={"username": "ab"})
    
    assert response.status_code == 400

# ---------------------------------------------------------
# GET USER PROFILE BY ID TESTS
# ---------------------------------------------------------

def test_get_user_profile_success(user_factory):
    """Ensure an authenticated user can view another user's profile."""
    # Create the user we want to look up
    target_payload, target_res = user_factory()
    target_id = target_res.json()["id"]
    
    # Create the user who will be searching
    searcher_payload, _ = user_factory()
    session = get_auth_session(searcher_payload)
    
    response = session.get(f"{BASE_URL}/users/{target_id}")
    
    assert response.status_code == 200
    assert response.json()["username"] == target_payload["username"]

def test_get_user_profile_not_found(user_factory):
    """Ensure fetching a non-existent ID returns 404."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    
    response = session.get(f"{BASE_URL}/users/999999999")
    assert response.status_code == 404

def test_get_user_profile_invalid_format(user_factory):
    """Ensure providing a non-numeric ID returns a 400."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    
    # Passing text instead of a uint64
    response = session.get(f"{BASE_URL}/users/invalid_id_format")
    
    assert response.status_code == 400
    assert "invalid user ID format" in response.json()["error"]

# ---------------------------------------------------------
# DELETE USER TESTS
# ---------------------------------------------------------

def test_delete_user_success(user_factory):
    """Ensure users can delete their own accounts."""
    payload, _ = user_factory()
    session = get_auth_session(payload)
    
    # Delete the account
    response = session.delete(f"{BASE_URL}/users/@me")
    
    # Controller returns 204 No Content on successful deletion
    assert response.status_code == 204
