"""Tests for the ChromaDB vector store, incl. the empty-collection guard."""

from pathlib import Path

import numpy as np
import pytest

from app.ai.repository_chat.vector_store import (
    add_chunks,
    get_chroma_client,
    get_collection_name,
    get_or_create_collection,
    query,
)
from app.ai.repository_chat.chunker import CodeChunk


@pytest.fixture()
def store_dir(tmp_path):
    return tmp_path / "chroma"


def test_collection_name_is_user_and_analysis_scoped():
    assert get_collection_name(3, 17) == "repo_3_17"
    # Isolation: different users must never share a collection.
    assert get_collection_name(3, 17) != get_collection_name(4, 17)


def test_query_on_empty_collection_returns_no_hits(store_dir):
    """Regression: this used to raise because n_results was clamped to 0."""
    collection = get_or_create_collection("repo_1_1", store_dir)
    assert collection.count() == 0

    results = query("repo_1_1", np.zeros(384, dtype=np.float32), persist_directory=store_dir)
    assert results == []


def test_query_on_missing_collection_returns_no_hits(store_dir):
    results = query("repo_9_9", np.zeros(384, dtype=np.float32), persist_directory=store_dir)
    assert results == []


def test_add_then_query_roundtrip(store_dir):
    chunks = [
        CodeChunk(file_path="src/auth.py", chunk_index=0, content="def login(user): ..."),
        CodeChunk(file_path="src/db.py", chunk_index=0, content="engine = create_engine()"),
    ]
    rng = np.random.default_rng(42)
    embeddings = rng.random((2, 384), dtype=np.float32)

    add_chunks("repo_2_2", chunks, embeddings, persist_directory=store_dir)

    hits = query("repo_2_2", embeddings[0], k=2, persist_directory=store_dir)
    assert len(hits) == 2
    # The exact vector should rank first (cosine distance ~0).
    assert hits[0]["metadata"]["file_path"] == "src/auth.py"
    assert hits[0]["similarity"] > 0.99
    assert "distance" in hits[0] and "document" in hits[0]


def test_chroma_client_creates_directory(store_dir):
    client = get_chroma_client(store_dir)
    assert client is not None
    assert Path(store_dir).is_dir()
