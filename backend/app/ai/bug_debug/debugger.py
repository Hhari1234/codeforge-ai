"""Bug Debugger LLM engine (Phase 8).

Mirrors the Code Reviewer engine: it calls the shared ``chat_json`` pipeline
(provider retries, defensive JSON parsing, one corrective retry, mapped errors).
"""

from app.ai.llm_utils import chat_json
from app.ai.prompts.bug_debug_prompt import (
    BUG_DEBUG_SYSTEM_PROMPT,
    build_bug_debug_source_prompt,
    build_bug_debug_user_prompt,
)
from app.parsers.repo_ingest import RepoIngestResult
from app.schemas.bug_debug import BugDebugResult


class BugDebuggerError(Exception):
    """Raised when the LLM output can't be parsed into a valid result."""


async def debug_repository(ingest_result: RepoIngestResult) -> BugDebugResult:
    """Debug an already-ingested repository via the LLM."""
    return await chat_json(
        messages=[
            {"role": "system", "content": BUG_DEBUG_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_bug_debug_user_prompt(ingest_result),
            },
        ],
        schema=BugDebugResult,
        error_cls=BugDebuggerError,
    )


async def debug_source(
    filename: str, language: str, source_code: str
) -> BugDebugResult:
    """Debug a single source file (paste or upload) via the LLM."""
    return await chat_json(
        messages=[
            {"role": "system", "content": BUG_DEBUG_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_bug_debug_source_prompt(
                    filename, language, source_code
                ),
            },
        ],
        schema=BugDebugResult,
        error_cls=BugDebuggerError,
    )
