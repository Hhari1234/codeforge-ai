REPOSITORY_CHAT_SYSTEM_PROMPT = """You are a helpful assistant that answers questions about a code repository. You are given a user's question and a set of code chunks retrieved from the repository via semantic search. These chunks are the ONLY source of information you should use to formulate your answer.

STRICT RULES:
1. Answer ONLY based on the provided code chunks. Do NOT use any outside knowledge about the repository.
2. If the provided chunks do not contain enough information to answer the question, reply EXACTLY with: "I don't have enough context to answer that." Do not add any extra text, explanation, or apology.
3. When you can answer, cite the specific file paths you drew from by mentioning them explicitly in your answer (e.g., "According to src/main.py, ...").
4. Do NOT make up file paths, function names, or behavior that is not supported by the provided chunks.
5. Keep your answer concise and directly relevant to the question asked."""


# How many prior conversation turns are fed back into the prompt so follow-up
# questions ("what about the second one?") resolve against real context.
MAX_HISTORY_TURNS = 8
# Bound on characters kept per history message so the prompt stays small.
MAX_HISTORY_CHARS = 1000


def _format_history(
    history: list[dict] | None, current_question: str
) -> str:
    """Render prior conversation turns (newest last, excluding the current ask)."""
    if not history:
        return ""
    turns = []
    for message in history[-MAX_HISTORY_TURNS:]:
        role = message.get("role", "")
        content = (message.get("content") or "").strip()
        if not content or role not in ("user", "assistant"):
            continue
        if content == current_question and role == "user":
            # Skip the current question — it is rendered separately.
            continue
        if len(content) > MAX_HISTORY_CHARS:
            content = content[:MAX_HISTORY_CHARS] + "… (truncated)"
        label = "User" if role == "user" else "Assistant"
        turns.append(f"{label}: {content}")
    if not turns:
        return ""
    return (
        "Conversation so far (for follow-up context; do not re-answer prior "
        "questions unless asked):\n"
        + "\n".join(turns)
        + "\n\n"
    )


def build_chat_user_prompt(
    question: str, chunks: list[str], history: list[dict] | None = None
) -> str:
    """Build the user-side prompt from the question, history and chunks.

    Args:
        question: The user's question string.
        chunks: List of chunk text strings retrieved from the vector store.
        history: Optional prior conversation turns as ``{"role", "content"}``
            dicts (oldest first) so follow-up questions keep their context.

    Returns:
        A single prompt string containing the conversation history, the
        question and all retrieved chunks.
    """
    history_section = _format_history(history, question)

    if not chunks:
        return (
            f"{history_section}Question: {question}\n\n"
            "No relevant code chunks were found in the repository. "
            "I don't have enough context to answer that."
        )

    chunk_sections = []
    for i, chunk_text in enumerate(chunks, start=1):
        chunk_sections.append(f"--- Chunk {i} ---\n{chunk_text}")

    return (
        f"{history_section}Question: {question}\n\n"
        "Retrieved code chunks from the repository:\n\n"
        + "\n\n".join(chunk_sections)
        + "\n\nAnswer the question using ONLY the information in these chunks."
    )
