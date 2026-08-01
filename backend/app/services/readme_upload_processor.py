"""Extract safe, size-bounded text context from uploaded files/ZIPs.

Defense notes (zip-bomb awareness):
- Member uncompressed sizes are read from the ZIP central directory BEFORE
  any decompression happens, so a malicious member's uncompressed size is
  checked and the member is skipped/aborted before its bytes are produced.
- Per-file and cumulative total limits apply to the DECOMPRESSED (extracted)
  size, never just the compressed upload size.
- Binary files are recorded by name only; their contents never reach the LLM.
"""

import zipfile
from io import BytesIO
from pathlib import Path

from fastapi import UploadFile

from app.schemas.readme_generation import FileContext

MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB per extracted file
MAX_TOTAL_BYTES = 10 * 1024 * 1024  # 10 MB total extracted content

# Files that carry the most structural signal about a project — read more of them.
KEY_FILE_NAMES = {
    "package.json",
    "requirements.txt",
    "pyproject.toml",
    "setup.py",
    "Cargo.toml",
    "go.mod",
    "Gemfile",
    "Pipfile",
    "composer.json",
    "pom.xml",
    "build.gradle",
    "vite.config.ts",
    "vite.config.js",
    "tsconfig.json",
    "webpack.config.js",
    "README.md",
}

# "Main entry" file name patterns — also high-signal.
MAIN_ENTRY_MARKERS = (
    "main.py",
    "app.py",
    "manage.py",
    "wsgi.py",
    "asgi.py",
    "index.ts",
    "index.tsx",
    "index.js",
    "index.jsx",
    "main.ts",
    "main.tsx",
    "server.py",
    "server.js",
    "server.ts",
    "cli.py",
)

KEY_LINE_LIMIT = 120
DEFAULT_LINE_LIMIT = 30
MAX_PREVIEW_CHARS = 4000

SKIPPED_DIR_MARKERS = ("__MACOSX/", ".git/", "node_modules/", "venv/", ".venv/", "dist/", "__pycache__/")

TEXT_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".md", ".txt", ".toml", ".yaml",
    ".yml", ".html", ".css", ".scss", ".sh", ".bat", ".ini", ".cfg", ".env.example",
    ".sql", ".xml", ".java", ".go", ".rs", ".c", ".h", ".cpp", ".hpp", ".rb", ".php",
    ".vue", ".svelte", ".lock", ".gitignore", ".dockerignore", ".eslintrc",
}


class ReadmeUploadTooLarge(Exception):
    """Raised when extracted content exceeds the configured size budget."""


class ReadmeUploadInvalid(Exception):
    """Raised when an uploaded file is malformed (e.g. corrupt ZIP)."""


def _is_zip(data: bytes) -> bool:
    return data.startswith(b"PK\x03\x04") or data.startswith(b"PK\x05\x06") or data.startswith(b"PK\x07\x08")


def _is_likely_text(data: bytes) -> bool:
    sample = data[:8192]
    if b"\x00" in sample:
        return False
    try:
        sample.decode("utf-8")
        return True
    except UnicodeDecodeError:
        return False


def _path_signal(path: str) -> bool:
    lower = path.lower()
    name = lower.rsplit("/", 1)[-1]
    if name in KEY_FILE_NAMES:
        return True
    if any(marker in lower for marker in MAIN_ENTRY_MARKERS):
        return True
    return False


def _should_skip_path(path: str) -> bool:
    normalized = path.replace("\\", "/")
    if normalized.startswith("."):
        return True
    for marker in SKIPPED_DIR_MARKERS:
        if marker in normalized:
            return True
    return False


def _line_limit_for(path: str) -> int:
    return KEY_LINE_LIMIT if _path_signal(path) else DEFAULT_LINE_LIMIT


def _make_text_preview(path: str, data: bytes) -> str:
    line_limit = _line_limit_for(path)
    text = data.decode("utf-8", errors="replace")
    lines = text.splitlines()
    preview_lines = lines[:line_limit]
    preview = "\n".join(preview_lines)
    truncated = len(lines) > line_limit
    if len(preview) > MAX_PREVIEW_CHARS:
        preview = preview[:MAX_PREVIEW_CHARS]
        truncated = True
    if truncated:
        preview += "\n... (truncated)"
    return preview


def _record_binary(path: str) -> FileContext:
    return FileContext(
        path=path,
        content_preview="[binary file — contents not included]",
    )


def _extract_zip_members(zip_bytes: bytes, total_budget: int) -> list[FileContext]:
    contexts: list[FileContext] = []
    total_consumed = 0

    try:
        archive = zipfile.ZipFile(BytesIO(zip_bytes))
    except zipfile.BadZipFile as exc:
        raise ReadmeUploadInvalid(f"Uploaded ZIP is corrupt or invalid: {exc}") from exc

    with archive:
        for info in archive.infolist():
            if info.is_dir():
                continue
            path = info.filename
            if _should_skip_path(path):
                continue

            # Defense: check UNCOMPRESSED size before decompressing anything.
            if info.file_size > MAX_FILE_SIZE_BYTES:
                raise ReadmeUploadTooLarge(
                    f"ZIP member '{info.filename}' exceeds the 2MB per-file content limit."
                )

            total_consumed += info.file_size
            if total_consumed > MAX_TOTAL_BYTES:
                raise ReadmeUploadTooLarge(
                    "Uploaded project exceeds the 10MB total content limit after extraction."
                )

            try:
                data = archive.read(info)
            except RuntimeError as exc:
                # e.g. encrypted/corrupt member
                contexts.append(
                    FileContext(path=path, content_preview=f"[skipped: could not read member — {exc}]")
                )
                continue

            if not _is_likely_text(data):
                contexts.append(_record_binary(path))
                continue

            contexts.append(
                FileContext(path=path, content_preview=_make_text_preview(path, data))
            )

    return contexts


def _extract_single_file(upload: UploadFile, data: bytes) -> FileContext:
    path = upload.filename or "uploaded_file"
    if len(data) > MAX_FILE_SIZE_BYTES:
        raise ReadmeUploadTooLarge(
            f"Uploaded file '{safe_upload_name(path)}' exceeds the 2MB per-file content limit."
        )
    if not _is_likely_text(data):
        return _record_binary(path)
    return FileContext(path=path, content_preview=_make_text_preview(path, data))


async def build_file_contexts(files: list[UploadFile]) -> list[FileContext]:
    """Read uploaded files, producing a bounded list of FileContext for the LLM.

    The 2MB/file and 10MB total limits are enforced against the DECOMPRESSED /
    extracted content size (not the compressed upload size), and extraction
    aborts early when the cumulative budget is exceeded.
    """
    if not files:
        return []

    contexts: list[FileContext] = []
    total_budget_remaining = MAX_TOTAL_BYTES

    for upload in files:
        try:
            data = await upload.read()
        except Exception:
            continue

        if len(data) > MAX_TOTAL_BYTES:
            raise ReadmeUploadTooLarge(
                f"Uploaded file '{upload.filename}' exceeds the 10MB total content limit."
            )

        if _is_zip(data):
            try:
                extracted = _extract_zip_members(data, total_budget_remaining)
            except ReadmeUploadInvalid as exc:
                raise exc
            contexts.extend(extracted)
        else:
            contexts.append(_extract_single_file(upload, data))

        total_budget_remaining = MAX_TOTAL_BYTES - sum(
            len(c.content_preview) for c in contexts
        )
        if total_budget_remaining < 0:
            raise ReadmeUploadTooLarge(
                "Uploaded project exceeds the 10MB total content limit after extraction."
            )

    return contexts


def summarize_input(description: str | None, files: list[UploadFile], file_contexts: list[FileContext]) -> str:
    if description and description.strip():
        return description.strip()[:500]
    if file_contexts:
        top = file_contexts[0].path
        return f"Uploaded project ({len(file_contexts)} files), starting at {top}"
    if files:
        names = ", ".join(f.filename or "file" for f in files[:3])
        return f"Uploaded file(s): {names}"
    return "README generation request"


def safe_upload_name(filename: str | None) -> str:
    """Return a safe display name without path traversal artifacts."""
    if not filename:
        return "uploaded_file"
    name = Path(filename).name
    return name or "uploaded_file"

