"""Bug Debugger LLM engine (Phase 8).

Mirrors the Code Reviewer engine: it calls the shared OpenRouter client, then
parses + validates the reply through the shared ``parse_llm_json`` helper.
"""

import httpx

from app.ai.client import openrouter_client
from app.ai.llm_utils import parse_llm_json
from app.ai.prompts.bug_debug_prompt import (
    BUG_DEBUG_SYSTEM_PROMPT,
    build_bug_debug_source_prompt,
    build_bug_debug_user_prompt,
)
from app.parsers.repo_ingest import RepoIngestResult
from app.schemas.bug_debug import BugDebugResult


class BugDebuggerError(Exception):
    """Raised when the LLM output can't be parsed into a valid result."""


def _raise_provider_error(exc: httpx.HTTPStatusError) -> None:
    status_code = exc.response.status_code
    if status_code == 402:
        raise BugDebuggerError(
            "LLM provider returned 402 Payment Required — the OpenRouter API "
            "key has no credits remaining. Top it up and try again."
        ) from exc
    if status_code == 429:
        raise BugDebuggerError(
            "LLM provider rate limit hit (429). Wait a moment and try again."
        ) from exc
    raise BugDebuggerError(
        f"LLM provider returned HTTP {status_code}: {exc.response.text[:200]}"
    ) from exc


async def debug_repository(ingest_result: RepoIngestResult) -> BugDebugResult:
    """Debug an already-ingested repository via the LLM."""
    try:
        raw_reply = await openrouter_client.chat(
            messages=[
                {"role": "system", "content": BUG_DEBUG_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": build_bug_debug_user_prompt(ingest_result),
                },
            ]
        )
    except httpx.HTTPStatusError as exc:
        _raise_provider_error(exc)

    try:
        return parse_llm_json(raw_reply, BugDebugResult)
    except ValueError as exc:
        raise BugDebuggerError(str(exc)) from exc


async def debug_source(
    filename: str, language: str, source_code: str
) -> BugDebugResult:
    """Debug a single source file (paste or upload) via the LLM."""
    try:
        raw_reply = await openrouter_client.chat(
            messages=[
                {"role": "system", "content": BUG_DEBUG_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": build_bug_debug_source_prompt(
                        filename, language, source_code
                    ),
                },
            ]
        )
    except httpx.HTTPStatusError as exc:
        _raise_provider_error(exc)

    try:
        return parse_llm_json(raw_reply, BugDebugResult)
    except ValueError as exc:
        raise BugDebuggerError(str(exc)) from exc
