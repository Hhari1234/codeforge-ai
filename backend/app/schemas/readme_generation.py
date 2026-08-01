from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FileContext(BaseModel):
    """A single file's path plus a preview of its contents, used as LLM context."""
    path: str
    content_preview: str


class ReadmeGenerationRequest(BaseModel):
    """User may supply either a free-text description or a file listing (or both)."""
    description: str | None = None
    files: list[FileContext] = []


class ReadmeGenerationResult(BaseModel):
    """Exact shape we force the LLM to return."""
    title: str
    description: str
    installation: str
    usage: str
    folder_structure_explanation: str
    tech_stack: list[str]
    features: list[str]
    full_markdown: str


class ReadmeGenerationOut(BaseModel):
    id: int
    input_summary: str
    result: ReadmeGenerationResult
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReadmeGenerationListItem(BaseModel):
    """Lightweight version for list views — no full result payload."""
    id: int
    input_summary: str
    title: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

