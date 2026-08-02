"""Repository ingestion core — extract a bounded, structured view of a codebase.

This is the file-processing layer for the Repository Analyzer (Module 5). It is
deliberately decoupled from any route / LLM / frontend code: callers hand it
either a path to a local directory (a cloned repo) or a path to a ZIP archive,
and it returns a `RepoIngestResult` containing:

- a full file-tree listing of every non-skipped file, and
- a bounded set of "key files" whose contents are worth sending to an LLM.

It reuses the zip-bomb-safe pattern from `app/services/readme_upload_processor.py`:

- ZIP member sizes are read from the central directory and checked BEFORE any
  decompression, so oversized members abort before their bytes are produced.
- Per-file and cumulative total caps apply to the DECOMPRESSED content size.
- Binary files are listed in the tree but their contents are never selected.

The same per-file / total caps apply when walking a local directory.
"""

from __future__ import annotations

import os
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

# ---------------------------------------------------------------------------
# Limits / configuration
# ---------------------------------------------------------------------------

# Per selected file content cap before truncation.
# Kept at 60 KB so several files can still fit under the total cap rather than
# letting 1–2 large files consume the whole budget.
MAX_KEY_FILE_SIZE_BYTES = 60 * 1024  # 60 KB
# Cumulative cap on selected key-file content.
# Reduced from 512 KB to 150 KB so the assembled prompt stays well under free
# OpenRouter models' smaller context windows (e.g. 131K tokens).
MAX_TOTAL_CONTENT_BYTES = 150 * 1024  # 150 KB
# Bounded number of "largest source files" beyond configs + entry points.
MAX_LARGEST_SOURCE_FILES = 25

# Whole-archive cap for ZIP uploads (mirrors readme_upload_processor).
MAX_ZIP_TOTAL_BYTES = 10 * 1024 * 1024  # 10 MB decompressed

# Directories always skipped, wherever they appear in the tree.
SKIPPED_DIR_NAMES = {
    "node_modules",
    ".git",
    "__pycache__",
    "dist",
    "build",
    "venv",
    ".venv",
    ".idea",
    ".vscode",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".next",
    ".nuxt",
    "vendor",
    "target",
    "coverage",
    ".tox",
}

# Common binary/media extensions — never select their content (still listed in tree).
BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".ico", ".svg",
    ".mp3", ".mp4", ".mov", ".wav", ".ogg", ".flac", ".webm", ".avi", ".mkv",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".zip", ".gz", ".tar", ".bz2", ".7z", ".rar",
    ".wasm", ".so", ".dll", ".dylib", ".exe", ".bin", ".class", ".jar",
    ".woff", ".woff2", ".ttf", ".otf", ".eot", ".icns", ".cur",
    ".sqlite", ".sqlite3", ".db", ".ipynb",
    ".pyc", ".pyo", ".o", ".obj", ".a", ".lib",
}

# Config files that carry the most structural signal about a project.
CONFIG_FILE_NAMES = {
    "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "requirements.txt", "pyproject.toml", "setup.py", "setup.cfg",
    "Pipfile", "Pipfile.lock", "poetry.lock", "uv.lock",
    "Cargo.toml", "Cargo.lock", "go.mod", "go.sum", "Gemfile", "Gemfile.lock",
    "composer.json", "pom.xml", "build.gradle", "build.gradle.kts",
    "settings.gradle", "gradle.properties",
    "tsconfig.json", "tsconfig.app.json", "tsconfig.node.json", "jsconfig.json",
    "vite.config.ts", "vite.config.js", "webpack.config.js", "webpack.config.ts",
    "rollup.config.js", "next.config.js", "next.config.mjs", "nuxt.config.ts",
    "tailwind.config.js", "tailwind.config.ts", "postcss.config.js",
    "eslint.config.js", ".eslintrc", ".eslintrc.json", ".eslintrc.js",
    ".prettierrc", ".prettierrc.json", "jest.config.js", "vitest.config.ts",
    ".babelrc", "babel.config.js", "swiftlint.yml", ".flake8",
    "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
    "Makefile", "Procfile", ".env.example", "README.md", "index.html",
}

# "Main entry" file-name patterns — also high-signal.
ENTRY_POINT_NAMES = {
    "main.py", "app.py", "manage.py", "wsgi.py", "asgi.py",
    "index.ts", "index.tsx", "index.js", "index.jsx",
    "main.ts", "main.tsx", "main.js", "main.jsx",
    "server.py", "server.js", "server.ts", "server.tsx",
    "cli.py", "cli.js", "__main__.py", "entrypoint.py",
    "app.js", "app.ts", "app.jsx", "app.tsx",
}


class RepoIngestError(Exception):
    """Base error for repository ingestion failures."""


class RepoIngestUnsupportedSource(RepoIngestError):
    """Raised when the source path is neither a directory nor a ZIP file."""


class RepoIngestTooLarge(RepoIngestError):
    """Raised when extracted/read content exceeds a configured size budget."""


class RepoIngestInvalidZip(RepoIngestError):
    """Raised when a supplied ZIP archive is corrupt or unreadable."""


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class RepoFileTreeEntry:
    """A single entry in the repository file tree."""
    path: str  # relative forward-slash path
    size: int  # bytes (0 for directories)
    is_dir: bool = False
    is_binary: bool = False


@dataclass
class KeyFile:
    """A selected key file with bounded content for the LLM."""
    path: str  # relative forward-slash path
    size: int  # original byte size
    truncated: bool  # True if content was capped
    content: str


@dataclass
class RepoIngestResult:
    """Structured result of ingesting a repo (dir or ZIP)."""
    source: str  # original source path string
    source_type: str  # "directory" | "zip"
    file_tree: list[RepoFileTreeEntry] = field(default_factory=list)
    key_files: list[KeyFile] = field(default_factory=list)
    skipped_dirs: list[str] = field(default_factory=list)
    binary_files_skipped: int = 0

    @property
    def total_files(self) -> int:
        return sum(1 for e in self.file_tree if not e.is_dir)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _to_slash(rel: str) -> str:
    return rel.replace("\\", "/")


def _is_zip_file(path: Path) -> bool:
    try:
        with open(path, "rb") as fh:
            head = fh.read(4)
        return head[:4] == b"PK\x03\x04"
    except OSError:
        return False


def _should_skip_dir(rel_path: str) -> bool:
    """Return True if any ancestor directory name matches a skip marker."""
    parts = rel_path.split("/")
    # Exclude the file's own name (last part) — we only check directories.
    return any(part in SKIPPED_DIR_NAMES for part in parts[:-1])


def _has_binary_extension(name: str) -> bool:
    lower = name.lower()
    return any(lower.endswith(ext) for ext in BINARY_EXTENSIONS)


def _is_likely_text(data: bytes) -> bool:
    sample = data[:8192]
    if b"\x00" in sample:
        return False
    try:
        sample.decode("utf-8")
        return True
    except UnicodeDecodeError:
        return False


def _is_config_or_entry(path: str) -> bool:
    name = path.rsplit("/", 1)[-1]
    return name in CONFIG_FILE_NAMES or name in ENTRY_POINT_NAMES


def _bounded_text(data: bytes, file_size: int) -> tuple[str, bool]:
    """Decode raw bytes to text, capped at the per-file limit.

    Returns (text, truncated).
    """
    capped = data[:MAX_KEY_FILE_SIZE_BYTES]
    try:
        text = capped.decode("utf-8")
    except UnicodeDecodeError:
        text = capped.decode("utf-8", errors="replace")
    truncated = file_size > MAX_KEY_FILE_SIZE_BYTES
    return text, truncated


# ---------------------------------------------------------------------------
# Selection
# ---------------------------------------------------------------------------


def _select_key_files(file_map: list[tuple[str, bytes, int]]):
    """Select key files from a list of (rel_path, raw_bytes, original_size).

    Config/entry files always come first; then the largest remaining source
    files (up to MAX_LARGEST_SOURCE_FILES), all under the total content cap.

    Returns a list of (rel_path, content_str, original_size, truncated).
    """
    configs: list[tuple[str, bytes, int]] = []
    others: list[tuple[str, bytes, int]] = []

    for rel, data, size in file_map:
        if _is_config_or_entry(rel):
            configs.append((rel, data, size))
        else:
            others.append((rel, data, size))

    others.sort(key=lambda item: item[2], reverse=True)
    ordered = configs + others[:MAX_LARGEST_SOURCE_FILES]

    selected: list[tuple[str, str, int, bool]] = []
    total = 0
    for rel, data, size in ordered:
        remaining = MAX_TOTAL_CONTENT_BYTES - total
        if remaining <= 0:
            break
        # Cap this file at min(per-file cap, remaining budget).
        limit = min(size, MAX_KEY_FILE_SIZE_BYTES, remaining)
        text, truncated = _bounded_text(data[:limit], size)
        total += len(text)
        selected.append((rel, text, size, truncated))
        if total >= MAX_TOTAL_CONTENT_BYTES:
            break

    return selected


# ---------------------------------------------------------------------------
# Directory walker
# ---------------------------------------------------------------------------


def _walk_directory(root: Path, result: RepoIngestResult):
    """Walk a local directory, filling the tree and building the key-file pool.

    Content for key files is read lazily right here (files are small enough to
    hold in memory once bounded).
    """
    file_map: list[tuple[str, bytes, int]] = []
    binary_skipped = 0
    skipped_dirs: set[str] = set()

    for dirpath, dirnames, filenames in os.walk(root):
        rel_dir = _to_slash(os.path.relpath(dirpath, root))

        # Prune skipped directories in-place so os.walk doesn't descend.
        pruned: list[str] = []
        for d in dirnames:
            full = _join_rel(rel_dir, d)
            if _should_skip_dir(full + "/"):
                skipped_dirs.add(d)
            else:
                pruned.append(d)
        dirnames[:] = pruned

        # Emit tree entries for subdirectories (that weren't pruned above).
        for d in dirnames:
            full = _join_rel(rel_dir, d)
            result.file_tree.append(
                RepoFileTreeEntry(path=full, size=0, is_dir=True)
            )

        for filename in filenames:
            rel_path = _join_rel(rel_dir, filename)
            full_path = Path(dirpath) / filename

            try:
                size = full_path.stat().st_size
            except OSError:
                continue

            if size == 0:
                result.file_tree.append(RepoFileTreeEntry(path=rel_path, size=0))
                continue

            is_binary = _has_binary_extension(filename)
            result.file_tree.append(
                RepoFileTreeEntry(path=rel_path, size=size, is_binary=is_binary)
            )

            if is_binary:
                binary_skipped += 1
                continue

            try:
                data = full_path.read_bytes()[:MAX_TOTAL_CONTENT_BYTES]
            except (OSError, PermissionError):
                continue

            if not _is_likely_text(data):
                # Mark binary content detected by inspection.
                binary_skipped += 1
                continue

            file_map.append((rel_path, data, size))

    result.skipped_dirs = sorted(skipped_dirs)
    result.binary_files_skipped = binary_skipped

    # Build KeyFiles from the pool.
    for rel, text, size, truncated in _select_key_files(file_map):
        result.key_files.append(KeyFile(path=rel, size=size, truncated=truncated, content=text))


def _join_rel(parent_rel: str, child: str) -> str:
    if parent_rel == ".":
        return child
    return f"{parent_rel}/{child}"


# ---------------------------------------------------------------------------
# ZIP walker (zip-bomb safe)
# ---------------------------------------------------------------------------


def _walk_zip(zip_path: Path, result: RepoIngestResult):
    """Read a ZIP archive applying size caps BEFORE decompression."""
    file_map: list[tuple[str, bytes, int]] = []
    binary_skipped = 0
    skipped_dirs: set[str] = set()
    total_consumed = 0

    try:
        archive = zipfile.ZipFile(zip_path)
    except (zipfile.BadZipFile, OSError) as exc:
        raise RepoIngestInvalidZip(f"Uploaded ZIP is corrupt or invalid: {exc}") from exc

    with archive:
        for info in archive.infolist():
            rel_path = _to_slash(info.filename)

            # Skip membership in a known-skip dir BEFORE touching the tree,
            # so skipped dirs never appear in the file-tree listing at all.
            if _should_skip_dir(rel_path):
                for part in rel_path.rstrip("/").split("/"):
                    if part in SKIPPED_DIR_NAMES:
                        skipped_dirs.add(part)
                continue

            # Subdirectory entries end with '/' — record as tree dir.
            if info.is_dir():
                result.file_tree.append(
                    RepoFileTreeEntry(path=rel_path.rstrip("/"), size=0, is_dir=True)
                )
                continue

            result.file_tree.append(
                RepoFileTreeEntry(path=rel_path, size=info.file_size)
            )

            name = rel_path.rsplit("/", 1)[-1]
            if _has_binary_extension(name) or info.file_size == 0:
                if _has_binary_extension(name):
                    binary_skipped += 1
                continue

            # Defense: check the DECOMPRESSED size from the central directory
            # BEFORE decompressing anything.
            if info.file_size > MAX_ZIP_TOTAL_BYTES:
                raise RepoIngestTooLarge(
                    f"ZIP member '{info.filename}' exceeds the "
                    f"{MAX_ZIP_TOTAL_BYTES // (1024 * 1024)}MB content limit."
                )

            total_consumed += info.file_size
            if total_consumed > MAX_ZIP_TOTAL_BYTES:
                raise RepoIngestTooLarge(
                    "ZIP contents exceed the total content limit after extraction."
                )

            try:
                data = archive.read(info)[:MAX_TOTAL_CONTENT_BYTES]
            except RuntimeError:
                continue

            if not _is_likely_text(data):
                binary_skipped += 1
                continue

            file_map.append((rel_path, data, info.file_size))

    result.skipped_dirs = sorted(skipped_dirs)
    result.binary_files_skipped = binary_skipped

    for rel, text, size, truncated in _select_key_files(file_map):
        result.key_files.append(KeyFile(path=rel, size=size, truncated=truncated, content=text))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def ingest_repository(source: str | Path) -> RepoIngestResult:
    """Ingest a local directory or ZIP archive into a structured result.

    Args:
        source: path to directory (e.g. cloned repo) OR a ZIP file.

    Returns:
        RepoIngestResult with a full file tree and a bounded set of KeyFiles.

    Raises:
        RepoIngestUnsupportedSource: source is neither a dir nor a valid ZIP.
        RepoIngestInvalidZip: source is a .zip path but not a valid archive.
        RepoIngestTooLarge: decompressed/read content exceeds the budget.
    """
    path = Path(source)

    if path.is_dir():
        result = RepoIngestResult(source=str(path), source_type="directory")
        _walk_directory(path, result)
        return result

    if path.is_file():
        if not _is_zip_file(path):
            raise RepoIngestUnsupportedSource(
                f"Source '{source}' is neither a directory nor a ZIP file."
            )
        result = RepoIngestResult(source=str(path), source_type="zip")
        _walk_zip(path, result)
        return result

    raise RepoIngestUnsupportedSource(
        f"Source '{source}' does not exist or is neither a directory nor a ZIP file."
    )

