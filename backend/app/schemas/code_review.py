from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CodeReviewRequest(BaseModel):
    """Body for the analyze-github endpoint."""
    repo_url: str = Field(min_length=1, description="Public GitHub repository URL")


class ReviewFinding(BaseModel):
    """A single prioritized finding from a code review."""
    file: str
    line: int | None = None
    severity: str  # "Critical" | "High" | "Medium" | "Low"
    category: str  # "security" | "bug" | "performance" | "code_smell" | "maintainability" | "best_practice"
    title: str
    description: str
    code_snippet: str | None = None
    recommendation: str


class CodeReviewResult(BaseModel):
    """Exact shape we force the LLM to return for a repository code review."""
    overall_quality_score: int  # 0-100
    summary: str
    strengths: list[str]
    findings: list[ReviewFinding]
    recommendations: list[str]


class CodeReviewOut(BaseModel):
    id: int
    repo_source: str
    result: CodeReviewResult
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CodeReviewListItem(BaseModel):
    """Lightweight version for list views — no full result payload."""
    id: int
    repo_source: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
