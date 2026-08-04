from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DocumentationRequest(BaseModel):
    """Body for the analyze-github endpoint."""
    repo_url: str = Field(min_length=1, description="Public GitHub repository URL")


class DocumentationSourceRequest(BaseModel):
    """Body for the analyze-source (single file) endpoint."""
    filename: str = Field(default="main.py", description="Name of the source file")
    language: str = Field(default="unknown", description="Language hint for the code")
    source_code: str = Field(min_length=1, description="Source code to analyze")
    framework: str = Field(default="", description="Optional framework hint (e.g. FastAPI)")


class EndpointParameter(BaseModel):
    """A single request/response parameter."""
    name: str
    location: str  # "path" | "query" | "header" | "body" | "cookie"
    type: str | None = None
    required: bool = False
    description: str = ""


class ExampleBlock(BaseModel):
    """A code example (request or response)."""
    language: str = "json"
    content: str = ""


class EndpointError(BaseModel):
    """A documented error response."""
    status_code: int
    description: str = ""


class Endpoint(BaseModel):
    """A single documented API endpoint."""
    method: str  # GET | POST | PUT | PATCH | DELETE | ...
    path: str
    summary: str = ""
    description: str = ""
    tags: list[str] = []
    parameters: list[EndpointParameter] = []
    request_body: str | None = None
    responses: list[ExampleBlock] = []
    errors: list[EndpointError] = []
    example_request: ExampleBlock | None = None
    example_response: ExampleBlock | None = None


class AuthInfo(BaseModel):
    """Authentication requirements for the API."""
    type: str = "none"  # none | bearer | basic | api_key | oauth2
    description: str = ""
    header_name: str | None = None


class ApiDocumentationResult(BaseModel):
    """Exact shape we force the LLM to return for API documentation."""
    framework: str
    base_url: str
    api_overview: str
    authentication: AuthInfo
    endpoints: list[Endpoint]
    status_codes: list[str] = []
    error_responses: list[str] = []
    recommendations: list[str] = []


class ApiDocumentationOut(BaseModel):
    id: int
    repo_source: str
    result: ApiDocumentationResult
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApiDocumentationListItem(BaseModel):
    """Lightweight version for list views — no full result payload."""
    id: int
    repo_source: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
