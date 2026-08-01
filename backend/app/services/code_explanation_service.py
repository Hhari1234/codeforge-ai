from sqlalchemy.orm import Session

from app.models.code_explanation import CodeExplanation
from app.schemas.code_explanation import CodeExplanationResult


def save_code_explanation(
    db: Session,
    user_id: int,
    filename: str,
    language: str,
    result: CodeExplanationResult,
) -> CodeExplanation:
    record = CodeExplanation(
        user_id=user_id,
        filename=filename,
        language=language,
        result=result.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_code_explanations_for_user(
    db: Session, user_id: int
) -> list[CodeExplanation]:
    return (
        db.query(CodeExplanation)
        .filter(CodeExplanation.user_id == user_id)
        .order_by(CodeExplanation.created_at.desc())
        .all()
    )


def get_code_explanation_by_id(
    db: Session, user_id: int, explanation_id: int
) -> CodeExplanation | None:
    return (
        db.query(CodeExplanation)
        .filter(
            CodeExplanation.id == explanation_id,
            CodeExplanation.user_id == user_id,
        )
        .first()
    )

