"""API integration tests for all eight modules.

Provider calls are monkeypatched (deterministic failure-path tests); no real
network access is used.
"""

import io
import zipfile

import pytest
from fastapi.testclient import TestClient

from app.ai.client import OpenRouterRateLimitError, openrouter_client


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

PROJECT_SPEC_JSON = """{
  "project_name": "Demo",
  "requirements": ["req one"],
  "features": ["feat one"],
  "folder_structure": ["src/"],
  "database_schema": ["users table"],
  "rest_apis": ["GET /items"],
  "authentication": "JWT",
  "tech_stack": ["FastAPI"],
  "readme": "# Demo"
}"""

EXPLANATION_JSON = """{
  "summary": "Explains main",
  "functions_explained": [{"name": "main", "explanation": "entry point"}],
  "classes_explained": [],
  "overall_flow": "calls helpers then exits"
}"""

REVIEW_JSON = """{
  "overall_quality_score": 80,
  "summary": "Solid code",
  "strengths": ["typed"],
  "findings": [{"file": "src/a.py", "line": 3, "severity": "Low",
                 "category": "bug", "title": "naming", "description": "x",
                 "code_snippet": null, "recommendation": "rename"}],
  "recommendations": ["add tests"]
}"""

README_JSON = """{
  "title": "Demo",
  "description": "A demo",
  "installation": "npm i",
  "usage": "npm start",
  "folder_structure_explanation": "src holds code",
  "tech_stack": ["React"],
  "features": ["one"],
  "full_markdown": "# Demo\\n\\nA demo."
}"""

DEBUG_JSON = """{
  "health_score": 70,
  "summary": "One bug found",
  "bugs": [{"severity": "High", "category": "Logic", "file": "main.py",
             "line": 4, "title": "off by one", "description": "loop bug",
             "root_cause": "wrong bound", "suggested_fix": "use < len",
             "fixed_code": "for i in range(len(x)):", "best_practice": null}],
  "recommendations": ["add tests"]
}"""

DOCS_JSON = """{
  "framework": "FastAPI",
  "base_url": "/api",
  "api_overview": "Task API",
  "authentication": {"type": "bearer", "description": "JWT", "header_name": "Authorization"},
  "endpoints": [{"method": "GET", "path": "/api/tasks", "summary": "List tasks",
                  "description": "", "tags": ["tasks"],
                  "parameters": [], "request_body": null, "responses": [],
                  "errors": [], "example_request": null,
                  "example_response": {"language": "json", "content": "[]"}}],
  "status_codes": ["200"],
  "error_responses": ["401"],
  "recommendations": []
}"""


def make_reply(payload_json: str):
    async def fake_chat(messages, model=None, **kwargs):
        return payload_json

    return fake_chat


def make_failing_chat():
    async def failing_chat(messages, model=None, **kwargs):
        raise OpenRouterRateLimitError("provider rate limited this request")

    return failing_chat


def build_repo_zip() -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("package.json", '{"name": "demo", "version": "1.0.0"}')
        archive.writestr("src/index.js", "function main() {\n  return 42;\n}\nmain();\n")
        archive.writestr("README.md", "# Demo\n")
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# Health / auth / cross-cutting
# ---------------------------------------------------------------------------


def test_health(client: TestClient):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


PROTECTED_GETS = [
    "/api/generations",
    "/api/readmes",
    "/api/explain",
    "/api/repositories",
    "/api/reviews",
    "/api/debug",
    "/api/documentation",
]


@pytest.mark.parametrize("path", PROTECTED_GETS)
def test_protected_endpoints_require_auth(client: TestClient, path):
    response = client.get(path)
    assert response.status_code == 401


def test_invalid_token_rejected(client: TestClient):
    response = client.get(
        "/api/generations", headers={"Authorization": "Bearer not-a-real-token"}
    )
    assert response.status_code == 401


def test_auth_me_roundtrip(client: TestClient, auth_headers):
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert "@" in response.json()["email"]


# ---------------------------------------------------------------------------
# Module 1 — Project Generator
# ---------------------------------------------------------------------------


def test_project_generator_rejects_empty_idea(client: TestClient, auth_headers):
    response = client.post(
        "/api/generations/generate", json={"idea": "   "}, headers=auth_headers
    )
    assert response.status_code == 400


def test_project_generator_success(client: TestClient, auth_headers, monkeypatch):
    monkeypatch.setattr(openrouter_client, "chat", make_reply(PROJECT_SPEC_JSON))
    response = client.post(
        "/api/generations/generate",
        json={"idea": "A task tracker"},
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["result"]["project_name"] == "Demo"
    assert body["idea"] == "A task tracker"

    # Appears in history and is retrievable.
    listing = client.get("/api/generations", headers=auth_headers)
    assert listing.status_code == 200
    assert any(item["id"] == body["id"] for item in listing.json())

    fetched = client.get(f"/api/generations/{body['id']}", headers=auth_headers)
    assert fetched.status_code == 200
    assert fetched.json()["result"]["project_name"] == "Demo"


def test_project_generator_provider_failure_friendly_502(
    client: TestClient, auth_headers, monkeypatch
):
    monkeypatch.setattr(openrouter_client, "chat", make_failing_chat())
    response = client.post(
        "/api/generations/generate",
        json={"idea": "A task tracker"},
        headers=auth_headers,
    )
    assert response.status_code == 502
    assert "rate-limited" in response.json()["detail"].lower()


def test_project_generator_history_isolation(
    client: TestClient, auth_headers, monkeypatch
):
    monkeypatch.setattr(openrouter_client, "chat", make_reply(PROJECT_SPEC_JSON))
    created = client.post(
        "/api/generations/generate", json={"idea": "mine"}, headers=auth_headers
    ).json()

    # A second user must not see or fetch the first user's generation.
    email_headers = None
    reg = client.post(
        "/api/auth/register", json={"email": "other_isolation@example.com", "password": "Ot hers-12345!"}
    )
    assert reg.status_code in (200, 201)
    login = client.post(
        "/api/auth/login",
        data={"username": "other_isolation@example.com", "password": "Ot hers-12345!"},
    )
    assert login.status_code == 200
    email_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    other_list = client.get("/api/generations", headers=email_headers)
    assert all(item["id"] != created["id"] for item in other_list.json())

    other_get = client.get(f"/api/generations/{created['id']}", headers=email_headers)
    assert other_get.status_code == 404


# ---------------------------------------------------------------------------
# Module 5 — Code Explainer
# ---------------------------------------------------------------------------


def test_explainer_rejects_empty_source(client: TestClient, auth_headers):
    response = client.post(
        "/api/explain",
        json={"filename": "a.py", "language": "Python", "source_code": "  "},
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_explainer_rejects_oversized_source(client: TestClient, auth_headers):
    response = client.post(
        "/api/explain",
        json={
            "filename": "big.py",
            "language": "Python",
            "source_code": "x" * (51 * 1024),
        },
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "50KB" in response.json()["detail"]


def test_explainer_success(client: TestClient, auth_headers, monkeypatch):
    monkeypatch.setattr(openrouter_client, "chat", make_reply(EXPLANATION_JSON))
    response = client.post(
        "/api/explain",
        json={
            "filename": "main.py",
            "language": "Python",
            "source_code": "def main():\n    return 1\n",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    assert response.json()["result"]["functions_explained"][0]["name"] == "main"


def test_explainer_provider_failure_friendly_502(
    client: TestClient, auth_headers, monkeypatch
):
    monkeypatch.setattr(openrouter_client, "chat", make_failing_chat())
    response = client.post(
        "/api/explain",
        json={"filename": "a.py", "language": "Python", "source_code": "print(1)"},
        headers=auth_headers,
    )
    assert response.status_code == 502
    assert "rate-limited" in response.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Module 3 — Code Reviewer (ZIP path exercises ingest + LLM + save)
# ---------------------------------------------------------------------------


def test_review_invalid_zip_rejected(client: TestClient, auth_headers):
    response = client.post(
        "/api/reviews/analyze-zip",
        files={"file": ("not-a-zip.txt", io.BytesIO(b"hello"), "text/plain")},
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_review_invalid_github_url_rejected(client: TestClient, auth_headers):
    response = client.post(
        "/api/reviews/analyze-github",
        json={"repo_url": "https://example.com/not-github/repo"},
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "github" in response.json()["detail"].lower()


def test_review_zip_success(client: TestClient, auth_headers, monkeypatch):
    monkeypatch.setattr(openrouter_client, "chat", make_reply(REVIEW_JSON))
    response = client.post(
        "/api/reviews/analyze-zip",
        files={"file": ("repo.zip", io.BytesIO(build_repo_zip()), "application/zip")},
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    assert response.json()["result"]["overall_quality_score"] == 80


def test_review_provider_failure_friendly_502(
    client: TestClient, auth_headers, monkeypatch
):
    monkeypatch.setattr(openrouter_client, "chat", make_failing_chat())
    response = client.post(
        "/api/reviews/analyze-zip",
        files={"file": ("repo.zip", io.BytesIO(build_repo_zip()), "application/zip")},
        headers=auth_headers,
    )
    assert response.status_code == 502
    assert "rate-limited" in response.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Module 2 — Repository Analyzer (validation paths; LLM path via zip)
# ---------------------------------------------------------------------------


def test_analyzer_invalid_github_url_rejected(client: TestClient, auth_headers):
    response = client.post(
        "/api/repositories/analyze-github",
        json={"repo_url": "ftp://nope.example/repo"},
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_analyzer_empty_url_rejected(client: TestClient, auth_headers):
    response = client.post(
        "/api/repositories/analyze-github", json={"repo_url": ""}, headers=auth_headers
    )
    assert response.status_code == 422  # pydantic min_length=1


ANALYSIS_JSON = """{
  "folder_structure": "src/",
  "architecture_summary": "layered",
  "dependencies": ["react"],
  "database_findings": "none",
  "auth_findings": "jwt",
  "api_flow": "rest",
  "weaknesses": ["no tests"],
  "suggestions": ["add tests"]
}"""


def test_analyzer_zip_success(client: TestClient, auth_headers, monkeypatch):
    monkeypatch.setattr(openrouter_client, "chat", make_reply(ANALYSIS_JSON))
    response = client.post(
        "/api/repositories/analyze-zip",
        files={"file": ("repo.zip", io.BytesIO(build_repo_zip()), "application/zip")},
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    assert response.json()["result"]["architecture_summary"] == "layered"


# ---------------------------------------------------------------------------
# Module 4 — README Generator
# ---------------------------------------------------------------------------


def test_readme_rejects_empty_request(client: TestClient, auth_headers):
    response = client.post("/api/readmes/generate", data={}, headers=auth_headers)
    assert response.status_code == 400


def test_readme_description_success(client: TestClient, auth_headers, monkeypatch):
    monkeypatch.setattr(openrouter_client, "chat", make_reply(README_JSON))
    response = client.post(
        "/api/readmes/generate",
        data={"description": "A todo app"},
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    assert response.json()["result"]["title"] == "Demo"


def test_readme_provider_failure_friendly_502(
    client: TestClient, auth_headers, monkeypatch
):
    monkeypatch.setattr(openrouter_client, "chat", make_failing_chat())
    response = client.post(
        "/api/readmes/generate", data={"description": "A todo app"}, headers=auth_headers
    )
    assert response.status_code == 502
    assert "rate-limited" in response.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Module 6 — Bug Debugger
# ---------------------------------------------------------------------------


def test_debug_rejects_empty_code(client: TestClient, auth_headers):
    response = client.post(
        "/api/debug/analyze-code",
        json={"filename": "a.py", "language": "Python", "source_code": "  "},
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_debug_code_success(client: TestClient, auth_headers, monkeypatch):
    monkeypatch.setattr(openrouter_client, "chat", make_reply(DEBUG_JSON))
    response = client.post(
        "/api/debug/analyze-code",
        json={
            "filename": "main.py",
            "language": "Python",
            "source_code": "for i in range(len(x)):\n    print(x[i])\n",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["result"]["health_score"] == 70
    assert body["result"]["bugs"][0]["title"] == "off by one"


def test_debug_history_delete_roundtrip(client: TestClient, auth_headers, monkeypatch):
    monkeypatch.setattr(openrouter_client, "chat", make_reply(DEBUG_JSON))
    created = client.post(
        "/api/debug/analyze-code",
        json={"filename": "a.py", "language": "Python", "source_code": "print(1)"},
        headers=auth_headers,
    ).json()
    delete = client.delete(f"/api/debug/{created['id']}", headers=auth_headers)
    assert delete.status_code == 204
    assert client.get(f"/api/debug/{created['id']}", headers=auth_headers).status_code == 404


# ---------------------------------------------------------------------------
# Module 7 — API Documentation
# ---------------------------------------------------------------------------


def test_docs_rejects_empty_source(client: TestClient, auth_headers):
    response = client.post(
        "/api/documentation/analyze-source",
        json={"filename": "main.py", "language": "Python", "source_code": " "},
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_docs_source_success(client: TestClient, auth_headers, monkeypatch):
    monkeypatch.setattr(openrouter_client, "chat", make_reply(DOCS_JSON))
    response = client.post(
        "/api/documentation/analyze-source",
        json={
            "filename": "main.py",
            "language": "Python",
            "source_code": "@app.get('/tasks')\ndef list_tasks(): return []",
            "framework": "FastAPI",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    assert response.json()["result"]["endpoints"][0]["path"] == "/api/tasks"


def test_docs_provider_failure_friendly_502(
    client: TestClient, auth_headers, monkeypatch
):
    monkeypatch.setattr(openrouter_client, "chat", make_failing_chat())
    response = client.post(
        "/api/documentation/analyze-source",
        json={"filename": "m.py", "language": "Python", "source_code": "x = 1"},
        headers=auth_headers,
    )
    assert response.status_code == 502
    assert "rate-limited" in response.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Module 8 — Repository Chat
# ---------------------------------------------------------------------------


def test_chat_unknown_analysis_404(client: TestClient, auth_headers):
    response = client.post(
        "/api/repositories/999999/chat",
        json={"message": "hello"},
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_chat_history_unknown_analysis_404(client: TestClient, auth_headers):
    response = client.get(
        "/api/repositories/999999/chat/history", headers=auth_headers
    )
    assert response.status_code == 404


def test_chat_zip_sourced_analysis_returns_422(client: TestClient, auth_headers, monkeypatch):
    """Regression: RepoIngestUnsupportedSource used to be swallowed by the
    RepoIngestError base-class handler, returning a generic 400."""
    monkeypatch.setattr(openrouter_client, "chat", make_reply(ANALYSIS_JSON))
    analysis = client.post(
        "/api/repositories/analyze-zip",
        files={"file": ("repo.zip", io.BytesIO(build_repo_zip()), "application/zip")},
        headers=auth_headers,
    ).json()

    response = client.post(
        f"/api/repositories/{analysis['id']}/chat",
        json={"message": "Where is auth?"},
        headers=auth_headers,
    )
    assert response.status_code == 422, response.text
    assert "ZIP" in response.json()["detail"]


def test_chat_empty_message_rejected_for_missing_source(client: TestClient, auth_headers):
    # 404 (missing analysis) fires before message validation — documented order.
    response = client.post(
        "/api/repositories/1/chat", json={"message": ""}, headers=auth_headers
    )
    assert response.status_code in (400, 404)
