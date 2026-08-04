"""Shared helpers for parsing LLM JSON output.

The Code Reviewer, Code Explainer, Bug Debugger, and API Documentation
Generator all force the model to return a single JSON object. This module
centralizes the defensive parsing pipeline (strip markdown fences, rescue
unescaped control characters, then validate against a Pydantic schema) so the
logic is not duplicated across modules.
"""

from __future__ import annotations

import json
from typing import Any, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


def strip_markdown_fences(text: str) -> str:
    """Remove a surrounding ```json ... ``` fence if present."""
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```", 2)
        if len(parts) >= 3:
            text = parts[1]
        else:
            text = text.strip("`")
        text = text.removeprefix("json").strip()
    return text.strip()


def escape_json_control_chars(text: str) -> str:
    """Escape raw control chars inside JSON string literals.

    Some models emit literal newlines/tabs inside string values instead of the
    escaped ``\\n``/``\\t`` forms. This walks the text tracking string context
    and re-escapes any control character that appears inside a string.
    """
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


def parse_llm_json(raw_reply: str, schema: type[T]) -> T:
    """Parse a raw LLM reply into a validated Pydantic model.

    Args:
        raw_reply: the raw text returned by the model.
        schema: the Pydantic model class to validate against.

    Returns:
        An instance of ``schema``.

    Raises:
        ValueError: if the reply cannot be parsed into valid JSON or the JSON
            does not match the expected schema.
    """
    cleaned = strip_markdown_fences(raw_reply)

    try:
        parsed: Any = json.loads(cleaned)
    except json.JSONDecodeError:
        cleaned = escape_json_control_chars(cleaned)
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise ValueError(f"LLM did not return valid JSON: {exc}") from exc

    try:
        return schema(**parsed)
    except Exception as exc:
        raise ValueError(f"LLM JSON did not match expected schema: {exc}") from exc
