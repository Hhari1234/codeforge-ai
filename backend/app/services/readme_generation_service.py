from sqlalchemy.orm import Session

from app.models.readme_generation import ReadmeGeneration
from app.schemas.readme_generation import ReadmeGenerationResult


def save_readme_generation(
    db: Session, user_id: int, input_summary: str, result: ReadmeGenerationResult
) -> ReadmeGeneration:
    record = ReadmeGeneration(
        user_id=user_id,
        input_summary=input_summary,
        result=result.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_readme_generations_for_user(
    db: Session, user_id: int
) -> list[ReadmeGeneration]:
    return (
        db.query(ReadmeGeneration)
        .filter(ReadmeGeneration.user_id == user_id)
        .order_by(ReadmeGeneration.created_at.desc())
        .all()
    )


def get_readme_generation_by_id(
    db: Session, user_id: int, generation_id: int
) -> ReadmeGeneration | None:
    return (
        db.query(ReadmeGeneration)
        .filter(
            ReadmeGeneration.id == generation_id,
            ReadmeGeneration.user_id == user_id,
        )
        .first()
    )

