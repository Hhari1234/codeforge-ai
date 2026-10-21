"""API Documentation Generator LLM engine (Phase 9).

Mirrors the Code Reviewer engine: calls the shared ``chat_json`` pipeline
(provider retries, defensive JSON parsing, one corrective retry, mapped errors).
"""

from app.ai.llm_utils import chat_json
from app.ai.prompts.api_documentation_prompt import (
    API_DOCUMENTATION_SYSTEM_PROMPT,
    build_api_documentation_openapi_prompt,
    build_api_documentation_repo_prompt,
    build_api_documentation_source_prompt,
)
from app.parsers.repo_ingest import RepoIngestResult
from app.schemas.api_documentation import ApiDocumentationResult


class ApiDocumentationError(Exception):
    """Raised when the LLM output can't be parsed into a valid result."""


async def generate_documentation(
    ingest_result: RepoIngestResult,
) -> ApiDocumentationResult:
    """Generate API docs from an ingested repository."""
    return await chat_json(
        messages=[
            {"role": "system", "content": API_DOCUMENTATION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_api_documentation_repo_prompt(ingest_result),
            },
        ],
        schema=ApiDocumentationResult,
        error_cls=ApiDocumentationError,
    )


async def generate_documentation_from_source(
    filename: str,
    language: str,
    source_code: str,
    framework: str = "",
) -> ApiDocumentationResult:
    """Generate API docs from a single source file."""
    return await chat_json(
        messages=[
            {"role": "system", "content": API_DOCUMENTATION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_api_documentation_source_prompt(
                    filename, language, source_code, framework
                ),
            },
        ],
        schema=ApiDocumentationResult,
        error_cls=ApiDocumentationError,
    )


async def generate_documentation_from_openapi(
    spec_text: str,
) -> ApiDocumentationResult:
    """Generate API docs from an existing OpenAPI/Swagger spec."""
    return await chat_json(
        messages=[
            {"role": "system", "content": API_DOCUMENTATION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_api_documentation_openapi_prompt(spec_text),
            },
        ],
        schema=ApiDocumentationResult,
        error_cls=ApiDocumentationError,
    )
