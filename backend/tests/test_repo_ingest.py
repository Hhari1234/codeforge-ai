"""Tests for the repository ingestion layer (ZIP/dir walking, caps, skips)."""

import zipfile
from pathlib import Path

import pytest

from app.parsers.repo_ingest import (
    RepoIngestInvalidZip,
    RepoIngestTooLarge,
    RepoIngestUnsupportedSource,
    ingest_repository,
)


def make_repo_dir(tmp_path: Path) -> Path:
    root = tmp_path / "repo"
    (root / "src").mkdir(parents=True)
    (root / "package.json").write_text('{"name": "demo"}', encoding="utf-8")
    (root / "src" / "index.ts").write_text(
        "export const answer: number = 42;\n" * 10, encoding="utf-8"
    )
    (root / "README.md").write_text("# Demo project\n", encoding="utf-8")
    # Skipped directory must not appear in the tree or key files.
    (root / "node_modules").mkdir()
    (root / "node_modules" / "dep.js").write_text("module.exports = 1;\n", encoding="utf-8")
    # Binary file is listed but never selected as a key file.
    (root / "logo.png").write_bytes(b"\x89PNG\r\n\x1a\nnot-really")
    return root


def test_ingest_directory_builds_tree_and_key_files(tmp_path):
    root = make_repo_dir(tmp_path)
    result = ingest_repository(root)

    assert result.source_type == "directory"
    paths = [e.path for e in result.file_tree]
    assert "package.json" in paths
    assert "src/index.ts" in paths
    assert not any(p.startswith("node_modules") for p in paths)

    key_paths = [k.path for k in result.key_files]
    assert "package.json" in key_paths  # config files are prioritized
    assert "logo.png" not in key_paths  # binary never selected
    assert not any("node_modules" in p for p in key_paths)
    assert result.total_files >= 3


def test_ingest_directory_missing_path_raises(tmp_path):
    with pytest.raises(RepoIngestUnsupportedSource):
        ingest_repository(tmp_path / "does-not-exist")


def test_ingest_non_zip_file_raises(tmp_path):
    plain = tmp_path / "notes.txt"
    plain.write_text("hello", encoding="utf-8")
    with pytest.raises(RepoIngestUnsupportedSource):
        ingest_repository(plain)


def test_ingest_invalid_zip_raises(tmp_path):
    bad = tmp_path / "broken.zip"
    bad.write_bytes(b"PK\x03\x04 this is not a real archive")
    with pytest.raises(RepoIngestInvalidZip):
        ingest_repository(bad)


def test_ingest_zip_walks_members_and_skips_dirs(tmp_path):
    zip_path = tmp_path / "repo.zip"
    with zipfile.ZipFile(zip_path, "w") as archive:
        archive.writestr("package.json", '{"name": "zipped"}')
        archive.writestr("src/app.py", "def main():\n    return 1\n")
        archive.writestr("node_modules/dep/index.js", "module.exports = 1;")
        archive.writestr("assets/logo.png", b"\x89PNG\r\n\x1a\n")

    result = ingest_repository(zip_path)
    assert result.source_type == "zip"

    paths = [e.path for e in result.file_tree]
    assert "package.json" in paths
    assert not any(p.startswith("node_modules") for p in paths)

    key_paths = [k.path for k in result.key_files]
    assert "package.json" in key_paths
    assert not any("node_modules" in p for p in key_paths)
    assert "assets/logo.png" not in key_paths


def test_ingest_zip_enforces_total_size_cap(tmp_path, monkeypatch):
    from app.parsers import repo_ingest

    # Shrink the decompressed budget so the test stays fast.
    monkeypatch.setattr(repo_ingest, "MAX_ZIP_TOTAL_BYTES", 100)

    zip_path = tmp_path / "big.zip"
    with zipfile.ZipFile(zip_path, "w") as archive:
        archive.writestr("big.txt", "x" * 500)

    with pytest.raises(RepoIngestTooLarge):
        ingest_repository(zip_path)


def test_key_file_content_is_bounded(tmp_path, monkeypatch):
    from app.parsers import repo_ingest

    monkeypatch.setattr(repo_ingest, "MAX_KEY_FILE_SIZE_BYTES", 50)
    root = tmp_path / "repo"
    root.mkdir()
    (root / "main.py").write_text("print('x')\n" * 100, encoding="utf-8")

    result = ingest_repository(root)
    for key_file in result.key_files:
        assert len(key_file.content) <= 50
