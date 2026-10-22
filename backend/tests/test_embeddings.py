"""Regression tests for the hashing-vectorizer embeddings (Repository Chat).

Replaces sentence-transformers, whose torch-based model load OOM-killed the
production instance during chat index builds (measured 25 MB -> 511 MB RSS).
These tests lock the properties we rely on: determinism, normalized fixed-size
vectors, and identifier-level retrieval that keeps the defining chunk on top.
"""

import inspect

import numpy as np

from app.ai.repository_chat.chunker import CodeChunk
from app.ai.repository_chat.embeddings import (
    EMBEDDING_DIM,
    compute_cosine_similarity,
    embed_chunks,
    embed_query,
)


def _chunks():
    return [
        CodeChunk(
            file_path="src/exc.py",
            chunk_index=0,
            content=(
                "class SigningError(Exception):\n"
                "    pass\n\n"
                "class BadSignature(SigningError):\n"
                "    '''Raised when a signature does not match.'''\n"
                "    def __init__(self, message='signature does not match'):\n"
                "        super().__init__(message)\n"
            ),
        ),
        CodeChunk(
            file_path="src/config.py",
            chunk_index=0,
            content=(
                "DEBUG = False\n"
                "ALLOWED_HOSTS = ['example.com']\n"
                "def load_settings(path):\n"
                "    with open(path) as f:\n"
                "        return dict(line.split('=', 1) for line in f)\n"
            ),
        ),
        CodeChunk(
            file_path="docs/intro.rst",
            chunk_index=0,
            content=(
                "Introduction\n============\n\n"
                "This library serializes and signs data. Install it with pip\n"
                "and read the tutorial to get started quickly.\n"
            ),
        ),
    ]


def test_empty_chunk_list_returns_empty_matrix():
    emb = embed_chunks([])
    assert emb.shape == (0, EMBEDDING_DIM)


def test_shapes_and_determinism():
    chunks = _chunks()
    a = embed_chunks(chunks)
    b = embed_chunks(chunks)
    assert a.shape == (3, EMBEDDING_DIM)
    assert a.dtype == np.float32
    np.testing.assert_array_equal(a, b)

    qa = embed_query("class BadSignature")
    qb = embed_query("class BadSignature")
    assert qa.shape == (EMBEDDING_DIM,)
    np.testing.assert_array_equal(qa, qb)


def test_vectors_are_l2_normalized():
    chunks = _chunks()
    emb = embed_chunks(chunks)
    norms = np.linalg.norm(emb, axis=1)
    np.testing.assert_allclose(norms, np.ones(3), rtol=1e-5)
    qn = np.linalg.norm(embed_query("signature check"))
    assert abs(qn - 1.0) < 1e-5


def test_identifier_query_ranks_defining_chunk_first():
    """'BadSignature' must retrieve the chunk that defines the class ahead of
    unrelated config/docs chunks — this is what makes chat answers grounded."""
    chunks = _chunks()
    emb = embed_chunks(chunks)
    q = embed_query(
        "In which file and class is BadSignature defined, and what does it inherit from?"
    )
    sims = emb @ q
    best = int(np.argmax(sims))
    assert chunks[best].file_path == "src/exc.py"


def test_compute_cosine_similarity_unchanged():
    a = np.array([1.0, 0.0])
    b = np.array([0.0, 1.0])
    assert compute_cosine_similarity(a, b) == 0.0
    assert compute_cosine_similarity(a, a) == 1.0
    assert compute_cosine_similarity(np.zeros(2), b) == 0.0


def test_chat_default_k_is_eight():
    """Recall evidence: ground-truth file in top-8 for 5/5 benchmark questions
    (top-5 covered only 3/5). Keep the default from regressing to 5."""
    from app.ai.repository_chat.chat import run_repository_chat

    assert inspect.signature(run_repository_chat).parameters["k"].default == 8
