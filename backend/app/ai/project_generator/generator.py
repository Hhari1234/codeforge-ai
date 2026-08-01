import json

from app.ai.client import openrouter_client
from app.ai.prompts.project_generator_prompt import (
    PROJECT_GENERATOR_SYSTEM_PROMPT,
    build_project_generator_user_prompt,
)
from app.schemas.project_generation import ProjectGenerationResult


class ProjectGenerationError(Exception):
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


async def generate_project_spec(idea: str) -> ProjectGenerationResult:
    raw_reply = await openrouter_client.chat(
        messages=[
            {"role": "system", "content": PROJECT_GENERATOR_SYSTEM_PROMPT},
            {"role": "user", "content": build_project_generator_user_prompt(idea)},
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
            raise ProjectGenerationError(
                f"LLM did not return valid JSON: {exc}"
            ) from exc

    try:
        return ProjectGenerationResult(**parsed)
    except Exception as exc:
        raise ProjectGenerationError(
            f"LLM JSON did not match expected schema: {exc}"
        ) from exc
