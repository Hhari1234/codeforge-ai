"""Embeddings module for Repository Chat (Module 6).

Generates vector embeddings for code chunks and user questions.

History: this module previously used sentence-transformers
('all-MiniLM-L6-v2' via torch). Production evidence (2026-10-22) showed that
loading torch + the model pushed the Render free instance (512 MB) over its
memory limit during the first chat index build: the worker was OOM-killed
mid-request (empty HTTP 502 with no app JSON, followed by a 503 restart).
Measured locally: 25 MB -> 511 MB RSS just for embed_chunks.

The replacement is a stateless sklearn ``HashingVectorizer`` over character
n-grams: no model download, no torch, ~10 MB of memory, deterministic across
processes (fixed hash seed), and it runs in well under a second for a bounded
repo. For code search it is a strong fit because queries and chunks share exact
identifier substrings (class/function names, file names), which char n-grams
capture directly. The public functions keep their previous names/signatures so
routes, the vector store and the chat engine are unchanged.
"""

from typing import Sequence

import numpy as np
from sklearn.feature_extraction.text import HashingVectorizer

from app.ai.repository_chat.chunker import CodeChunk

# 384-dim keeps parity with the previous model's dimensionality; ChromaDB does
# not care about the exact size, but keeping it stable avoids surprises.
EMBEDDING_DIM = 384

# Stateless singleton: HashingVectorizer has no fit state, so one shared
# instance is safe across threads and processes and always produces identical
# vectors for identical input.
_vectorizer = HashingVectorizer(
    analyzer="char_wb",
    ngram_range=(3, 5),
    n_features=EMBEDDING_DIM,
    alternate_sign=False,
    norm="l2",
    dtype=np.float32,
)


def embed_chunks(chunks: Sequence[CodeChunk]) -> np.ndarray:
    """Generate embeddings for a list of CodeChunk objects.

    Args:
        chunks: Sequence of CodeChunk dataclass instances.

    Returns:
        2D numpy array of shape (len(chunks), EMBEDDING_DIM) where index i
        corresponds to chunks[i].
    """
    if not chunks:
        return np.empty((0, EMBEDDING_DIM), dtype=np.float32)

    texts = [chunk.content for chunk in chunks]
    return _vectorizer.transform(texts).astype(np.float32).toarray()


def embed_query(query: str) -> np.ndarray:
    """Generate a vector embedding for a single query string.

    Args:
        query: User input or question string.

    Returns:
        1D numpy array representing the query embedding.
    """
    return _vectorizer.transform([query]).astype(np.float32).toarray()[0]


def compute_cosine_similarity(vector1: np.ndarray, vector2: np.ndarray) -> float:
    """Compute cosine similarity between two 1D numpy arrays."""
    norm1 = np.linalg.norm(vector1)
    norm2 = np.linalg.norm(vector2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(vector1, vector2) / (norm1 * norm2))
