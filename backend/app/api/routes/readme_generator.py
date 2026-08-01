import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.ai.readme_generator.generator import ReadmeGenerationError, generate_readme
from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.readme_generation import (
    ReadmeGenerationListItem,
    ReadmeGenerationOut,
)
from app.services.readme_generation_service import (
    get_readme_generation_by_id,
    list_readme_generations_for_user,
    save_readme_generation,
)
from app.services.readme_upload_processor import (
    ReadmeUploadTooLarge,
    ReadmeUploadInvalid,
    build_file_contexts,
    safe_upload_name,
    summarize_input,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/generate",
    response_model=ReadmeGenerationOut,
    status_code=status.HTTP_201_CREATED,
)
async def generate_readme_endpoint(
    description: str | None = Form(default=None),
    files: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if (description is None or not description.strip()) and not files:
        raise HTTPException(
            status_code=400,
            detail="Provide either a project description or upload project files.",
        )

    try:
        file_contexts = await build_file_contexts(files)
    except ReadmeUploadTooLarge as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ReadmeUploadInvalid as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if (description is None or not description.strip()) and not file_contexts:
        raise HTTPException(
            status_code=400,
            detail="No usable project context was extracted. Provide a description or a valid project archive.",
        )

    input_summary = summarize_input(description, files, file_contexts)

    try:
        result = await generate_readme(description, file_contexts)
    except ReadmeGenerationError as exc:
        logger.exception("README generation failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record = save_readme_generation(db, current_user.id, input_summary, result)

    return ReadmeGenerationOut(
        id=record.id,
        input_summary=record.input_summary,
        result=result,
        created_at=record.created_at,
    )


@router.get("", response_model=list[ReadmeGenerationListItem])
def list_my_readmes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = list_readme_generations_for_user(db, current_user.id)
    return [
        ReadmeGenerationListItem(
            id=r.id,
            input_summary=r.input_summary,
            title=r.result.get("title", "Untitled"),
            created_at=r.created_at,
        )
        for r in records
    ]


@router.get("/{generation_id}", response_model=ReadmeGenerationOut)
def get_readme_generation(
    generation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = get_readme_generation_by_id(db, current_user.id, generation_id)
    if not record:
        raise HTTPException(status_code=404, detail="Generation not found")

    return ReadmeGenerationOut(
        id=record.id,
        input_summary=record.input_summary,
        result=record.result,
        created_at=record.created_at,
    )

