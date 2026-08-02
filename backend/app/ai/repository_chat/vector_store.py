"""Vector store module for Repository Chat (Module 6).

Manages persistent ChromaDB vector collections namespaced by user and analysis ID.
Stores code chunk embeddings and metadata for fast similarity retrieval.
"""

from pathlib import Path
from typing import Sequence, Any
import numpy as np
import chromadb
from chromadb.config import Settings as ChromaSettings

from app.core.config import settings
from app.ai.repository_chat.chunker import CodeChunk


def get_chroma_client(persist_directory: str | Path | None = None) -> chromadb.PersistentClient:
    """Get a persistent ChromaDB client pointing to the configured storage directory."""
    if persist_directory is None:
        persist_directory = Path(settings.CHROMA_DATA_DIR)
    else:
        persist_directory = Path(persist_directory)

    persist_directory.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=str(persist_directory))


def get_collection_name(user_id: int | str, analysis_id: int | str) -> str:
    """Construct a namespaced ChromaDB collection name for a user and analysis."""
    return f"repo_{user_id}_{analysis_id}"


def get_or_create_collection(
    collection_name: str,
    persist_directory: str | Path | None = None,
) -> chromadb.Collection:
    """Get or create a ChromaDB collection with cosine distance metric."""
    client = get_chroma_client(persist_directory)
    return client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )


def add_chunks(
    collection_name: str,
    chunks: Sequence[CodeChunk],
    embeddings: np.ndarray,
    persist_directory: str | Path | None = None,
) -> None:
    """Add code chunks and their pre-computed embeddings to a ChromaDB collection.

    Args:
        collection_name: Target collection name.
        chunks: Sequence of CodeChunk instances.
        embeddings: 2D numpy array or list of vector embeddings matching chunks order.
        persist_directory: Optional persistent directory override.
    """
    if not chunks:
        return

    collection = get_or_create_collection(collection_name, persist_directory)

    ids = [f"{c.file_path}::{c.chunk_index}" for c in chunks]
    documents = [c.content for c in chunks]
    metadatas = [
        {"file_path": c.file_path, "chunk_index": c.chunk_index}
        for c in chunks
    ]

    # Convert embeddings to list of lists if numpy array
    if isinstance(embeddings, np.ndarray):
        embeddings_list = embeddings.tolist()
    else:
        embeddings_list = list(embeddings)

    collection.upsert(
        ids=ids,
        documents=documents,
        embeddings=embeddings_list,
        metadatas=metadatas,
    )


def query(
    collection_name: str,
    query_embedding: np.ndarray | list[float],
    k: int = 5,
    persist_directory: str | Path | None = None,
) -> list[dict[str, Any]]:
    """Query ChromaDB collection for top-k similar chunks given a query embedding.

    Args:
        collection_name: Collection name to query.
        query_embedding: 1D numpy array or list of floats representing query embedding.
        k: Number of top results to return.
        persist_directory: Optional persistent directory override.

    Returns:
        List of dicts containing id, document, metadata, distance, and similarity score.
    """
    collection = get_or_create_collection(collection_name, persist_directory)

    if isinstance(query_embedding, np.ndarray):
        query_vec = query_embedding.tolist()
    else:
        query_vec = list(query_embedding)

    results = collection.query(
        query_embeddings=[query_vec],
        n_results=min(k, collection.count()),
        include=["documents", "metadatas", "distances"],
    )

    formatted_results: list[dict[str, Any]] = []

    if not results or not results.get("ids") or not results["ids"][0]:
        return formatted_results

    ids = results["ids"][0]
    documents = results["documents"][0] if results.get("documents") else []
    metadatas = results["metadatas"][0] if results.get("metadatas") else []
    distances = results["distances"][0] if results.get("distances") else []

    for chunk_id, doc, meta, dist in zip(ids, documents, metadatas, distances):
        sim_score = 1.0 - dist if dist is not None else 0.0
        formatted_results.append({
            "id": chunk_id,
            "document": doc,
            "metadata": meta,
            "distance": dist,
            "similarity": sim_score,
        })

    return formatted_results


def delete_collection(
    collection_name: str,
    persist_directory: str | Path | None = None,
) -> bool:
    """Delete a ChromaDB collection by name.

    Returns:
        True if successfully deleted, False if collection did not exist.
    """
    client = get_chroma_client(persist_directory)
    try:
        client.delete_collection(collection_name)
        return True
    except Exception:
        return False
