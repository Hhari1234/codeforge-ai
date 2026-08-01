import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.ai.code_explainer.explainer import CodeExplanationError, explain_code
from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.code_explanation import (
    CodeExplanationListItem,
    CodeExplanationOut,
    CodeExplanationRequest,
)
from app.services.code_explanation_service import (
    get_code_explanation_by_id,
    list_code_explanations_for_user,
    save_code_explanation,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Reject oversized source payloads before they reach the LLM — same spirit as
# the 2MB/10MB limits in the README module. 50KB of source text is generous for
# a single-file explanation and keeps token cost bounded.
MAX_SOURCE_CODE_BYTES = 50 * 1024


def _byte_size(text: str) -> int:
    return len(text.encode("utf-8"))


@router.post(
    "/explain",
    response_model=CodeExplanationOut,
    status_code=status.HTTP_201_CREATED,
)
async def explain_code_endpoint(
    payload: CodeExplanationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    filename = payload.filename.strip() or "unnamed.txt"
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
        result = await explain_code(filename, language, source_code)
    except CodeExplanationError as exc:
        logger.exception("Code explanation failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    record = save_code_explanation(db, current_user.id, filename, language, result)

    return CodeExplanationOut(
        id=record.id,
        filename=record.filename,
        language=record.language,
        result=result,
        created_at=record.created_at,
    )


@router.get("/explain", response_model=list[CodeExplanationListItem])
def list_my_explanations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = list_code_explanations_for_user(db, current_user.id)
    return [
        CodeExplanationListItem(
            id=r.id,
            filename=r.filename,
            language=r.language,
            created_at=r.created_at,
        )
        for r in records
    ]


@router.get("/explain/{explanation_id}", response_model=CodeExplanationOut)
def get_code_explanation(
    explanation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = get_code_explanation_by_id(db, current_user.id, explanation_id)
    if not record:
        raise HTTPException(status_code=404, detail="Explanation not found")

    return CodeExplanationOut(
        id=record.id,
        filename=record.filename,
        language=record.language,
        result=record.result,
        created_at=record.created_at,
    )

