"""Repository Chat LLM engine.

Retrieval (embedding + vector query) is CPU/IO-bound and would otherwise block
the shared event loop, so it runs in a worker thread via ``asyncio.to_thread``.
Prior conversation turns are included in the prompt so follow-up questions keep
their context.
"""

import asyncio
from typing import NamedTuple

from app.ai.client import OpenRouterError, openrouter_client
from app.ai.llm_utils import map_openrouter_error
from app.ai.prompts.repository_chat_prompt import (
    REPOSITORY_CHAT_SYSTEM_PROMPT,
    build_chat_user_prompt,
)
from app.ai.repository_chat.embeddings import embed_query
from app.ai.repository_chat.vector_store import query, get_collection_name

NO_CONTEXT_ANSWER = "I don't have enough context to answer that."


class ChatResult(NamedTuple):
    answer: str
    cited_files: list[str]


def _retrieve(
    collection_name: str, question: str, k: int, persist_directory: str | None
) -> list[dict]:
    """Blocking retrieval: embed the query and search the vector store."""
    query_vector = embed_query(question)
    return query(
        collection_name, query_vector, k=k, persist_directory=persist_directory
    )


async def run_repository_chat(
    user_id: int,
    analysis_id: int,
    question: str,
    history: list[dict] | None = None,
    persist_directory: str | None = None,
    k: int = 5,
) -> ChatResult:
    collection_name = get_collection_name(user_id, analysis_id)

    results = await asyncio.to_thread(
        _retrieve, collection_name, question, k, persist_directory
    )

    if not results:
        return ChatResult(
            answer=(
                "I couldn't find any indexed files for this repository, so I "
                "don't have context to answer that. Re-run the repository "
                "analysis and try again."
            ),
            cited_files=[],
        )

    chunks = [r["document"] for r in results]
    cited_files: list[str] = []
    for r in results:
        fp = r.get("metadata", {}).get("file_path")
        if fp and fp not in cited_files:
            cited_files.append(fp)

    user_prompt = build_chat_user_prompt(question, chunks, history)

    try:
        raw_answer = await openrouter_client.chat(
            messages=[
                {"role": "system", "content": REPOSITORY_CHAT_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ]
        )
    except OpenRouterError as exc:
        raise map_openrouter_error(exc, RuntimeError) from exc

    if raw_answer.strip() == NO_CONTEXT_ANSWER:
        return ChatResult(answer=raw_answer, cited_files=[])

    return ChatResult(answer=raw_answer, cited_files=cited_files)
