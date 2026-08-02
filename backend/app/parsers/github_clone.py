"""Shallow-clone a public GitHub repository into a temp directory.

Used by the Repository Analyzer (Module 5) ingestion layer. This module ONLY
handles the clone lifecycle — it does not do any LLM work or file processing.

Key guarantees:

- Shallow clone (`--depth=1`) so we only fetch the default branch tip.
- Interactive credential prompts are disabled (`GIT_TERMINAL_PROMPT=0`), so a
  private / nonexistent repo fails fast with a clear error instead of hanging.
- The temp clone is ALWAYS cleaned up via the `ClonedRepo` context manager —
  on success AND on any failure inside the `with` block.
"""

from __future__ import annotations

import gc
import os
import shutil
import stat
import tempfile
import time
from contextlib import AbstractContextManager
from pathlib import Path

from git import Repo, exc as git_exc

GIT_TERMINAL_PROMPT_DISABLED = "0"


class GithubCloneError(Exception):
    """Base error for GitHub clone operations."""


class GithubCloneInvalidUrl(GithubCloneError):
    """Raised when the URL isn't a recognizable GitHub repository URL."""


class GithubCloneFailed(GithubCloneError):
    """Raised when the clone itself fails (private/invalid/nonexistent repo)."""


class ClonedRepo(AbstractContextManager):
    """A shallow-cloned GitHub repo that guarantees cleanup on exit.

    Usage::

        with clone_github_repo(url) as cloned:
            ingest_repository(cloned.path)

    `.path` is the clone root (the repo's own top-level directory), so ingested
    file paths are repo-relative (e.g. ``index.html``, not ``repo/index.html``).

    The whole temp directory is removed whether the `with` body raises or not.
    """

    def __init__(self, url: str, temp_dir: Path, repo_path: Path) -> None:
        self.url = url
        self.temp_dir = temp_dir
        self.path = repo_path
        self._repo: Repo | None = None

    @property
    def repo(self) -> Repo:
        if self._repo is None:
            raise GithubCloneError("Repo not cloned yet — access inside the `with` block.")
        return self._repo

    def __enter__(self) -> "ClonedRepo":
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        self.cleanup()

    def cleanup(self) -> None:
        """Delete the whole temp dir (idempotent, never raises).

        GitPython keeps gitdb cursors open on the pack files, and on Windows
        those read-only pack files can't be removed until the handles are
        released. So we: close the Repo, drop references, gc(), chmod everything
        writable, then retry the delete a few times.
        """
        if self._repo is not None:
            try:
                # Break any open file handles before removal on Windows.
                self._repo.close()
            except Exception:
                pass
            self._repo = None

        # Force-release the GitPython gitdb objects that hold pack handles.
        gc.collect()

        if not self.temp_dir.exists():
            return

        # Make everything writable first (Windows: read-only pack files).
        for dirpath, dirnames, filenames in os.walk(self.temp_dir):
            for name in dirnames + filenames:
                try:
                    full = Path(dirpath) / name
                    full.chmod(full.stat().st_mode | stat.S_IWRITE)
                except OSError:
                    pass

        # Retry removal a few times to ride out transient file locks.
        for _ in range(3):
            try:
                shutil.rmtree(self.temp_dir)
                break
            except OSError:
                time.sleep(0.2)
                continue


def _is_github_url(url: str) -> bool:
    url = url.strip()
    if not url:
        return False
    lower = url.lower()
    # Accept https://github.com/... and git@github.com:...
    if lower.startswith("https://github.com/") or lower.startswith("http://github.com/"):
        return True
    if lower.startswith("git@github.com:"):
        return True
    # Also accept github.com shorthand used by some tools.
    if lower.startswith("github.com/"):
        return True
    return False


def _normalize_url(url: str) -> str:
    url = url.strip()
    # Strip trailing ".git" if present.
    if url.endswith(".git"):
        url = url[:-4]
    return url


def clone_github_repo(url: str) -> ClonedRepo:
    """Shallow-clone a public GitHub URL into a temp directory.

    Args:
        url: GitHub repository URL, e.g.
            ``https://github.com/octocat/Spoon-Knife.git``.

    Returns:
        ClonedRepo context manager whose `.path` points at the clone.

    Raises:
        GithubCloneInvalidUrl: URL isn't a GitHub repo URL.
        GithubCloneFailed: clone failed (private/nonexistent/network).
    """
    if not _is_github_url(url):
        raise GithubCloneInvalidUrl(
            f"'{url}' is not a valid GitHub repository URL. "
            "Expected something like https://github.com/owner/repo"
        )

    temp_dir = tempfile.mkdtemp(prefix="codeforge_clone_")
    target = Path(temp_dir) / "repo"
    cloned = ClonedRepo(url, Path(temp_dir), target)

    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = GIT_TERMINAL_PROMPT_DISABLED

    try:
        # `depth=1` gives a shallow clone of the default branch tip.
        repo = Repo.clone_from(
            _normalize_url(url),
            str(target),
            depth=1,
            single_branch=True,
            env=env,
        )
        cloned._repo = repo
    except git_exc.GitCommandError as exc:
        # Clean up partial clone immediately.
        cloned.cleanup()
        raise GithubCloneFailed(
            _explain_clone_error(url, exc),
        ) from exc
    except Exception as exc:
        cloned.cleanup()
        raise GithubCloneFailed(
            f"Could not clone '{url}': {exc}",
        ) from exc

    return cloned


def _explain_clone_error(url: str, exc: git_exc.GitCommandError) -> str:
    """Turn a GitPython stderr into a user-friendly clone error."""
    stderr = (exc.stderr or "").strip()
    combined = (stderr + " " + (str(exc) or "")).lower()

    if "authentication" in combined or "could not read username" in combined or "403" in combined:
        return (
            f"Failed to clone '{url}': this repo is private or requires "
            "authentication. Only public repositories can be analyzed."
        )
    if "not found" in combined or "repository" in combined and "not" in combined:
        return (
            f"Failed to clone '{url}': the repository does not exist or is not "
            "publicly accessible."
        )
    if "could not resolve host" in combined or "timed out" in combined or "connection" in combined:
        return (
            f"Failed to clone '{url}': network error reaching GitHub. "
            "Check your internet connection and try again."
        )
    return (
        f"Failed to clone '{url}': {stderr or exc}. "
        "Ensure the repository is public and the URL is correct."
    )

