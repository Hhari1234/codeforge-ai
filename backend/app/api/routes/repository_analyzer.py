import os
import shutil
import uuid
from pathlib import Path

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.ai.repository_analyzer.analyzer import (
    RepositoryAnalyzerError,
    analyze_repository,
)
from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.parsers.github_clone import (
    GithubCloneFailed,
    GithubCloneInvalidUrl,
    clone_github_repo,
)
from app.parsers.repo_ingest import (
    RepoIngestError,
    RepoIngestInvalidZip,
    RepoIngestTooLarge,
    RepoIngestUnsupportedSource,
    ingest_repository,
)
from app.schemas.repository_analysis import (
    RepositoryAnalysisListItem,
    RepositoryAnalysisOut,
    RepositoryAnalysisRequest,
)
from app.services.repository_analysis_service import (
    get_repository_analysis_by_id,
    list_repository_analyses_for_user,
    save_repository_analysis,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Zips are staged under backend/uploads/{user_id}/{uuid}/ then deleted after
# analysis — we never retain uploaded source code.
UPLOADS_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "uploads"


def _cleanup_staging_dir(staging_dir: Path) -> None:
    """Best-effort removal of a staged ZIP and its empty per-user parent.

    ``staging_dir`` is ``uploads/{user_id}/{uuid}``. We remove the UUID leaf
    unconditionally, then attempt to remove the now-empty ``uploads/{user_id}``
    parent with ``os.rmdir``. ``os.rmdir`` only succeeds on an empty directory,
    so a concurrent request from the same user (which may still hold a UUID
    subdir inside the parent) is never destroyed — the race merely leaves a
    harmless empty parent dir behind. Never raises.
    """
    shutil.rmtree(staging_dir, ignore_errors=True)
    try:
        os.rmdir(staging_dir.parent)
    except OSError:
        pass


@router.post(
    "/analyze-zip",
    response_model=RepositoryAnalysisOut,
    status_code=status.HTTP_201_CREATED,
)
async def analyze_repository_zip_endpoint(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filename = file.filename or "upload.zip"
    if not filename.lower().endswith(".zip"):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file must be a .zip archive.",
        )

    staging_dir = Path(UPLOADS_ROOT) / str(current_user.id) / uuid.uuid4().hex
    staging_dir.mkdir(parents=True, exist_ok=True)
    zip_path = staging_dir / "repo.zip"

    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(
                status_code=400,
                detail="Uploaded ZIP is empty.",
            )
        zip_path.write_bytes(contents)
    except HTTPException:
        _cleanup_staging_dir(staging_dir)
        raise
    except Exception as exc:
        _cleanup_staging_dir(staging_dir)
        raise HTTPException(
            status_code=400,
            detail=f"Could not read uploaded ZIP: {exc}",
        ) from exc

    try:
        ingest_result = ingest_repository(zip_path)
    except RepoIngestTooLarge as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RepoIngestInvalidZip as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RepoIngestUnsupportedSource as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        # Guarantee the staged upload is removed whether ingest succeeded or failed.
        _cleanup_staging_dir(staging_dir)

    try:
        result = await analyze_repository(ingest_result)
    except RepositoryAnalyzerError as exc:
        logger.exception("Repository analysis (ZIP) failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record = save_repository_analysis(
        db, current_user.id, repo_source=filename, result=result
    )

    return RepositoryAnalysisOut(
        id=record.id,
        repo_source=record.repo_source,
        result=result,
        created_at=record.created_at,
    )


@router.post(
    "/analyze-github",
    response_model=RepositoryAnalysisOut,
    status_code=status.HTTP_201_CREATED,
)
async def analyze_repository_github_endpoint(
    payload: RepositoryAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = payload.repo_url.strip()

    try:
        with clone_github_repo(url) as cloned:
            ingest_result = ingest_repository(cloned.path)
            result = await analyze_repository(ingest_result)
    except GithubCloneInvalidUrl as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except GithubCloneFailed as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RepoIngestTooLarge as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RepoIngestInvalidZip as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RepoIngestUnsupportedSource as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RepositoryAnalyzerError as exc:
        logger.exception("Repository analysis (GitHub) failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record = save_repository_analysis(
        db, current_user.id, repo_source=url, result=result
    )

    return RepositoryAnalysisOut(
        id=record.id,
        repo_source=record.repo_source,
        result=result,
        created_at=record.created_at,
    )


@router.get("", response_model=list[RepositoryAnalysisListItem])
def list_my_repository_analyses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = list_repository_analyses_for_user(db, current_user.id)
    return [
        RepositoryAnalysisListItem(
            id=r.id,
            repo_source=r.repo_source,
            created_at=r.created_at,
        )
        for r in records
    ]


@router.get("/{analysis_id}", response_model=RepositoryAnalysisOut)
def get_repository_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = get_repository_analysis_by_id(db, current_user.id, analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Repository analysis not found")

    return RepositoryAnalysisOut(
        id=record.id,
        repo_source=record.repo_source,
        result=record.result,
        created_at=record.created_at,
    )

