"""Health and readiness endpoints: readiness must verify the database."""

from fastapi.testclient import TestClient


def test_health_ok(client: TestClient):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_ready_ok(client: TestClient):
    r = client.get("/api/ready")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "ok"
    assert body["database"]["status"] == "ok"


def test_ready_reports_database_state(client: TestClient):
    r = client.get("/api/ready")
    assert r.status_code in (200, 503)
    body = r.json()
    assert "database" in body
    assert body["database"]["status"] in ("ok", "error")


def test_ready_503_when_db_down(client: TestClient, monkeypatch):
    from app.api.routes import health as health_module

    def boom():
        raise RuntimeError("db gone")

    monkeypatch.setattr(health_module, "_check_database", boom)
    r = client.get("/api/ready")
    assert r.status_code == 503
    assert r.json()["database"]["status"] == "error"
