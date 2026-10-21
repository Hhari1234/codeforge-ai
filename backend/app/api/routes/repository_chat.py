import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.ai.repository_chat.chat import run_repository_chat
from app.ai.repository_chat.chunker import chunk_key_files
from app.ai.repository_chat.embeddings import embed_chunks
from app.ai.repository_chat.vector_store import (
    add_chunks,
    get_chroma_client,
    get_collection_name,
)
from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.repository_analysis import RepositoryAnalysis
from app.models.user import User
from app.parsers.github_clone import (
    GithubCloneFailed,
    GithubCloneInvalidUrl,
    clone_github_repo,
)
from app.parsers.repo_ingest import (
    RepoIngestError,
    RepoIngestResult,
    RepoIngestUnsupportedSource,
    ingest_repository,
)
from app.schemas.repository_chat import ChatHistoryItem, ChatMessageRequest, ChatMessageResponse
from app.services.repository_analysis_service import get_repository_analysis_by_id
from app.services.repository_chat_service import (
    list_chat_messages_for_user_and_analysis,
    save_chat_message,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# How many prior turns are fed back into the prompt for follow-up questions.
CHAT_HISTORY_TURNS = 10

# Per-collection build locks: two concurrent first messages for the same
# repository must not clone/embed the same repo twice at once.
_collection_locks: dict[str, asyncio.Lock] = {}
_collection_locks_guard = asyncio.Lock()


async def _get_collection_lock(collection_name: str) -> asyncio.Lock:
    async with _collection_locks_guard:
        lock = _collection_locks.get(collection_name)
        if lock is None:
            lock = asyncio.Lock()
            _collection_locks[collection_name] = lock
        return lock


def _is_github_source(repo_source: str) -> bool:
    return repo_source.startswith("http://") or repo_source.startswith("https://") or repo_source.startswith("github.com/")


def _ensure_collection_exists(user_id: int, analysis_id: int, repo_source: str) -> None:
    client = get_chroma_client()
    collection_name = get_collection_name(user_id, analysis_id)
    existing = [str(c) for c in client.list_collections()]
    if collection_name in existing:
        return

    logger.info("Building ChromaDB collection '%s' for analysis %s", collection_name, analysis_id)

    if _is_github_source(repo_source):
        url = repo_source
        if url.startswith("github.com/"):
            url = f"https://{url}"
        with clone_github_repo(url) as cloned:
            ingest_result = ingest_repository(cloned.path)
            _build_collection(collection_name, ingest_result)
    elif repo_source:
        ingest_result = ingest_repository(repo_source)
        _build_collection(collection_name, ingest_result)
    else:
        raise ValueError("No repository source available to build the vector store.")


def _build_collection(collection_name: str, ingest_result: RepoIngestResult) -> None:
    chunks = chunk_key_files(ingest_result.key_files)
    if not chunks:
        logger.warning("No chunks generated for collection '%s'", collection_name)
        return
    chunk_embeddings = embed_chunks(chunks)
    add_chunks(collection_name, chunks, chunk_embeddings)


async def _ensure_collection_exists_safe(
    user_id: int, analysis_id: int, repo_source: str
) -> None:
    """Build the vector index if missing — off the event loop.

    Cloning, walking the repo and embedding are all blocking (and can take
    seconds to minutes); running them inline inside an ``async def`` handler
    would stall every other request on the shared event loop.
    """
    collection_name = get_collection_name(user_id, analysis_id)
    lock = await _get_collection_lock(collection_name)
    async with lock:
        # Re-check inside the lock: another request may have just built it.
        await asyncio.to_thread(_ensure_collection_exists, user_id, analysis_id, repo_source)


def _recent_chat_history(db: Session, user_id: int, analysis_id: int) -> list[dict]:
    """Prior turns (oldest first) for follow-up context."""
    messages = list_chat_messages_for_user_and_analysis(db, user_id, analysis_id)
    return [{"role": m.role, "content": m.content} for m in messages[-CHAT_HISTORY_TURNS:]]


@router.post(
    "/{analysis_id}/chat",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def chat_with_repository(
    analysis_id: int,
    payload: ChatMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analysis = get_repository_analysis_by_id(db, current_user.id, analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Repository analysis not found")

    try:
        await _ensure_collection_exists_safe(
            current_user.id, analysis_id, analysis.repo_source
        )
    except (GithubCloneInvalidUrl, GithubCloneFailed) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RepoIngestUnsupportedSource as exc:
        # Must be caught BEFORE RepoIngestError (its base class) or this
        # branch is dead code and ZIP-imported repos get a generic 400.
        raise HTTPException(
            status_code=422,
            detail=(
                "This repository was uploaded as a ZIP and the source file is no "
                "longer available. Chat is currently supported only for GitHub-imported "
                "repositories or local directories."
            ),
        ) from exc
    except RepoIngestError as exc:
        raise HTTPException(status_code=400, detail=f"Could not ingest repository: {exc}") from exc
    except Exception as exc:
        logger.exception("Failed to build vector store for chat")
        raise HTTPException(status_code=500, detail=f"Failed to prepare repository for chat: {exc}") from exc

    user_message = payload.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="message must not be empty.")

    # Load prior turns BEFORE persisting the new user message so the prompt
    # doesn't duplicate it, then persist and answer.
    history = await asyncio.to_thread(
        _recent_chat_history, db, current_user.id, analysis_id
    )

    save_chat_message(db, current_user.id, analysis_id, "user", user_message)

    try:
        result = await run_repository_chat(
            user_id=current_user.id,
            analysis_id=analysis_id,
            question=user_message,
            history=history,
        )
    except RuntimeError as exc:
        logger.exception("Repository chat failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    assistant_answer = result.answer
    cited_files = result.cited_files

    save_chat_message(db, current_user.id, analysis_id, "assistant", assistant_answer, cited_files)

    return ChatMessageResponse(answer=assistant_answer, cited_files=cited_files)


@router.get(
    "/{analysis_id}/chat/history",
    response_model=list[ChatHistoryItem],
)
def get_chat_history(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analysis = get_repository_analysis_by_id(db, current_user.id, analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Repository analysis not found")

    messages = list_chat_messages_for_user_and_analysis(db, current_user.id, analysis_id)
    return [
        ChatHistoryItem(
            id=m.id,
            role=m.role,
            content=m.content,
            cited_files=m.cited_files or [],
            created_at=m.created_at,
        )
        for m in messages
    ]
