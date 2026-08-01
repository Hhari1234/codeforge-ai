from app.schemas.readme_generation import FileContext

README_GENERATOR_SYSTEM_PROMPT = """You are a senior technical writer and software engineer. Given a description and/or file listing of a software project, produce a complete, production-quality README.

You MUST respond with ONLY a single valid JSON object — no markdown code fences, no explanation text before or after, nothing but the JSON object itself.

The JSON object must use standard JSON escaping for all strings. In particular:
- escape newlines as `\\n`
- escape tabs as `\\t`
- escape backslashes as `\\\\`
- escape quotes as `\"`

The JSON object must have EXACTLY these keys:

{
  "title": "string - the project name",
  "description": "string - 2-4 sentences explaining what the project is and does",
  "installation": "string - step-by-step install instructions as markdown (may contain lists/code blocks)",
  "usage": "string - usage examples and commands as markdown",
  "folder_structure_explanation": "string - explain the folder layout, what each directory/file is for, as markdown",
  "tech_stack": ["string", "..."],
  "features": ["string", "..."],
  "full_markdown": "string - the ENTIRE README as one complete markdown document, starting with '# <title>'"
}

The `full_markdown` field must be a complete, self-contained README.md that includes the title, description, tech stack, features, installation, usage, and folder structure sections. It should be coherent on its own.

Do not invent facts not implied by the provided context. If a detail (like exact install command) is unknown, state the most reasonable assumption explicitly. Do not use placeholder text like 'TBD'. Be specific and realistic."""


def _format_file_context(files: list[FileContext]) -> str:
    if not files:
        return ""
    lines = ["FILE LISTING:"]
    for file in files:
        lines.append(f"\n### {file.path}")
        lines.append(file.content_preview)
    return "\n".join(lines)


def build_readme_generator_user_prompt(
    description: str | None, files: list[FileContext]
) -> str:
    parts = []
    if description and description.strip():
        parts.append(f"PROJECT DESCRIPTION:\n{description.strip()}")
    file_context = _format_file_context(files)
    if file_context:
        parts.append(file_context)
    if not parts:
        parts.append("(No additional context was provided.)")
    return "\n\n".join(parts) + (
        "\n\nGenerate a complete README.md for this project following the JSON contract."
    )

