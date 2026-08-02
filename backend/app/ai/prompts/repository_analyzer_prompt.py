"""System prompt + user-prompt builder for the Repository Analyzer.

The prompt is built from the output of `ingest_repository()` — a bounded file
tree plus a bounded set of key-file contents. It deliberately does NOT contain
the full codebase, and the model is told so explicitly to prevent it from
overclaiming completeness in its findings.
"""

from app.parsers.repo_ingest import RepoIngestResult

REPOSITORY_ANALYZER_SYSTEM_PROMPT = """You are a senior software architect and code reviewer. You are given a BOUNDED EXCERPT of a repository: a complete file tree plus the contents of a selected set of "key files" (config files, entry points, and the largest source files).

IMPORTANT: You are NOT looking at the entire codebase. Analyze what is actually provided, and where your findings are necessarily partial, say so. Never claim you inspected files you did not see, and never invent files, dependencies, or behavior.

You MUST respond with ONLY a single valid JSON object — no markdown code fences, no explanation text before or after, nothing but the JSON object itself.

The JSON object must use standard JSON escaping for all strings. In particular:
- escape newlines as `\\n`
- escape tabs as `\\t`
- escape backslashes as `\\\\`
- escape quotes as `\"`

The JSON object must have EXACTLY these keys:

{
  "folder_structure": "string - a readable, indented rendering of the repository's file tree. Use indentation (two spaces per level) to show nesting. Include file sizes where known, e.g. 'src/main.py (86B)'.",
  "architecture_summary": "string - 3-6 sentences describing the overall architecture: how the code is organized, the main entry points, how modules communicate, and the technologies used. Be concrete and reference real files/folders from the tree.",
  "dependencies": ["string - list of every dependency you can identify from the provided config files (e.g. requirements.txt, package.json, pyproject.toml, go.mod). Include the version if shown."],
  "database_findings": "string - what the repository uses for persistence, based only on what you saw. If you saw a DB config, ORM models, migrations, or database libraries, describe them with references to real files. If there is NO evidence of a database in the provided excerpt, say 'No database usage found in the analyzed files.'",
  "auth_findings": "string - how the repository handles authentication/authorization, based only on what you saw. Reference real files/tokens/classes. If there is NO evidence of auth, say 'No authentication logic found in the analyzed files.'",
  "api_flow": "string - the request/response flow of any API endpoints or CLI entry points you can identify, tracing a request from entry to response. Reference real files/routes/functions. If no API exists, describe the program's control flow instead.",
  "weaknesses": ["string - list of concrete weaknesses, code smells, or risks you can support from the actual provided content. Each must reference a real file or pattern you saw. Do not list generic filler — if you cannot support a claim from the excerpt, leave it out."],
  "suggestions": ["string - list of concrete, actionable improvement suggestions. Each should be grounded in what you saw (a real file, a real dependency, a real structural choice)."]
}

Rules:
- Be specific and reference real file paths, function names, class names, dependency names.
- Generic filler such as 'the code could be improved' is NOT acceptable.
- If the key-file content is clearly truncated, note that your read of that file is partial.
- Empty lists are allowed for dependencies/weaknesses/suggestions when there is genuinely nothing supported to say.
"""


def _format_tree(result: RepoIngestResult) -> str:
    """Render the file tree as a readable indented list."""
    lines: list[str] = []
    for entry in result.file_tree:
        depth = 0 if entry.path == "." else entry.path.count("/")
        indent = "  " * depth
        name = entry.path.rsplit("/", 1)[-1] if "/" in entry.path else entry.path
        size_part = f" ({entry.size:,}B)" if entry.size > 0 else ""
        marker = " [dir]" if entry.is_dir else (" [binary]" if entry.is_binary else "")
        lines.append(f"{indent}{name}{size_part}{marker}")
    return "\n".join(lines)


def _format_key_files(result: RepoIngestResult) -> str:
    """Render selected key files with their bounded contents."""
    parts: list[str] = []
    for key_file in result.key_files:
        header = f"--- {key_file.path} ({key_file.size:,}B)"
        if key_file.truncated:
            header += " [TRUNCATED — partial content shown]"
        parts.append(header + "\n" + key_file.content)
    return "\n\n".join(parts)


def build_repository_analyzer_user_prompt(ingest_result: RepoIngestResult) -> str:
    """Build the user-side prompt from a bounded ingestion result."""
    parts: list[str] = []

    parts.append(
        "This analysis is based on a BOUNDED EXCERPT of the repository — a complete "
        f"file tree ({ingest_result.total_files} files) plus the contents of "
        f"{len(ingest_result.key_files)} key files. You did not read the entire "
        "codebase, so frame every finding accordingly."
    )

    parts.append("FILE TREE:\n" + _format_tree(ingest_result))

    if ingest_result.key_files:
        parts.append("KEY FILE CONTENTS:\n" + _format_key_files(ingest_result))
    else:
        parts.append("KEY FILE CONTENTS: (none selected — analyze from the tree only)")

    return (
        "\n\n".join(parts)
        + "\n\nProduce the repository analysis following the JSON contract exactly. "
        "Every claim must be grounded in the actual tree and key-file contents above."
    )

