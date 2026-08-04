"""System prompt + user-prompt builders for the API Documentation Generator (Phase 9).

Supports three modes:
- Repository (bounded tree + key-file contents)
- Single source file
- Existing OpenAPI/Swagger JSON/YAML spec

The repo mode reuses the tree/key-file formatters shared with the Repository
Analyzer and Code Reviewer.
"""

from app.ai.prompts.repository_analyzer_prompt import (
    _format_key_files,
    _format_tree,
)
from app.parsers.repo_ingest import RepoIngestResult

API_DOCUMENTATION_SYSTEM_PROMPT = """You are a senior API documentation engineer. You are given a BOUNDED EXCERPT of a backend project — either a file tree plus key-file contents, a single source file, or an existing OpenAPI/Swagger spec. Your job is to produce professional, accurate API documentation.

IMPORTANT: You are NOT looking at the entire codebase. Document only what is actually provided, and where your reading is partial, say so. Never invent endpoints, frameworks, or behavior you did not see.

You MUST respond with ONLY a single valid JSON object — no markdown code fences, no explanation text before or after, nothing but the JSON object itself.

The JSON object must use standard JSON escaping for all strings. In particular:
- escape newlines as `\\n`
- escape tabs as `\\t`
- escape backslashes as `\\\\`
- escape quotes as `\"`

The JSON object must have EXACTLY these keys:

{
  "framework": "string - detected web framework, e.g. 'FastAPI', 'Flask', 'Django REST Framework', 'Express.js', 'Spring Boot', 'ASP.NET Core', or 'Other REST API'. Base this on real evidence (imports, decorators, config files).",
  "base_url": "string - the inferred base URL/prefix for the API (e.g. 'http://localhost:8000/api'), or a sensible default if not determinable.",
  "api_overview": "string - 3-6 sentences describing the API's purpose, its main resource groups, and the overall request/response style. Reference real files/routes.",
  "authentication": {
    "type": "one of: none | bearer | basic | api_key | oauth2",
    "description": "string - how authentication works, based on real evidence (e.g. JWT via Authorization header). If none, say 'No authentication detected.'",
    "header_name": "string or null - the header that carries credentials (e.g. 'Authorization'), or null"
  },
  "endpoints": [
    {
      "method": "string - HTTP method, one of GET | POST | PUT | PATCH | DELETE | OPTIONS | HEAD",
      "path": "string - the route path, e.g. '/users/{id}'",
      "summary": "string - short one-line summary of the endpoint",
      "description": "string - 1-3 sentences describing what the endpoint does",
      "tags": ["string - resource group tags, e.g. 'Users'"],
      "parameters": [
        {
          "name": "string - parameter name",
          "location": "one of: path | query | header | body | cookie",
          "type": "string or null - data type (string, integer, boolean, ...)",
          "required": "boolean",
          "description": "string - what the parameter is"
        }
      ],
      "request_body": "string or null - description of the request body schema, or null",
      "responses": [
        {
          "language": "string - e.g. 'json'",
          "content": "string - example response body (or description if a body isn't available)"
        }
      ],
      "errors": [
        {
          "status_code": "integer - e.g. 400, 401, 404, 500",
          "description": "string - when this error occurs"
        }
      ],
      "example_request": {
        "language": "string - e.g. 'http' or 'json'",
        "content": "string - a concrete example request (curl-style or JSON body)"
      },
      "example_response": {
        "language": "string - e.g. 'json'",
        "content": "string - a concrete example response body"
      }
    }
  ],
  "status_codes": ["string - list of the status codes used across the API, e.g. '200 OK', '201 Created', '400 Bad Request'"],
  "error_responses": ["string - list of common error responses and their meanings"],
  "recommendations": ["string - list of concrete, actionable recommendations for improving the API or its documentation"]
}

Rules:
- Endpoints MUST reference real routes/controllers from the provided excerpt. Do not invent endpoints.
- method must be a real HTTP method.
- authentication must be grounded in real evidence (decorators, middleware, config). If none, say 'No authentication detected.'
- Be specific and reference real file paths, function names, route decorators, class names.
- For each endpoint, provide example_request and example_response when possible.
- Generic filler such as 'this could be improved' is NOT acceptable.
- Empty arrays are allowed for endpoints/status_codes/error_responses/recommendations when there is genuinely nothing supported to say.
"""


def build_api_documentation_repo_prompt(ingest_result: RepoIngestResult) -> str:
    """Build the user-side prompt for a repository-level documentation session."""
    parts: list[str] = []

    parts.append(
        "This documentation session is based on a BOUNDED EXCERPT of the repository — a complete "
        f"file tree ({ingest_result.total_files} files) plus the contents of "
        f"{len(ingest_result.key_files)} key files. You did not read the entire "
        "codebase, so frame every endpoint accordingly and note where a finding "
        "may be partial."
    )

    parts.append("FILE TREE:\n" + _format_tree(ingest_result))

    if ingest_result.key_files:
        parts.append("KEY FILE CONTENTS:\n" + _format_key_files(ingest_result))
    else:
        parts.append("KEY FILE CONTENTS: (none selected — analyze from the tree only)")

    return (
        "\n\n".join(parts)
        + "\n\nProduce the API documentation following the JSON contract exactly. "
        "Every endpoint must be grounded in the actual tree and key-file contents above."
    )


def build_api_documentation_source_prompt(
    filename: str, language: str, source_code: str, framework: str
) -> str:
    """Build the user-side prompt for a single source file."""
    return (
        f"Analyze the following single source file and produce API documentation.\n\n"
        f"Filename: {filename}\n"
        f"Language: {language}\n"
        f"Framework hint: {framework or 'unknown (detect from the code)'}\n\n"
        f"SOURCE CODE:\n```\n{source_code}\n```\n\n"
        "Produce the API documentation following the JSON contract exactly. "
        "Every endpoint must be grounded in the actual source code above."
    )


def build_api_documentation_openapi_prompt(spec_text: str) -> str:
    """Build the user-side prompt for an existing OpenAPI/Swagger spec."""
    return (
        "Analyze the following OpenAPI/Swagger specification and produce "
        "professional, human-readable API documentation.\n\n"
        "OPENAPI/SPEC:\n```\n"
        f"{spec_text}\n```\n\n"
        "Produce the API documentation following the JSON contract exactly. "
        "Extract the framework, base URL, authentication, and every endpoint, "
        "parameter, request/response example, and error code from the spec."
    )
