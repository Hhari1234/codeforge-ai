"""Code chunking module for Repository Chat (Module 6).

Splits source code files from repository ingestion into overlapping chunks
for embedding and vector retrieval. Uses a character-based token heuristic
(~4 chars per token) and line-level boundaries to preserve code structure.
"""

from dataclasses import dataclass
from typing import Sequence
from app.parsers.repo_ingest import KeyFile, RepoIngestResult

# Token approximation heuristic: ~4 characters per token in standard source code/English.
# 800 tokens ≈ 3200 characters target chunk size.
# 100 tokens ≈ 400 characters overlap between consecutive chunks.
CHARS_PER_TOKEN = 4
TARGET_CHUNK_TOKENS = 800
OVERLAP_TOKENS = 100

TARGET_CHUNK_CHARS = TARGET_CHUNK_TOKENS * CHARS_PER_TOKEN  # 3200 characters
OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN            # 400 characters
MIN_FILE_CHARS = 50                                          # Skip files smaller than ~50 chars


@dataclass
class CodeChunk:
    """Represents a single text chunk from a repository file."""
    file_path: str
    chunk_index: int  # 0-based index per file
    content: str


def chunk_key_files(key_files: Sequence[KeyFile]) -> list[CodeChunk]:
    """Chunk a list of KeyFile objects into overlapping CodeChunks.

    Args:
        key_files: Sequence of KeyFile dataclass objects from repo ingestion.

    Returns:
        Flat list of CodeChunk instances tagged with file_path, chunk_index, and content.
    """
    all_chunks: list[CodeChunk] = []

    for kf in key_files:
        content = kf.content or ""
        if len(content.strip()) < MIN_FILE_CHARS:
            continue

        file_chunks = chunk_text(kf.path, content)
        all_chunks.extend(file_chunks)

    return all_chunks


def chunk_repo_ingest_result(ingest_result: RepoIngestResult) -> list[CodeChunk]:
    """Convenience helper to chunk all key_files in a RepoIngestResult."""
    return chunk_key_files(ingest_result.key_files)


def chunk_text(file_path: str, text: str) -> list[CodeChunk]:
    """Split a single file's text content into overlapping CodeChunks on line boundaries.

    Args:
        file_path: Path of the file.
        text: Raw text content of the file.

    Returns:
        List of CodeChunk instances for this file.
    """
    if len(text.strip()) < MIN_FILE_CHARS:
        return []

    lines = text.splitlines(keepends=True)
    if not lines:
        return []

    # If entire file content fits within single chunk target size, don't split
    if len(text) <= TARGET_CHUNK_CHARS:
        return [CodeChunk(file_path=file_path, chunk_index=0, content=text)]

    chunks: list[CodeChunk] = []
    chunk_idx = 0
    start_line_idx = 0
    num_lines = len(lines)

    while start_line_idx < num_lines:
        curr_chars = 0
        end_line_idx = start_line_idx

        # Accumulate lines up to TARGET_CHUNK_CHARS
        while end_line_idx < num_lines:
            line_len = len(lines[end_line_idx])
            # If adding line exceeds target size and we already have at least 1 line in chunk, break
            if curr_chars + line_len > TARGET_CHUNK_CHARS and end_line_idx > start_line_idx:
                break
            curr_chars += line_len
            end_line_idx += 1

        chunk_content = "".join(lines[start_line_idx:end_line_idx])
        chunks.append(CodeChunk(file_path=file_path, chunk_index=chunk_idx, content=chunk_content))
        chunk_idx += 1

        # Reached end of lines
        if end_line_idx >= num_lines:
            break

        # Calculate line index for next chunk start by stepping backwards to obtain ~OVERLAP_CHARS
        overlap_accum = 0
        next_start = end_line_idx - 1

        while next_start > start_line_idx:
            overlap_accum += len(lines[next_start])
            if overlap_accum >= OVERLAP_CHARS:
                break
            next_start -= 1

        # Safety check: ensure forward progress
        if next_start <= start_line_idx:
            next_start = end_line_idx

        start_line_idx = next_start

    return chunks
