"""Test bootstrap and shared fixtures.

Environment variables are set BEFORE any ``app.*`` import so Settings picks up
an isolated sqlite database and chroma directory for the test run.
"""

import os
import tempfile
from pathlib import Path

# Isolated test environment (must run before importing app.*).
_TEST_DIR = tempfile.mkdtemp(prefix="codeforge_test_")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_TEST_DIR) / 'test.db'}"
os.environ["CHROMA_DATA_DIR"] = str(Path(_TEST_DIR) / "chroma")
os.environ["AUTO_CREATE_TABLES"] = "true"
# Keep provider calls out of the real network during tests; individual tests
# monkeypatch the client as needed.
os.environ.setdefault("OPENROUTER_API_KEY", "sk-or-v1-test-key")
os.environ.setdefault("OPENROUTER_MODEL", "test-model")
# Speed: no real backoff waits in retry tests.
os.environ.setdefault("OPENROUTER_RETRY_BASE_DELAY_SECONDS", "0")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def auth_headers(client: TestClient) -> dict[str, str]:
    """Register+login a fresh user and return its Authorization headers."""
    import uuid

    email = f"user_{uuid.uuid4().hex[:12]}@example.com"
    password = "S3cure-test-password!"

    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": password},
    )
    assert response.status_code in (200, 201), response.text

    response = client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
