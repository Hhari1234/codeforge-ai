"""API Documentation Generator LLM engine (Phase 9).

Mirrors the Code Reviewer engine: calls the shared OpenRouter client, then
parses + validates the reply through the shared ``parse_llm_json`` helper.
"""

import httpx

from app.ai.client import openrouter_client
from app.ai.llm_utils import parse_llm_json
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


def _raise_provider_error(exc: httpx.HTTPStatusError) -> None:
    status_code = exc.response.status_code
    if status_code == 402:
        raise ApiDocumentationError(
            "LLM provider returned 402 Payment Required — the OpenRouter API "
            "key has no credits remaining. Top it up and try again."
        ) from exc
    if status_code == 429:
        raise ApiDocumentationError(
            "LLM provider rate limit hit (429). Wait a moment and try again."
        ) from exc
    raise ApiDocumentationError(
        f"LLM provider returned HTTP {status_code}: {exc.response.text[:200]}"
    ) from exc


async def generate_documentation(
    ingest_result: RepoIngestResult,
) -> ApiDocumentationResult:
    """Generate API docs from an ingested repository."""
    try:
        raw_reply = await openrouter_client.chat(
            messages=[
                {"role": "system", "content": API_DOCUMENTATION_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": build_api_documentation_repo_prompt(ingest_result),
                },
            ]
        )
    except httpx.HTTPStatusError as exc:
        _raise_provider_error(exc)

    try:
        return parse_llm_json(raw_reply, ApiDocumentationResult)
    except ValueError as exc:
        raise ApiDocumentationError(str(exc)) from exc


async def generate_documentation_from_source(
    filename: str,
    language: str,
    source_code: str,
    framework: str = "",
) -> ApiDocumentationResult:
    """Generate API docs from a single source file."""
    try:
        raw_reply = await openrouter_client.chat(
            messages=[
                {"role": "system", "content": API_DOCUMENTATION_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": build_api_documentation_source_prompt(
                        filename, language, source_code, framework
                    ),
                },
            ]
        )
    except httpx.HTTPStatusError as exc:
        _raise_provider_error(exc)

    try:
        return parse_llm_json(raw_reply, ApiDocumentationResult)
    except ValueError as exc:
        raise ApiDocumentationError(str(exc)) from exc


async def generate_documentation_from_openapi(
    spec_text: str,
) -> ApiDocumentationResult:
    """Generate API docs from an existing OpenAPI/Swagger spec."""
    try:
        raw_reply = await openrouter_client.chat(
            messages=[
                {"role": "system", "content": API_DOCUMENTATION_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": build_api_documentation_openapi_prompt(spec_text),
                },
            ]
        )
    except httpx.HTTPStatusError as exc:
        _raise_provider_error(exc)

    try:
        return parse_llm_json(raw_reply, ApiDocumentationResult)
    except ValueError as exc:
        raise ApiDocumentationError(str(exc)) from exc
