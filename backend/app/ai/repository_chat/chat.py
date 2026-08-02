from typing import NamedTuple

from app.ai.client import openrouter_client
from app.ai.prompts.repository_chat_prompt import (
    REPOSITORY_CHAT_SYSTEM_PROMPT,
    build_chat_user_prompt,
)
from app.ai.repository_chat.embeddings import embed_query
from app.ai.repository_chat.vector_store import query, get_collection_name


class ChatResult(NamedTuple):
    answer: str
    cited_files: list[str]


async def run_repository_chat(
    user_id: int,
    analysis_id: int,
    question: str,
    persist_directory: str | None = None,
    k: int = 5,
) -> ChatResult:
    collection_name = get_collection_name(user_id, analysis_id)
    query_vector = embed_query(question)
    results = query(collection_name, query_vector, k=k, persist_directory=persist_directory)

    if not results:
        return ChatResult(
            answer="I don't have enough context to answer that.",
            cited_files=[],
        )

    chunks = [r["document"] for r in results]
    cited_files: list[str] = []
    for r in results:
        fp = r.get("metadata", {}).get("file_path")
        if fp and fp not in cited_files:
            cited_files.append(fp)

    user_prompt = build_chat_user_prompt(question, chunks)

    try:
        raw_answer = await openrouter_client.chat(
            messages=[
                {"role": "system", "content": REPOSITORY_CHAT_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ]
        )
    except Exception as exc:
        raise RuntimeError(
            f"LLM call failed for model '{openrouter_client.model}': {exc}"
        ) from exc

    if raw_answer.strip() == "I don't have enough context to answer that.":
        return ChatResult(answer=raw_answer, cited_files=[])

    return ChatResult(answer=raw_answer, cited_files=cited_files)
