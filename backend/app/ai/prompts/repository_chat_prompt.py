REPOSITORY_CHAT_SYSTEM_PROMPT = """You are a helpful assistant that answers questions about a code repository. You are given a user's question and a set of code chunks retrieved from the repository via semantic search. These chunks are the ONLY source of information you should use to formulate your answer.

STRICT RULES:
1. Answer ONLY based on the provided code chunks. Do NOT use any outside knowledge about the repository.
2. If the provided chunks do not contain enough information to answer the question, reply EXACTLY with: "I don't have enough context to answer that." Do not add any extra text, explanation, or apology.
3. When you can answer, cite the specific file paths you drew from by mentioning them explicitly in your answer (e.g., "According to src/main.py, ...").
4. Do NOT make up file paths, function names, or behavior that is not supported by the provided chunks.
5. Keep your answer concise and directly relevant to the question asked."""


def build_chat_user_prompt(question: str, chunks: list[str]) -> str:
    """Build the user-side prompt from the question and retrieved chunks.

    Args:
        question: The user's question string.
        chunks: List of chunk text strings retrieved from the vector store.

    Returns:
        A single prompt string containing the question and all retrieved chunks.
    """
    if not chunks:
        return (
            f"Question: {question}\n\n"
            "No relevant code chunks were found in the repository. "
            "I don't have enough context to answer that."
        )

    chunk_sections = []
    for i, chunk_text in enumerate(chunks, start=1):
        chunk_sections.append(f"--- Chunk {i} ---\n{chunk_text}")

    return (
        f"Question: {question}\n\n"
        "Retrieved code chunks from the repository:\n\n"
        + "\n\n".join(chunk_sections)
        + "\n\nAnswer the question using ONLY the information in these chunks."
    )
