"""Code Explainer LLM engine.

Uses the shared ``chat_json`` pipeline (provider retries, defensive JSON
parsing, one corrective retry, mapped errors) instead of local parsing logic.
Python files additionally get AST structural context pre-computed here.
"""

from pathlib import Path

from app.ai.llm_utils import chat_json
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

    return await chat_json(
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
        ],
        schema=CodeExplanationResult,
        error_cls=CodeExplanationError,
    )
