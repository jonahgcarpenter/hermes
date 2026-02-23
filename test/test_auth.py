import pytest
import requests

BASE_URL = "http://localhost:8080/api"

# ---------------------------------------------------------
# REGISTRATION TESTS
# ---------------------------------------------------------

def test_register_success(user_factory):
    """Ensure a brand new user can register successfully and gets an ID."""
    payload, response = user_factory()
    
    assert response.status_code == 201
    data = response.json()
    assert data["message"] == "User registered successfully"
    assert "id" in data

def test_register_normalization(user_factory):
    """Ensure spaces are trimmed and caps are lowered per the Go controller logic."""
    payload, response = user_factory({
        "username": "   WeIrDCaSe_User  ",
        "email": "MIXED_email@Hermes.Local",
        "password": "password123",
        "display_name": "Normalization Test"
    })
    
    assert response.status_code == 201

    # Attempt to login with the strictly lowercase/trimmed USERNAME
    username_login_payload = {
        "identity": "weirdcase_user",
        "password": "password123"
    }
    username_login_res = requests.post(f"{BASE_URL}/auth/login", json=username_login_payload)
    
    assert username_login_res.status_code == 200, "Normalization failed to trim/lowercase username"

    # Attempt to login with the strictly lowercase/trimmed EMAIL
    email_login_payload = {
        "identity": "mixed_email@hermes.local",
        "password": "password123"
    }
    email_login_res = requests.post(f"{BASE_URL}/auth/login", json=email_login_payload)
    
    assert email_login_res.status_code == 200, "Normalization failed to trim/lowercase email"

def test_register_duplicate_email(user_factory):
    """Ensure registering with an existing email fails with 409."""
    # Create a valid baseline user
    existing_payload, _ = user_factory()
    
    # Try to register a NEW user with the SAME email
    new_payload = {
        "username": "a_completely_different_username",
        "email": existing_payload["email"],
        "password": "password123",
        "display_name": "Duplicate Emailer"
    }
    response = requests.post(f"{BASE_URL}/auth/register", json=new_payload)
    
    assert response.status_code == 409
    assert "Email is already in use" in response.json()["error"]

def test_register_duplicate_username(user_factory):
    """Ensure registering with an existing username fails with 409."""
    # Create a valid baseline user
    existing_payload, _ = user_factory()
    
    # Try to register a NEW user with the SAME username
    new_payload = {
        "username": existing_payload["username"],
        "email": "a_completely_different_email@hermes.local",
        "password": "password123",
        "display_name": "Duplicate Usernamer"
    }
    response = requests.post(f"{BASE_URL}/auth/register", json=new_payload)
    
    assert response.status_code == 409
    assert "Username is already taken" in response.json()["error"]

def test_register_validation_errors():
    """Ensure the Gin binding rules reject bad payloads (400 Bad Request)."""
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "username": "gooduser", "email": "a@b.com", "password": "short", "display_name": "Bob"
    })
    assert res.status_code == 400

    res = requests.post(f"{BASE_URL}/auth/register", json={
        "username": "ab", "email": "a@b.com", "password": "password123", "display_name": "Bob"
    })
    assert res.status_code == 400

# ---------------------------------------------------------
# LOGIN TESTS
# ---------------------------------------------------------

def test_login_via_username(user_factory):
    """Ensure users can log in using their username."""
    payload, _ = user_factory()
    
    session = requests.Session()
    login_res = session.post(f"{BASE_URL}/auth/login", json={
        "identity": payload["username"],
        "password": payload["password"]
    })
    
    assert login_res.status_code == 200
    assert "hermes_session" in session.cookies

def test_login_via_email(user_factory):
    """Ensure users can log in using their email."""
    payload, _ = user_factory()
    
    session = requests.Session()
    login_res = session.post(f"{BASE_URL}/auth/login", json={
        "identity": payload["email"],
        "password": payload["password"]
    })
    
    assert login_res.status_code == 200

def test_login_invalid_password(user_factory):
    """Ensure login fails with 401 Unauthorized for bad passwords."""
    payload, _ = user_factory()
    
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "identity": payload["username"],
        "password": "wrongpassword"
    })
    
    assert response.status_code == 401

def test_login_nonexistent_user():
    """Ensure login fails gracefully with 401 if user doesn't exist."""
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "identity": "ghost_user_does_not_exist",
        "password": "password"
    })
    assert response.status_code == 401

def test_login_missing_fields():
    """Ensure missing fields trigger a 400 Bad Request."""
    # Test missing password
    res_no_password = requests.post(f"{BASE_URL}/auth/login", json={"identity": "some_user"})
    assert res_no_password.status_code == 400

    # Test missing identity
    res_no_identity = requests.post(f"{BASE_URL}/auth/login", json={"password": "password123"})
    assert res_no_identity.status_code == 400

    # Test missing both fields entirely
    res_empty_payload = requests.post(f"{BASE_URL}/auth/login", json={})
    assert res_empty_payload.status_code == 400

# ---------------------------------------------------------
# LOGOUT & ACCESS TESTS
# ---------------------------------------------------------

def test_logout_success(user_factory):
    """Ensure logging out destroys the session cookie."""
    payload, _ = user_factory()
    
    # Log in to establish a session
    session = requests.Session()
    session.post(f"{BASE_URL}/auth/login", json={
        "identity": payload["username"],
        "password": payload["password"]
    })
    
    # Log out
    logout_res = session.post(f"{BASE_URL}/auth/logout")
    assert logout_res.status_code == 200
    
    # Verify the session is dead
    profile_res = session.get(f"{BASE_URL}/users/@me")
    assert profile_res.status_code == 401

def test_current_user_profile(user_factory):
    """Ensure authenticated sessions can access protected routes."""
    payload, _ = user_factory()
    
    # Log in
    session = requests.Session()
    session.post(f"{BASE_URL}/auth/login", json={
        "identity": payload["username"],
        "password": payload["password"]
    })
    
    # Access protected route
    response = session.get(f"{BASE_URL}/users/@me")
    
    assert response.status_code == 200
    assert response.json()["username"] == payload["username"]

def test_unauthorized_access():
    """Ensure protected routes return 401 when no cookie is provided."""
    response = requests.get(f"{BASE_URL}/users/@me")
    assert response.status_code == 401
