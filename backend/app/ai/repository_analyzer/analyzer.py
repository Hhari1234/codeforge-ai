import json

import httpx

from app.ai.client import openrouter_client
from app.ai.prompts.repository_analyzer_prompt import (
    REPOSITORY_ANALYZER_SYSTEM_PROMPT,
    build_repository_analyzer_user_prompt,
)
from app.parsers.repo_ingest import RepoIngestResult
from app.schemas.repository_analysis import RepositoryAnalysisResult


class RepositoryAnalyzerError(Exception):
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


async def analyze_repository(ingest_result: RepoIngestResult) -> RepositoryAnalysisResult:
    """Analyze an already-ingested repository via the LLM.

    The ingest layer has already bounded the file tree and key-file contents,
    so the prompt stays within a predictable token budget.
    """
    try:
        raw_reply = await openrouter_client.chat(
            messages=[
                {"role": "system", "content": REPOSITORY_ANALYZER_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": build_repository_analyzer_user_prompt(ingest_result),
                },
            ]
        )
    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code
        if status_code == 402:
            raise RepositoryAnalyzerError(
                "LLM provider returned 402 Payment Required — the OpenRouter API "
                "key has no credits remaining. Top it up and try again."
            ) from exc
        if status_code == 429:
            raise RepositoryAnalyzerError(
                "LLM provider rate limit hit (429). Wait a moment and try again."
            ) from exc
        raise RepositoryAnalyzerError(
            f"LLM provider returned HTTP {status_code}: {exc.response.text[:200]}"
        ) from exc

    cleaned = _strip_markdown_fences(raw_reply)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        cleaned = _escape_json_control_chars(cleaned)
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise RepositoryAnalyzerError(
                f"LLM did not return valid JSON: {exc}"
            ) from exc

    try:
        return RepositoryAnalysisResult(**parsed)
    except Exception as exc:
        raise RepositoryAnalyzerError(
            f"LLM JSON did not match expected schema: {exc}"
        ) from exc

