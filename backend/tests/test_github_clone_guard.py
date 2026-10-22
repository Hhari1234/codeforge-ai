"""SSRF guard: git must only ever be invoked against github.com."""

import pytest

from app.parsers.github_clone import (
    GithubCloneInvalidUrl,
    GithubCloneFailed,
    _is_github_url,
    clone_github_repo,
)


@pytest.mark.parametrize(
    "url",
    [
        "https://example.com/owner/repo",
        "https://github.com.evil.com/owner/repo",
        "https://evil.com/github.com/owner/repo",
        "https://user@github.com/owner/repo",
        "https://user@github.com.evil.com/owner/repo",
        "http://169.254.169.254/latest/meta-data",
        "https://gitlab.com/owner/repo",
        "file:///etc/passwd",
        "git@evil.com:owner/repo",
        "git@evil.com:owner/repo.git",
        "git@github.com.attacker.dev:owner/repo.git",
        "https://attacker.dev/github.com/owner/repo",
        "ftp://github.com/owner/repo",
        "https://github.com.evil/x/y",
    ],
)
def test_rejects_non_github_hosts(url):
    assert not _is_github_url(url), url
    with pytest.raises(GithubCloneInvalidUrl):
        clone_github_repo(url)


@pytest.mark.parametrize(
    "url",
    [
        "https://github.com/owner/repo",
        "https://github.com/owner/repo.git",
        "https://github.com/owner/repo/tree/main",
        "github.com/owner/repo",
        "git@github.com:owner/repo.git",
        "http://github.com/owner/repo",
    ],
)
def test_accepts_github_hosts(url):
    assert _is_github_url(url), url


def test_clone_refuses_non_github_before_touching_network():
    """clone_github_repo must raise without ever invoking git."""
    with pytest.raises(GithubCloneInvalidUrl):
        clone_github_repo("https://example.com/owner/repo")


def test_explain_clone_error_never_leaks_credentials():
    """User-facing clone errors stay actionable and generic."""
    from app.parsers.github_clone import _explain_clone_error, git_exc

    exc = git_exc.GitCommandError(
        command="git clone",
        status=128,
        stderr="fatal: could not read Username for 'https://github.com'",
    )
    msg = _explain_clone_error("https://github.com/o/r", exc)
    assert "private" in msg or "authentication" in msg
    assert "sk-or-" not in msg
