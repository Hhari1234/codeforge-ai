import json
from pathlib import Path

from app.ai.client import openrouter_client
from app.ai.prompts.code_explainer_prompt import (
    CODE_EXPLAINER_SYSTEM_PROMPT,
    build_code_explainer_user_prompt,
)
from app.parsers.ast_parser import format_ast_context, parse_python_source
from app.schemas.code_explanation import CodeExplanationResult

# Extensions whose source should go through Python AST pre-processing.
_PYTHON_EXTENSIONS = {".py", ".pyw"}


class CodeExplanationError(Exception):
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


def _language_from_filename(filename: str) -> str:
    """Best-effort language hint derived from the file extension."""
    ext = Path(filename).suffix.lower()
    mapping = {
        ".py": "Python",
        ".pyw": "Python",
        ".js": "JavaScript",
        ".jsx": "JavaScript (React)",
        ".ts": "TypeScript",
        ".tsx": "TypeScript (React)",
        ".java": "Java",
        ".go": "Go",
        ".rs": "Rust",
        ".rb": "Ruby",
        ".php": "PHP",
        ".c": "C",
        ".h": "C",
        ".cpp": "C++",
        ".hpp": "C++",
        ".cs": "C#",
        ".swift": "Swift",
        ".kt": "Kotlin",
        ".html": "HTML",
        ".css": "CSS",
        ".scss": "SCSS",
        ".sql": "SQL",
        ".sh": "Shell",
        ".bash": "Shell",
        ".json": "JSON",
        ".yaml": "YAML",
        ".yml": "YAML",
        ".md": "Markdown",
        ".toml": "TOML",
        ".xml": "XML",
    }
    return mapping.get(ext, "Unknown")


def _ast_context_for(filename: str, source_code: str) -> str | None:
    """Return a formatted AST structural summary for Python files, else None."""
    ext = Path(filename).suffix.lower()
    if ext not in _PYTHON_EXTENSIONS:
        return None
    module = parse_python_source(source_code)
    return format_ast_context(module)


async def explain_code(filename: str, language: str, source_code: str) -> CodeExplanationResult:
    """Explain a single source file.

    Python files get AST structural context alongside the raw source; non-Python
    files are sent as raw source with the provided language hint.
    """
    ast_context = _ast_context_for(filename, source_code)

    raw_reply = await openrouter_client.chat(
        messages=[
            {"role": "system", "content": CODE_EXPLAINER_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_code_explainer_user_prompt(
                    filename,
                    language or _language_from_filename(filename),
                    source_code,
                    ast_context,
                ),
            },
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
            raise CodeExplanationError(
                f"LLM did not return valid JSON: {exc}"
            ) from exc

    try:
        return CodeExplanationResult(**parsed)
    except Exception as exc:
        raise CodeExplanationError(
            f"LLM JSON did not match expected schema: {exc}"
        ) from exc

