from sqlalchemy.orm import Session

from app.models.code_review import CodeReview
from app.schemas.code_review import CodeReviewResult


def save_code_review(
    db: Session,
    user_id: int,
    repo_source: str,
    result: CodeReviewResult,
) -> CodeReview:
    record = CodeReview(
        user_id=user_id,
        repo_source=repo_source,
        result=result.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_code_reviews_for_user(db: Session, user_id: int) -> list[CodeReview]:
    return (
        db.query(CodeReview)
        .filter(CodeReview.user_id == user_id)
        .order_by(CodeReview.created_at.desc())
        .all()
    )


def get_code_review_by_id(
    db: Session, user_id: int, review_id: int
) -> CodeReview | None:
    return (
        db.query(CodeReview)
        .filter(
            CodeReview.id == review_id,
            CodeReview.user_id == user_id,
        )
        .first()
    )
