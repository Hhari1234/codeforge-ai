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
        _ensure_collection_exists(current_user.id, analysis_id, analysis.repo_source)
    except (GithubCloneInvalidUrl, GithubCloneFailed) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RepoIngestError as exc:
        raise HTTPException(status_code=400, detail=f"Could not ingest repository: {exc}") from exc
    except RepoIngestUnsupportedSource as exc:
        raise HTTPException(
            status_code=422,
            detail=(
                "This repository was uploaded as a ZIP and the source file is no "
                "longer available. Chat is currently supported only for GitHub-imported "
                "repositories or local directories."
            ),
        ) from exc
    except Exception as exc:
        logger.exception("Failed to build vector store for chat")
        raise HTTPException(status_code=500, detail=f"Failed to prepare repository for chat: {exc}") from exc

    user_message = payload.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="message must not be empty.")

    save_chat_message(db, current_user.id, analysis_id, "user", user_message)

    try:
        result = await run_repository_chat(
            user_id=current_user.id,
            analysis_id=analysis_id,
            question=user_message,
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
