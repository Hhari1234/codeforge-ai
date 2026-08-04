import os
import shutil
import uuid
from pathlib import Path

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.ai.code_review.reviewer import CodeReviewerError, review_repository
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
from app.schemas.code_review import (
    CodeReviewListItem,
    CodeReviewOut,
    CodeReviewRequest,
)
from app.services.code_review_service import (
    get_code_review_by_id,
    list_code_reviews_for_user,
    save_code_review,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Zips are staged under backend/uploads/{user_id}/{uuid}/ then deleted after
# review — we never retain uploaded source code.
UPLOADS_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "uploads"


def _cleanup_staging_dir(staging_dir: Path) -> None:
    """Best-effort removal of a staged ZIP and its empty per-user parent.

    See the matching helper in the Repository Analyzer routes for rationale.
    """
    shutil.rmtree(staging_dir, ignore_errors=True)
    try:
        os.rmdir(staging_dir.parent)
    except OSError:
        pass


@router.post(
    "/analyze-zip",
    response_model=CodeReviewOut,
    status_code=status.HTTP_201_CREATED,
)
async def review_repository_zip_endpoint(
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
        result = await review_repository(ingest_result)
    except CodeReviewerError as exc:
        logger.exception("Code review (ZIP) failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record = save_code_review(
        db, current_user.id, repo_source=filename, result=result
    )

    return CodeReviewOut(
        id=record.id,
        repo_source=record.repo_source,
        result=result,
        created_at=record.created_at,
    )


@router.post(
    "/analyze-github",
    response_model=CodeReviewOut,
    status_code=status.HTTP_201_CREATED,
)
async def review_repository_github_endpoint(
    payload: CodeReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = payload.repo_url.strip()

    try:
        with clone_github_repo(url) as cloned:
            ingest_result = ingest_repository(cloned.path)
            result = await review_repository(ingest_result)
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
    except CodeReviewerError as exc:
        logger.exception("Code review (GitHub) failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record = save_code_review(
        db, current_user.id, repo_source=url, result=result
    )

    return CodeReviewOut(
        id=record.id,
        repo_source=record.repo_source,
        result=result,
        created_at=record.created_at,
    )


@router.get("", response_model=list[CodeReviewListItem])
def list_my_code_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = list_code_reviews_for_user(db, current_user.id)
    return [
        CodeReviewListItem(
            id=r.id,
            repo_source=r.repo_source,
            created_at=r.created_at,
        )
        for r in records
    ]


@router.get("/{review_id}", response_model=CodeReviewOut)
def get_code_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = get_code_review_by_id(db, current_user.id, review_id)
    if not record:
        raise HTTPException(status_code=404, detail="Code review not found")

    return CodeReviewOut(
        id=record.id,
        repo_source=record.repo_source,
        result=record.result,
        created_at=record.created_at,
    )
