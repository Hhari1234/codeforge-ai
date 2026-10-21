"""Shared helpers for parsing LLM JSON output and mapping provider errors.

The Code Reviewer, Code Explainer, Bug Debugger, API Documentation Generator,
Project Generator, Repository Analyzer and README Generator all force the
model to return a single JSON object. This module centralizes the defensive
parsing pipeline (strip markdown fences, rescue unescaped control characters,
extract a JSON object embedded in prose, then validate against a Pydantic
schema) so the logic is not duplicated across modules.

It also provides ``map_openrouter_error`` so every module converts provider
failures into its own exception type with a consistent, actionable message.
"""

from __future__ import annotations

import json
import logging
from typing import Any, TypeVar

from pydantic import BaseModel

from app.ai.client import (  # noqa: F401 — re-exported for callers
    OpenRouterAuthError,
    OpenRouterConfigError,
    OpenRouterEmptyResponseError,
    OpenRouterError,
    OpenRouterPaymentRequired,
    OpenRouterRateLimitError,
    OpenRouterServerError,
    OpenRouterTimeoutError,
    OpenRouterTruncatedError,
    OpenRouterUnavailableError,
)

logger = logging.getLogger(__name__)

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


def extract_json_object(text: str) -> str | None:
    """Extract the first balanced ``{...}`` JSON object embedded in ``text``.

    Models often wrap the required JSON in prose ("Here is the analysis: ...")
    or append commentary after it. This scans for the first top-level object,
    respecting string literals and escape sequences, and returns just that
    object. Returns None when no balanced object is found.
    """
    start = text.find("{")
    while start != -1:
        depth = 0
        in_string = False
        escape = False
        for index in range(start, len(text)):
            char = text[index]
            if escape:
                escape = False
                continue
            if char == "\\":
                escape = True
                continue
            if char == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    return text[start : index + 1]
        start = text.find("{", start + 1)
    return None


def _try_load(text: str) -> Any:
    """Parse JSON trying the text as-is, control-char-escaped, then extracted."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    try:
        return json.loads(escape_json_control_chars(text))
    except json.JSONDecodeError:
        pass
    candidate = extract_json_object(text)
    if candidate is not None:
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            try:
                return json.loads(escape_json_control_chars(candidate))
            except json.JSONDecodeError:
                return None
    return None


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
    if raw_reply is None or not str(raw_reply).strip():
        raise ValueError(
            "The model returned an empty response, so there was nothing to "
            "parse. Try again."
        )

    cleaned = strip_markdown_fences(str(raw_reply))
    parsed: Any = _try_load(cleaned)

    if parsed is None:
        raise ValueError(
            "The model did not return valid JSON. This usually means the "
            "response was cut off or the model refused; try again, or reduce "
            "the input size."
        )

    if not isinstance(parsed, dict):
        raise ValueError(
            f"Expected a JSON object from the model, got {type(parsed).__name__}."
        )

    try:
        return schema(**parsed)
    except Exception as exc:
        raise ValueError(f"LLM JSON did not match expected schema: {exc}") from exc


async def chat_json(
    messages: list[dict],
    schema: type[T],
    error_cls: type[Exception],
    *,
    model: str | None = None,
    max_tokens: int | None = None,
    max_repair_attempts: int = 1,
) -> T:
    """Call the LLM, parse its reply into ``schema`` and map failures.

    Pipeline:
      1. Send the messages through the shared OpenRouter client (which handles
         timeouts and transient retries internally).
      2. Parse defensively (fences, control chars, prose-wrapped JSON).
      3. On a parse/validation failure, send ONE corrective follow-up asking the
         model to return only the JSON object, then re-parse. This recovers the
         common "model added commentary / dropped a field" case without
         unbounded cost.
      4. Map provider errors into the module's own exception type with a
         consistent, actionable message.
    """
    from app.ai.client import openrouter_client  # local import avoids cycles

    try:
        raw_reply = await openrouter_client.chat(
            messages=messages, model=model, max_tokens=max_tokens
        )
    except OpenRouterError as exc:
        raise map_openrouter_error(exc, error_cls) from exc

    try:
        return parse_llm_json(raw_reply, schema)
    except ValueError as exc:
        # NOTE: `except ... as name` unbinds `name` after the block, so copy
        # the error into a function-scoped variable for later reporting.
        first_error = exc
        logger.warning(
            "LLM reply failed %s validation (attempt 1): %s",
            schema.__name__,
            first_error,
        )

    repair_attempts = max(0, max_repair_attempts)
    last_error = first_error
    for _ in range(repair_attempts):
        repair_messages = messages + [
            {"role": "assistant", "content": raw_reply[:12000]},
            {
                "role": "user",
                "content": (
                    "Your previous reply could not be parsed as the required "
                    f"JSON object for {schema.__name__}. Reply again with ONLY "
                    "one valid JSON object matching the exact schema you were "
                    "given — no prose, no markdown fences, no comments, and no "
                    "truncated content."
                ),
            },
        ]
        try:
            raw_reply = await openrouter_client.chat(
                messages=repair_messages, model=model, max_tokens=max_tokens
            )
        except OpenRouterError as exc:
            raise map_openrouter_error(exc, error_cls) from exc
        try:
            return parse_llm_json(raw_reply, schema)
        except ValueError as repair_error:
            logger.warning(
                "LLM reply failed %s validation (repair): %s",
                schema.__name__,
                repair_error,
            )
            last_error = repair_error

    raise error_cls(str(last_error))


def map_openrouter_error(exc: OpenRouterError, error_cls: type[Exception]) -> Exception:
    """Convert an ``OpenRouterError`` into a module-specific exception.

    All eight modules share this mapping so provider failures surface with one
    consistent, actionable message regardless of which module the user is in.
    """
    if isinstance(exc, OpenRouterConfigError):
        return error_cls(str(exc))
    if isinstance(exc, OpenRouterAuthError):
        return error_cls(str(exc))
    if isinstance(exc, OpenRouterPaymentRequired):
        return error_cls(
            "The AI provider has no credits remaining (402 Payment Required). "
            "Top up the OpenRouter account and try again."
        )
    if isinstance(exc, OpenRouterRateLimitError):
        return error_cls(
            "The AI provider rate-limited this request (429). "
            "Wait a few seconds and try again."
        )
    if isinstance(exc, OpenRouterTimeoutError):
        return error_cls(str(exc))
    if isinstance(exc, OpenRouterUnavailableError):
        return error_cls(str(exc))
    if isinstance(exc, OpenRouterEmptyResponseError):
        return error_cls(str(exc))
    if isinstance(exc, OpenRouterTruncatedError):
        return error_cls(str(exc))
    if isinstance(exc, OpenRouterServerError):
        return error_cls(
            "The AI provider had a temporary server error. Try again shortly."
        )
    return error_cls(f"AI provider error: {exc}")
