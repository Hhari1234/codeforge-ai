from sqlalchemy.orm import Session

from app.models.project_generation import ProjectGeneration
from app.schemas.project_generation import ProjectGenerationResult


def save_generation(
    db: Session, user_id: int, idea: str, result: ProjectGenerationResult
) -> ProjectGeneration:
    record = ProjectGeneration(
        user_id=user_id,
        idea=idea,
        result=result.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_generations_for_user(db: Session, user_id: int) -> list[ProjectGeneration]:
    return (
        db.query(ProjectGeneration)
        .filter(ProjectGeneration.user_id == user_id)
        .order_by(ProjectGeneration.created_at.desc())
        .all()
    )


def get_generation_by_id(
    db: Session, user_id: int, generation_id: int
) -> ProjectGeneration | None:
    return (
        db.query(ProjectGeneration)
        .filter(
            ProjectGeneration.id == generation_id,
            ProjectGeneration.user_id == user_id,
        )
        .first()
    )
