from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProjectGenerationRequest(BaseModel):
    idea: str


class ProjectGenerationResult(BaseModel):
    """Exact shape we force the LLM to return."""
    project_name: str
    requirements: list[str]
    features: list[str]
    folder_structure: list[str]
    database_schema: list[str]
    rest_apis: list[str]
    authentication: str
    tech_stack: list[str]
    readme: str


class ProjectGenerationOut(BaseModel):
    id: int
    idea: str
    result: ProjectGenerationResult
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectGenerationListItem(BaseModel):
    """Lightweight version for list views — no full README/result payload."""
    id: int
    idea: str
    project_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
