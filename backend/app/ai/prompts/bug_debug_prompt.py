"""System prompt + user-prompt builders for the Bug Debugger (Phase 8).

Like the Code Reviewer, the repo mode is built from ``ingest_repository()`` —
a bounded file tree plus a bounded set of key-file contents. A source mode
handles a single pasted/uploaded file.
"""

from app.ai.prompts.repository_analyzer_prompt import (
    _format_key_files,
    _format_tree,
)
from app.parsers.repo_ingest import RepoIngestResult

BUG_DEBUG_SYSTEM_PROMPT = """You are a senior software engineer and expert bug debugger. You are given a BOUNDED EXCERPT of source code — either a complete file tree plus the contents of selected "key files" from a repository, or a single source file.

IMPORTANT: You are NOT looking at the entire codebase. Analyze what is actually provided, and where your findings are necessarily partial, say so. Never claim you inspected code you did not see, and never invent files, functions, or behavior.

You MUST respond with ONLY a single valid JSON object — no markdown code fences, no explanation text before or after, nothing but the JSON object itself.

The JSON object must use standard JSON escaping for all strings. In particular:
- escape newlines as `\\n`
- escape tabs as `\\t`
- escape backslashes as `\\\\`
- escape quotes as `\"`

The JSON object must have EXACTLY these keys:

{
  "health_score": "integer 0-100 - a single overall code-health score for the analyzed code. Lower means more/broken bugs; higher means healthier, more robust code.",
  "summary": "string - 3-6 sentences summarizing the overall health of the code, the most critical bugs found, and the general robustness. Be concrete and reference real files/functions.",
  "bugs": [
    {
      "severity": "one of: Critical | High | Medium | Low",
      "category": "one of: Logic | Security | Performance | Error_Handling | Concurrency | Resource | Null_Safety | Type | Syntax | API_Usage | Best_Practice",
      "file": "string - the relative file path the bug belongs to (or the filename for pasted code)",
      "line": "integer or null - the approximate line number if determinable, otherwise null",
      "title": "string - short, specific title of the bug",
      "description": "string - what the bug is and its observable impact, referencing the actual code",
      "root_cause": "string - the precise underlying reason the bug occurs (e.g. unhandled null, race condition, off-by-one, missing boundary check)",
      "suggested_fix": "string - a concrete, actionable step-by-step fix for the bug",
      "fixed_code": "string or null - a corrected version of the offending code snippet (if the fix is code-shaped), otherwise null",
      "best_practice": "string or null - the best practice or guardrail that would prevent this class of bug, or null"
    }
  ],
  "recommendations": ["string - list of concrete, actionable, prioritized recommendations for improving the code's health and robustness"]
}

Rules:
- Bugs MUST reference real code from the provided excerpt. Do not invent bugs.
- Severity must be one of: Critical, High, Medium, Low.
- Category must be one of: Logic, Security, Performance, Error_Handling, Concurrency, Resource, Null_Safety, Type, Syntax, API_Usage, Best_Practice.
- Prioritize the most impactful bugs — do not pad with low-value filler. If you see few real issues, return few bugs.
- For each bug, root_cause and suggested_fix are REQUIRED. Provide fixed_code when the fix is a concrete code change.
- Be specific and reference real file paths, function names, class names, variable names.
- Generic filler such as 'this could be improved' is NOT acceptable.
- Empty arrays are allowed for bugs/recommendations when there is genuinely nothing supported to say.
"""


def build_bug_debug_user_prompt(ingest_result: RepoIngestResult) -> str:
    """Build the user-side prompt for a repository-level debugging session."""
    parts: list[str] = []

    parts.append(
        "This debugging session is based on a BOUNDED EXCERPT of the repository — a complete "
        f"file tree ({ingest_result.total_files} files) plus the contents of "
        f"{len(ingest_result.key_files)} key files. You did not read the entire "
        "codebase, so frame every finding accordingly and note where a finding "
        "may be partial."
    )

    parts.append("FILE TREE:\n" + _format_tree(ingest_result))

    if ingest_result.key_files:
        parts.append("KEY FILE CONTENTS:\n" + _format_key_files(ingest_result))
    else:
        parts.append("KEY FILE CONTENTS: (none selected — analyze from the tree only)")

    return (
        "\n\n".join(parts)
        + "\n\nProduce the bug report following the JSON contract exactly. "
        "Every bug must be grounded in the actual tree and key-file contents above."
    )


def build_bug_debug_source_prompt(
    filename: str, language: str, source_code: str
) -> str:
    """Build the user-side prompt for a single source file (paste or upload)."""
    return (
        f"Analyze the following single source file for bugs.\n\n"
        f"Filename: {filename}\n"
        f"Language: {language}\n\n"
        f"SOURCE CODE:\n```\n{source_code}\n```\n\n"
        "Produce the bug report following the JSON contract exactly. "
        "Every bug must be grounded in the actual source code above, and the "
        "'file' field should be the filename."
    )
