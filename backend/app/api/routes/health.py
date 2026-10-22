from fastapi import APIRouter, Response

router = APIRouter()


@router.get("/health")
def health_check():
    return {"status": "ok", "service": "CodeForge AI Backend"}


def _check_database() -> dict:
    """Return {"status": "ok" | "error"} after a trivial query."""
    from sqlalchemy import text

    from app.database.session import SessionLocal

    session = SessionLocal()
    try:
        session.execute(text("SELECT 1"))
        return {"status": "ok"}
    finally:
        session.close()


@router.get("/ready")
def ready_check(response: Response):
    """Readiness probe: 200 only when the database answers a query."""
    try:
        database = _check_database()
    except Exception as exc:  # noqa: BLE001 — probe must never 500
        database = {"status": "error", "detail": type(exc).__name__}
    if database["status"] != "ok":
        response.status_code = 503
    return {
        "status": "ok" if database["status"] == "ok" else "degraded",
        "database": database,
    }