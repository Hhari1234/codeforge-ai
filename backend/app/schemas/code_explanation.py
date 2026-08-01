from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CodeExplanationRequest(BaseModel):
    """User pastes (or uploads) a single source file to be explained."""
    filename: str
    language: str
    source_code: str


class FunctionExplanation(BaseModel):
    name: str
    explanation: str


class ClassExplanation(BaseModel):
    name: str
    explanation: str


class CodeExplanationResult(BaseModel):
    """Exact shape we force the LLM to return."""
    summary: str
    functions_explained: list[FunctionExplanation]
    classes_explained: list[ClassExplanation]
    overall_flow: str


class CodeExplanationOut(BaseModel):
    id: int
    filename: str
    language: str
    result: CodeExplanationResult
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CodeExplanationListItem(BaseModel):
    """Lightweight version for list views — no full result payload."""
    id: int
    filename: str
    language: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

