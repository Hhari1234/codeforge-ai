"""README Generator LLM engine.

Uses the shared ``chat_json`` pipeline (provider retries, defensive JSON
parsing, one corrective retry, mapped errors) instead of local parsing logic.
"""

from app.ai.llm_utils import chat_json
from app.ai.prompts.readme_generator_prompt import (
    README_GENERATOR_SYSTEM_PROMPT,
    build_readme_generator_user_prompt,
)
from app.schemas.readme_generation import FileContext, ReadmeGenerationResult


class ReadmeGenerationError(Exception):
    """Raised when the LLM output can't be parsed into a valid result."""


async def generate_readme(
    description: str | None, files: list[FileContext]
) -> ReadmeGenerationResult:
    """Generate a structured README from a description and/or uploaded files."""
    return await chat_json(
        messages=[
            {"role": "system", "content": README_GENERATOR_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_readme_generator_user_prompt(description, files),
            },
        ],
        schema=ReadmeGenerationResult,
        error_cls=ReadmeGenerationError,
    )
