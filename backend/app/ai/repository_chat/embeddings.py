"""Embeddings module for Repository Chat (Module 6).

Generates vector embeddings for code chunks and user query strings using
the 'all-MiniLM-L6-v2' model from sentence-transformers.
"""

from typing import Sequence
import numpy as np
from sentence_transformers import SentenceTransformer

from app.ai.repository_chat.chunker import CodeChunk

MODEL_NAME = "all-MiniLM-L6-v2"

# Module-level cache for the sentence-transformer model
_model_instance: SentenceTransformer | None = None


def get_embedding_model() -> SentenceTransformer:
    """Load or retrieve the cached SentenceTransformer model instance."""
    global _model_instance
    if _model_instance is None:
        _model_instance = SentenceTransformer(MODEL_NAME)
    return _model_instance


def embed_chunks(chunks: Sequence[CodeChunk]) -> np.ndarray:
    """Generate embeddings for a list of CodeChunk objects.

    Args:
        chunks: Sequence of CodeChunk instances.

    Returns:
        2D numpy array of shape (len(chunks), embedding_dim) where index i
        corresponds to chunks[i].
    """
    if not chunks:
        return np.empty((0, 384), dtype=np.float32)

    model = get_embedding_model()
    texts = [chunk.content for chunk in chunks]
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    return embeddings


def embed_query(query: str) -> np.ndarray:
    """Generate a vector embedding for a single query string.

    Args:
        query: User input or question string.

    Returns:
        1D numpy array representing the query embedding.
    """
    model = get_embedding_model()
    embedding = model.encode(query, convert_to_numpy=True, show_progress_bar=False)
    return embedding


def compute_cosine_similarity(vector1: np.ndarray, vector2: np.ndarray) -> float:
    """Compute cosine similarity between two 1D vectors."""
    norm1 = np.linalg.norm(vector1)
    norm2 = np.linalg.norm(vector2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(vector1, vector2) / (norm1 * norm2))
