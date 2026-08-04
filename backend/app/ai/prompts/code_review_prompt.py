"""System prompt + user-prompt builder for the Code Reviewer (Phase 7).

The prompt is built from the output of ``ingest_repository()`` — a bounded file
tree plus a bounded set of key-file contents. It deliberately does NOT contain
the full codebase, and the model is told so explicitly to prevent it from
overclaiming completeness in its findings.

The tree/key-file formatters are shared with the Repository Analyzer to avoid
duplicating the rendering logic.
"""

from app.ai.prompts.repository_analyzer_prompt import (
    _format_key_files,
    _format_tree,
)
from app.parsers.repo_ingest import RepoIngestResult

CODE_REVIEW_SYSTEM_PROMPT = """You are a senior software engineer and code reviewer. You are given a BOUNDED EXCERPT of a repository: a complete file tree plus the contents of a selected set of "key files" (config files, entry points, and the largest source files).

IMPORTANT: You are NOT looking at the entire codebase. Review what is actually provided, and where your findings are necessarily partial, say so. Never claim you inspected files you did not see, and never invent files, directories, or behavior.

You MUST respond with ONLY a single valid JSON object — no markdown code fences, no explanation text before or after, nothing but the JSON object itself.

The JSON object must use standard JSON escaping for all strings. In particular:
- escape newlines as `\\n`
- escape tabs as `\\t`
- escape backslashes as `\\\\`
- escape quotes as `\"`

The JSON object must have EXACTLY these keys:

{
  "overall_quality_score": "integer 0-100 - a single overall code quality score for the repository based on what you reviewed",
  "summary": "string - 3-6 sentences summarizing the overall state of the code: its strengths, its biggest risks, and the general quality of the implementation. Be concrete and reference real files.",
  "strengths": ["string - list of concrete things the code does well, each grounded in a real file/pattern you saw"],
  "findings": [
    {
      "file": "string - the relative file path the finding belongs to",
      "line": "integer or null - the approximate line number if determinable, otherwise null",
      "severity": "one of: Critical | High | Medium | Low",
      "category": "one of: security | bug | performance | code_smell | maintainability | best_practice",
      "title": "string - short, specific title of the issue",
      "description": "string - what the issue is and why it matters, referencing the actual code",
      "code_snippet": "string or null - a short relevant snippet of the offending code, or null if not applicable",
      "recommendation": "string - a concrete, actionable fix for the issue"
    }
  ],
  "recommendations": ["string - list of concrete, actionable, prioritized recommendations for improving the repository"]
}

Rules:
- Findings MUST reference real files and real code from the provided excerpt. Do not invent issues.
- Severity must be one of: Critical, High, Medium, Low.
- Category must be one of: security, bug, performance, code_smell, maintainability, best_practice.
- Prioritize the most important findings — do not pad with low-value filler. If you see few real issues, return few findings.
- Be specific and reference real file paths, function names, class names, variable names.
- Generic filler such as 'the code could be improved' is NOT acceptable.
- Empty arrays are allowed for strengths/findings/recommendations when there is genuinely nothing supported to say.
"""


def build_code_review_user_prompt(ingest_result: RepoIngestResult) -> str:
    """Build the user-side prompt from a bounded ingestion result."""
    parts: list[str] = []

    parts.append(
        "This review is based on a BOUNDED EXCERPT of the repository — a complete "
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
        + "\n\nProduce the code review following the JSON contract exactly. "
        "Every finding must be grounded in the actual tree and key-file contents above."
    )
