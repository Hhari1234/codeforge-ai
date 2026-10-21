"""Code Reviewer LLM engine.

Uses the shared ``chat_json`` pipeline (provider retries, defensive JSON
parsing, one corrective retry, mapped errors) instead of local parsing logic.
"""

from app.ai.llm_utils import chat_json
from app.ai.prompts.code_review_prompt import (
    CODE_REVIEW_SYSTEM_PROMPT,
    build_code_review_user_prompt,
)
from app.parsers.repo_ingest import RepoIngestResult
from app.schemas.code_review import CodeReviewResult


class CodeReviewerError(Exception):
    """Raised when the LLM output can't be parsed into a valid result."""


async def review_repository(ingest_result: RepoIngestResult) -> CodeReviewResult:
    """Review an already-ingested repository via the LLM.

    The ingest layer has already bounded the file tree and key-file contents,
    so the prompt stays within a predictable token budget.
    """
    return await chat_json(
        messages=[
            {"role": "system", "content": CODE_REVIEW_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_code_review_user_prompt(ingest_result),
            },
        ],
        schema=CodeReviewResult,
        error_cls=CodeReviewerError,
    )
