from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.ai.project_generator.generator import generate_project_spec, ProjectGenerationError
from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.project_generation import (
    ProjectGenerationListItem,
    ProjectGenerationOut,
    ProjectGenerationRequest,
)
from app.services.project_generation_service import (
    get_generation_by_id,
    list_generations_for_user,
    save_generation,
)

router = APIRouter()


@router.post(
    "/generate",
    response_model=ProjectGenerationOut,
    status_code=status.HTTP_201_CREATED,
)
async def generate_project(
    payload: ProjectGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.idea.strip():
        raise HTTPException(status_code=400, detail="Idea must not be empty")

    try:
        result = await generate_project_spec(payload.idea)
    except ProjectGenerationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record = save_generation(db, current_user.id, payload.idea, result)

    return ProjectGenerationOut(
        id=record.id,
        idea=record.idea,
        result=result,
        created_at=record.created_at,
    )


@router.get("", response_model=list[ProjectGenerationListItem])
def list_my_generations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = list_generations_for_user(db, current_user.id)
    return [
        ProjectGenerationListItem(
            id=r.id,
            idea=r.idea,
            project_name=r.result.get("project_name", "Untitled"),
            created_at=r.created_at,
        )
        for r in records
    ]


@router.get("/{generation_id}", response_model=ProjectGenerationOut)
def get_generation(
    generation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = get_generation_by_id(db, current_user.id, generation_id)
    if not record:
        raise HTTPException(status_code=404, detail="Generation not found")

    return ProjectGenerationOut(
        id=record.id,
        idea=record.idea,
        result=record.result,
        created_at=record.created_at,
    )
