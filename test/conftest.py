import pytest
import requests
import uuid

BASE_URL = "http://localhost:8080/api"

@pytest.fixture
def user_factory():
    """
    Creates a user dynamically for a test, tracks their credentials, 
    and securely deletes them from the database after the test finishes.
    """
    tracked_payloads = []

    def _create_user(custom_payload=None):
        # Generate unique data if no custom payload is provided
        unique_id = str(uuid.uuid4())[:8]
        payload = custom_payload or {
            "username": f"user_{unique_id}",
            "email": f"{unique_id}@hermes.local",
            "password": "password123",
            "display_name": "Factory User"
        }
        
        # Register the user
        response = requests.post(f"{BASE_URL}/auth/register", json=payload)
        
        # Track successful creations for teardown
        if response.status_code == 201:
            tracked_payloads.append(payload)
            
        # Return both the payload and response so the test can use/assert on them
        return payload, response

    # Provide the function to the test
    yield _create_user

    # --- TEARDOWN PHASE ---
    for user_data in tracked_payloads:
        session = requests.Session()
        # Log in to get the session cookie
        login_res = session.post(f"{BASE_URL}/auth/login", json={
            "identity": user_data["email"], 
            "password": user_data["password"]
        })
        if login_res.status_code == 200:
            # Delete the user to keep the DB clean
            session.delete(f"{BASE_URL}/users/@me")
