"""Project Generator LLM engine.

Uses the shared ``chat_json`` pipeline (provider retries, defensive JSON
parsing, one corrective retry, mapped errors) instead of local parsing logic.
"""

from app.ai.llm_utils import chat_json
from app.ai.prompts.project_generator_prompt import (
    PROJECT_GENERATOR_SYSTEM_PROMPT,
    build_project_generator_user_prompt,
)
from app.schemas.project_generation import ProjectGenerationResult


class ProjectGenerationError(Exception):
    """Raised when the LLM output can't be parsed into a valid result."""


async def generate_project_spec(idea: str) -> ProjectGenerationResult:
    """Turn a project idea into a validated, structured project specification."""
    return await chat_json(
        messages=[
            {"role": "system", "content": PROJECT_GENERATOR_SYSTEM_PROMPT},
            {"role": "user", "content": build_project_generator_user_prompt(idea)},
        ],
        schema=ProjectGenerationResult,
        error_cls=ProjectGenerationError,
    )
