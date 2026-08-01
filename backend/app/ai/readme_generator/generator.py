import json

from app.ai.client import openrouter_client
from app.ai.prompts.readme_generator_prompt import (
    README_GENERATOR_SYSTEM_PROMPT,
    build_readme_generator_user_prompt,
)
from app.schemas.readme_generation import FileContext, ReadmeGenerationResult


class ReadmeGenerationError(Exception):
    """Raised when the LLM output can't be parsed into a valid result."""


def _strip_markdown_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```", 2)
        if len(parts) >= 3:
            text = parts[1]
        else:
            text = text.strip("`")
        text = text.removeprefix("json").strip()
    return text.strip()


def _escape_json_control_chars(text: str) -> str:
    escaped: list[str] = []
    in_string = False
    escape = False

    for char in text:
        if escape:
            escaped.append(char)
            escape = False
            continue

        if char == "\\":
            escaped.append(char)
            escape = True
            continue

        if char == '"':
            escaped.append(char)
            in_string = not in_string
            continue

        if in_string and ord(char) < 0x20:
            if char == "\n":
                escaped.append("\\n")
            elif char == "\r":
                escaped.append("\\r")
            elif char == "\t":
                escaped.append("\\t")
            else:
                escaped.append(f"\\u{ord(char):04x}")
            continue

        escaped.append(char)

    return "".join(escaped)


async def generate_readme(
    description: str | None, files: list[FileContext]
) -> ReadmeGenerationResult:
    raw_reply = await openrouter_client.chat(
        messages=[
            {"role": "system", "content": README_GENERATOR_SYSTEM_PROMPT},
            {"role": "user", "content": build_readme_generator_user_prompt(description, files)},
        ]
    )

    cleaned = _strip_markdown_fences(raw_reply)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        cleaned = _escape_json_control_chars(cleaned)
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise ReadmeGenerationError(
                f"LLM did not return valid JSON: {exc}"
            ) from exc

    try:
        return ReadmeGenerationResult(**parsed)
    except Exception as exc:
        raise ReadmeGenerationError(
            f"LLM JSON did not match expected schema: {exc}"
        ) from exc

