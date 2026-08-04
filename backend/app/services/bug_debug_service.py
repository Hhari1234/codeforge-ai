from sqlalchemy.orm import Session

from app.models.bug_debug import BugDebug
from app.schemas.bug_debug import BugDebugResult


def save_bug_debug(
    db: Session,
    user_id: int,
    repo_source: str,
    result: BugDebugResult,
) -> BugDebug:
    record = BugDebug(
        user_id=user_id,
        repo_source=repo_source,
        result=result.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_bug_debug_sessions_for_user(
    db: Session, user_id: int
) -> list[BugDebug]:
    return (
        db.query(BugDebug)
        .filter(BugDebug.user_id == user_id)
        .order_by(BugDebug.created_at.desc())
        .all()
    )


def get_bug_debug_by_id(
    db: Session, user_id: int, debug_id: int
) -> BugDebug | None:
    return (
        db.query(BugDebug)
        .filter(
            BugDebug.id == debug_id,
            BugDebug.user_id == user_id,
        )
        .first()
    )


def delete_bug_debug(
    db: Session, user_id: int, debug_id: int
) -> bool:
    record = get_bug_debug_by_id(db, user_id, debug_id)
    if record is None:
        return False
    db.delete(record)
    db.commit()
    return True

