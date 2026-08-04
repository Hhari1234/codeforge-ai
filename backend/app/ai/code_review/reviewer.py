import httpx

from app.ai.client import openrouter_client
from app.ai.llm_utils import parse_llm_json
from app.ai.prompts.code_review_prompt import (
    CODE_REVIEW_SYSTEM_PROMPT,
    build_code_review_user_prompt,
)
from app.parsers.repo_ingest import RepoIngestResult
from app.schemas.code_review import CodeReviewResult


class CodeReviewerError(Exception):
    """Raised when the LLM output can't be parsed into a valid result."""


def _raise_provider_error(exc: httpx.HTTPStatusError) -> None:
    status_code = exc.response.status_code
    if status_code == 402:
        raise CodeReviewerError(
            "LLM provider returned 402 Payment Required — the OpenRouter API "
            "key has no credits remaining. Top it up and try again."
        ) from exc
    if status_code == 429:
        raise CodeReviewerError(
            "LLM provider rate limit hit (429). Wait a moment and try again."
        ) from exc
    raise CodeReviewerError(
        f"LLM provider returned HTTP {status_code}: {exc.response.text[:200]}"
    ) from exc


async def review_repository(ingest_result: RepoIngestResult) -> CodeReviewResult:
    """Review an already-ingested repository via the LLM.

    The ingest layer has already bounded the file tree and key-file contents,
    so the prompt stays within a predictable token budget.
    """
    try:
        raw_reply = await openrouter_client.chat(
            messages=[
                {"role": "system", "content": CODE_REVIEW_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": build_code_review_user_prompt(ingest_result),
                },
            ]
        )
    except httpx.HTTPStatusError as exc:
        _raise_provider_error(exc)

    try:
        return parse_llm_json(raw_reply, CodeReviewResult)
    except ValueError as exc:
        raise CodeReviewerError(str(exc)) from exc
