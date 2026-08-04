from sqlalchemy.orm import Session

from app.models.api_documentation import ApiDocumentation
from app.schemas.api_documentation import ApiDocumentationResult


def save_api_documentation(
    db: Session,
    user_id: int,
    repo_source: str,
    result: ApiDocumentationResult,
) -> ApiDocumentation:
    record = ApiDocumentation(
        user_id=user_id,
        repo_source=repo_source,
        result=result.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_api_documentations_for_user(
    db: Session, user_id: int
) -> list[ApiDocumentation]:
    return (
        db.query(ApiDocumentation)
        .filter(ApiDocumentation.user_id == user_id)
        .order_by(ApiDocumentation.created_at.desc())
        .all()
    )


def get_api_documentation_by_id(
    db: Session, user_id: int, doc_id: int
) -> ApiDocumentation | None:
    return (
        db.query(ApiDocumentation)
        .filter(
            ApiDocumentation.id == doc_id,
            ApiDocumentation.user_id == user_id,
        )
        .first()
    )


def delete_api_documentation(
    db: Session, user_id: int, doc_id: int
) -> bool:
    record = get_api_documentation_by_id(db, user_id, doc_id)
    if record is None:
        return False
    db.delete(record)
    db.commit()
    return True
