import logging
import os
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.ai.bug_debug.debugger import (
    BugDebuggerError,
    debug_repository,
    debug_source,
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
from app.schemas.bug_debug import (
    BugDebugCodeRequest,
    BugDebugListItem,
    BugDebugOut,
    BugDebugRequest,
)
from app.services.bug_debug_service import (
    delete_bug_debug,
    get_bug_debug_by_id,
    list_bug_debug_sessions_for_user,
    save_bug_debug,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Zips are staged under backend/uploads/{user_id}/{uuid}/ then deleted after
# analysis — we never retain uploaded source code.
UPLOADS_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "uploads"

# Single-file / paste source cap (mirrors Code Explainer).
MAX_SOURCE_CODE_BYTES = 50 * 1024


def _cleanup_staging_dir(staging_dir: Path) -> None:
    """Best-effort removal of a staged ZIP and its empty per-user parent."""
    shutil.rmtree(staging_dir, ignore_errors=True)
    try:
        os.rmdir(staging_dir.parent)
    except OSError:
        pass


def _byte_size(text: str) -> int:
    return len(text.encode("utf-8"))


def _handle_ingest_errors(exc: Exception) -> HTTPException:
    if isinstance(exc, RepoIngestTooLarge):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, RepoIngestInvalidZip):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, RepoIngestUnsupportedSource):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, GithubCloneInvalidUrl):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, GithubCloneFailed):
        return HTTPException(status_code=400, detail=str(exc))
    return HTTPException(status_code=400, detail=str(exc))


@router.post(
    "/analyze-zip",
    response_model=BugDebugOut,
    status_code=status.HTTP_201_CREATED,
)
async def debug_repository_zip_endpoint(
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
    except RepoIngestError as exc:
        _cleanup_staging_dir(staging_dir)
        raise _handle_ingest_errors(exc) from exc
    finally:
        # Guarantee the staged upload is removed whether ingest succeeded or failed.
        _cleanup_staging_dir(staging_dir)

    try:
        result = await debug_repository(ingest_result)
    except BugDebuggerError as exc:
        logger.exception("Bug debug (ZIP) failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record = save_bug_debug(
        db, current_user.id, repo_source=filename, result=result
    )

    return BugDebugOut(
        id=record.id,
        repo_source=record.repo_source,
        result=result,
        created_at=record.created_at,
    )


@router.post(
    "/analyze-github",
    response_model=BugDebugOut,
    status_code=status.HTTP_201_CREATED,
)
async def debug_repository_github_endpoint(
    payload: BugDebugRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = payload.repo_url.strip()

    try:
        with clone_github_repo(url) as cloned:
            ingest_result = ingest_repository(cloned.path)
            result = await debug_repository(ingest_result)
    except (GithubCloneInvalidUrl, GithubCloneFailed, RepoIngestError) as exc:
        raise _handle_ingest_errors(exc) from exc
    except BugDebuggerError as exc:
        logger.exception("Bug debug (GitHub) failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record = save_bug_debug(
        db, current_user.id, repo_source=url, result=result
    )

    return BugDebugOut(
        id=record.id,
        repo_source=record.repo_source,
        result=result,
        created_at=record.created_at,
    )


@router.post(
    "/analyze-file",
    response_model=BugDebugOut,
    status_code=status.HTTP_201_CREATED,
)
async def debug_source_file_endpoint(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filename = file.filename or "unnamed.txt"
    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )
    if len(contents) > MAX_SOURCE_CODE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Source code exceeds the 50KB size limit. "
                "Please split the file or upload a smaller excerpt."
            ),
        )
    try:
        source_code = contents.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is not valid UTF-8 text.",
        )

    language = _language_from_filename(filename)

    try:
        result = await debug_source(filename, language, source_code)
    except BugDebuggerError as exc:
        logger.exception("Bug debug (file) failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record = save_bug_debug(
        db, current_user.id, repo_source=filename, result=result
    )

    return BugDebugOut(
        id=record.id,
        repo_source=record.repo_source,
        result=result,
        created_at=record.created_at,
    )


@router.post(
    "/analyze-code",
    response_model=BugDebugOut,
    status_code=status.HTTP_201_CREATED,
)
async def debug_source_code_endpoint(
    payload: BugDebugCodeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filename = payload.filename.strip() or "paste.py"
    language = payload.language.strip() or "unknown"
    source_code = payload.source_code

    if not source_code.strip():
        raise HTTPException(
            status_code=400,
            detail="source_code must not be empty.",
        )
    if _byte_size(source_code) > MAX_SOURCE_CODE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Source code exceeds the 50KB size limit "
                f"({_byte_size(source_code):,} bytes provided). "
                "Please split the file or paste a smaller excerpt."
            ),
        )

    try:
        result = await debug_source(filename, language, source_code)
    except BugDebuggerError as exc:
        logger.exception("Bug debug (code paste) failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record = save_bug_debug(
        db, current_user.id, repo_source=filename, result=result
    )

    return BugDebugOut(
        id=record.id,
        repo_source=record.repo_source,
        result=result,
        created_at=record.created_at,
    )


@router.get("", response_model=list[BugDebugListItem])
def list_my_bug_debug_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = list_bug_debug_sessions_for_user(db, current_user.id)
    return [
        BugDebugListItem(
            id=r.id,
            repo_source=r.repo_source,
            created_at=r.created_at,
        )
        for r in records
    ]


@router.get("/{debug_id}", response_model=BugDebugOut)
def get_bug_debug(
    debug_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = get_bug_debug_by_id(db, current_user.id, debug_id)
    if not record:
        raise HTTPException(status_code=404, detail="Bug debug session not found")

    return BugDebugOut(
        id=record.id,
        repo_source=record.repo_source,
        result=record.result,
        created_at=record.created_at,
    )


@router.delete("/{debug_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bug_debug_endpoint(
    debug_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted = delete_bug_debug(db, current_user.id, debug_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Bug debug session not found")


def _language_from_filename(filename: str) -> str:
    """Best-effort language hint derived from the file extension."""
    ext = Path(filename).suffix.lower()
    mapping = {
        ".py": "Python",
        ".pyw": "Python",
        ".js": "JavaScript",
        ".jsx": "JavaScript (React)",
        ".ts": "TypeScript",
        ".tsx": "TypeScript (React)",
        ".java": "Java",
        ".go": "Go",
        ".rs": "Rust",
        ".rb": "Ruby",
        ".php": "PHP",
        ".c": "C",
        ".h": "C",
        ".cpp": "C++",
        ".hpp": "C++",
        ".cs": "C#",
        ".swift": "Swift",
        ".kt": "Kotlin",
        ".html": "HTML",
        ".css": "CSS",
        ".scss": "SCSS",
        ".sql": "SQL",
        ".sh": "Shell",
        ".bash": "Shell",
        ".json": "JSON",
        ".yaml": "YAML",
        ".yml": "YAML",
        ".md": "Markdown",
        ".toml": "TOML",
        ".xml": "XML",
    }
    return mapping.get(ext, "Unknown")
