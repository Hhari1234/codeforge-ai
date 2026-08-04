from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BugDebugRequest(BaseModel):
    """Body for the analyze-github endpoint."""
    repo_url: str = Field(min_length=1, description="Public GitHub repository URL")


class BugDebugCodeRequest(BaseModel):
    """Body for the analyze-code (paste) endpoint."""
    filename: str = Field(default="paste.py", description="Name of the source file")
    language: str = Field(default="unknown", description="Language hint for the code")
    source_code: str = Field(min_length=1, description="Source code to analyze for bugs")


class DebugBug(BaseModel):
    """A single identified bug with explanation and a concrete fix."""
    severity: str  # "Critical" | "High" | "Medium" | "Low"
    category: str  # "Logic" | "Security" | "Performance" | "Error_Handling" | "Concurrency" | "Resource" | "Type" | "Syntax" | "Best_Practice" | ...
    file: str
    line: int | None = None
    title: str
    description: str
    root_cause: str
    suggested_fix: str
    fixed_code: str | None = None
    best_practice: str | None = None


class BugDebugResult(BaseModel):
    """Exact shape we force the LLM to return for a debugging session."""
    health_score: int  # 0-100
    summary: str
    bugs: list[DebugBug]
    recommendations: list[str]


class BugDebugOut(BaseModel):
    id: int
    repo_source: str
    result: BugDebugResult
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BugDebugListItem(BaseModel):
    """Lightweight version for list views — no full result payload."""
    id: int
    repo_source: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

