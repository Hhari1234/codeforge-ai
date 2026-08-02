from sqlalchemy.orm import Session

from app.models.repository_chat_message import RepositoryChatMessage


def save_chat_message(
    db: Session,
    user_id: int,
    analysis_id: int,
    role: str,
    content: str,
    cited_files: list[str] | None = None,
) -> RepositoryChatMessage:
    record = RepositoryChatMessage(
        user_id=user_id,
        analysis_id=analysis_id,
        role=role,
        content=content,
        cited_files=cited_files or [],
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_chat_messages_for_user_and_analysis(
    db: Session,
    user_id: int,
    analysis_id: int,
) -> list[RepositoryChatMessage]:
    return (
        db.query(RepositoryChatMessage)
        .filter(
            RepositoryChatMessage.user_id == user_id,
            RepositoryChatMessage.analysis_id == analysis_id,
        )
        .order_by(RepositoryChatMessage.created_at.asc())
        .all()
    )
