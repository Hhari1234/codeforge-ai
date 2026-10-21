"""Repository Analyzer LLM engine.

Uses the shared ``chat_json`` pipeline (provider retries, defensive JSON
parsing, one corrective retry, mapped errors) instead of local parsing logic.
"""

from app.ai.llm_utils import chat_json
from app.ai.prompts.repository_analyzer_prompt import (
    REPOSITORY_ANALYZER_SYSTEM_PROMPT,
    build_repository_analyzer_user_prompt,
)
from app.parsers.repo_ingest import RepoIngestResult
from app.schemas.repository_analysis import RepositoryAnalysisResult


class RepositoryAnalyzerError(Exception):
    """Raised when the LLM output can't be parsed into a valid result."""


async def analyze_repository(ingest_result: RepoIngestResult) -> RepositoryAnalysisResult:
    """Analyze an already-ingested repository via the LLM.

    The ingest layer has already bounded the file tree and key-file contents,
    so the prompt stays within a predictable token budget.
    """
    return await chat_json(
        messages=[
            {"role": "system", "content": REPOSITORY_ANALYZER_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_repository_analyzer_user_prompt(ingest_result),
            },
        ],
        schema=RepositoryAnalysisResult,
        error_cls=RepositoryAnalyzerError,
    )
