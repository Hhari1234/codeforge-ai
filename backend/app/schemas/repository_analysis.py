from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RepositoryAnalysisRequest(BaseModel):
    """Body for the analyze-github endpoint."""
    repo_url: str = Field(min_length=1, description="Public GitHub repository URL")


class RepositoryAnalysisResult(BaseModel):
    """Exact shape we force the LLM to return for a repository analysis."""
    folder_structure: str
    architecture_summary: str
    dependencies: list[str]
    database_findings: str
    auth_findings: str
    api_flow: str
    weaknesses: list[str]
    suggestions: list[str]


class RepositoryAnalysisOut(BaseModel):
    id: int
    repo_source: str
    result: RepositoryAnalysisResult
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RepositoryAnalysisListItem(BaseModel):
    """Lightweight version for list views — no full result payload."""
    id: int
    repo_source: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

