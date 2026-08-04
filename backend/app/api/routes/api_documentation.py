import logging
import os
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.ai.api_documentation.generator import (
    ApiDocumentationError,
    generate_documentation,
    generate_documentation_from_openapi,
    generate_documentation_from_source,
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
from app.schemas.api_documentation import (
    ApiDocumentationListItem,
    ApiDocumentationOut,
    ApiDocumentationResult,
    DocumentationRequest,
    DocumentationSourceRequest,
)
from app.services.api_documentation_service import (
    delete_api_documentation,
    get_api_documentation_by_id,
    list_api_documentations_for_user,
    save_api_documentation,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Zips are staged under backend/uploads/{user_id}/{uuid}/ then deleted after
# analysis — we never retain uploaded source code.
UPLOADS_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "uploads"

# Single-file / OpenAPI spec cap.
MAX_SOURCE_CODE_BYTES = 200 * 1024  # 200 KB (specs can be larger than code)


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


@router.post(
    "/analyze-zip",
    response_model=ApiDocumentationOut,
    status_code=status.HTTP_201_CREATED,
)
async def generate_docs_zip_endpoint(
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
        result = await generate_documentation(ingest_result)
    except ApiDocumentationError as exc:
        logger.exception("API docs (ZIP) failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record = save_api_documentation(
        db, current_user.id, repo_source=filename, result=result
    )

    return ApiDocumentationOut(
        id=record.id,
        repo_source=record.repo_source,
        result=result,
        created_at=record.created_at,
    )


@router.post(
    "/analyze-github",
    response_model=ApiDocumentationOut,
    status_code=status.HTTP_201_CREATED,
)
async def generate_docs_github_endpoint(
    payload: DocumentationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = payload.repo_url.strip()

    try:
        with clone_github_repo(url) as cloned:
            ingest_result = ingest_repository(cloned.path)
            result = await generate_documentation(ingest_result)
    except (GithubCloneInvalidUrl, GithubCloneFailed, RepoIngestError) as exc:
        raise _handle_ingest_errors(exc) from exc
    except ApiDocumentationError as exc:
        logger.exception("API docs (GitHub) failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record = save_api_documentation(
        db, current_user.id, repo_source=url, result=result
    )

    return ApiDocumentationOut(
        id=record.id,
        repo_source=record.repo_source,
        result=result,
        created_at=record.created_at,
    )


@router.post(
    "/analyze-file",
    response_model=ApiDocumentationOut,
    status_code=status.HTTP_201_CREATED,
)
async def generate_docs_source_file_endpoint(
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
                "Source code exceeds the 200KB size limit. "
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
        result = await generate_documentation_from_source(
            filename, language, source_code
        )
    except ApiDocumentationError as exc:
        logger.exception("API docs (file) failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record = save_api_documentation(
        db, current_user.id, repo_source=filename, result=result
    )

    return ApiDocumentationOut(
        id=record.id,
        repo_source=record.repo_source,
        result=result,
        created_at=record.created_at,
    )


@router.post(
    "/analyze-source",
    response_model=ApiDocumentationOut,
    status_code=status.HTTP_201_CREATED,
)
async def generate_docs_source_code_endpoint(
    payload: DocumentationSourceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filename = payload.filename.strip() or "main.py"
    language = payload.language.strip() or "unknown"
    framework = payload.framework.strip()
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
                "Source code exceeds the 200KB size limit "
                f"({_byte_size(source_code):,} bytes provided)."
            ),
        )

    try:
        result = await generate_documentation_from_source(
            filename, language, source_code, framework
        )
    except ApiDocumentationError as exc:
        logger.exception("API docs (source) failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record = save_api_documentation(
        db, current_user.id, repo_source=filename, result=result
    )

    return ApiDocumentationOut(
        id=record.id,
        repo_source=record.repo_source,
        result=result,
        created_at=record.created_at,
    )


@router.post(
    "/analyze-openapi",
    response_model=ApiDocumentationOut,
    status_code=status.HTTP_201_CREATED,
)
async def generate_docs_openapi_endpoint(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filename = file.filename or "openapi.json"
    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Uploaded OpenAPI file is empty.",
        )
    if len(contents) > MAX_SOURCE_CODE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="OpenAPI spec exceeds the 200KB size limit.",
        )
    try:
        spec_text = contents.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Uploaded OpenAPI file is not valid UTF-8 text.",
        )

    # Validate that it parses as JSON or YAML-ish before sending to the LLM.
    if not spec_text.strip():
        raise HTTPException(status_code=400, detail="OpenAPI spec is empty.")

    try:
        result = await generate_documentation_from_openapi(spec_text)
    except ApiDocumentationError as exc:
        logger.exception("API docs (OpenAPI) failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record = save_api_documentation(
        db, current_user.id, repo_source=filename, result=result
    )

    return ApiDocumentationOut(
        id=record.id,
        repo_source=record.repo_source,
        result=result,
        created_at=record.created_at,
    )


@router.get("", response_model=list[ApiDocumentationListItem])
def list_my_api_documentations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = list_api_documentations_for_user(db, current_user.id)
    return [
        ApiDocumentationListItem(
            id=r.id,
            repo_source=r.repo_source,
            created_at=r.created_at,
        )
        for r in records
    ]


@router.get("/{doc_id}", response_model=ApiDocumentationOut)
def get_api_documentation(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = get_api_documentation_by_id(db, current_user.id, doc_id)
    if not record:
        raise HTTPException(status_code=404, detail="API documentation not found")

    return ApiDocumentationOut(
        id=record.id,
        repo_source=record.repo_source,
        result=record.result,
        created_at=record.created_at,
    )


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_api_documentation_endpoint(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted = delete_api_documentation(db, current_user.id, doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="API documentation not found")
