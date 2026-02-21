import pytest
import requests

BASE_URL = "http://localhost:8080/api"

@pytest.fixture(scope="session")
def api_client():
    """This runs ONCE per test suite. It logs in and stores the cookie."""
    session = requests.Session()
    
    # Register/Login a test user
    session.post(f"{BASE_URL}/auth/register", json={
        "username": "pytest_user",
        "email": "pytest@hermes.local",
        "password": "password",
        "display_name": "Pytest"
    })
    session.post(f"{BASE_URL}/auth/login", json={
        "identity": "pytest_user",
        "password": "password"
    })
    
    yield session  # Pass the authenticated session to the test files!
    
    # Cleanup after all tests are done
    session.delete(f"{BASE_URL}/users/@me")
