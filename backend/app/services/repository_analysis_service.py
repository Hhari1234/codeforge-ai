from sqlalchemy.orm import Session

from app.models.repository_analysis import RepositoryAnalysis
from app.schemas.repository_analysis import RepositoryAnalysisResult


def save_repository_analysis(
    db: Session,
    user_id: int,
    repo_source: str,
    result: RepositoryAnalysisResult,
) -> RepositoryAnalysis:
    record = RepositoryAnalysis(
        user_id=user_id,
        repo_source=repo_source,
        result=result.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_repository_analyses_for_user(
    db: Session, user_id: int
) -> list[RepositoryAnalysis]:
    return (
        db.query(RepositoryAnalysis)
        .filter(RepositoryAnalysis.user_id == user_id)
        .order_by(RepositoryAnalysis.created_at.desc())
        .all()
    )


def get_repository_analysis_by_id(
    db: Session, user_id: int, analysis_id: int
) -> RepositoryAnalysis | None:
    return (
        db.query(RepositoryAnalysis)
        .filter(
            RepositoryAnalysis.id == analysis_id,
            RepositoryAnalysis.user_id == user_id,
        )
        .first()
    )

