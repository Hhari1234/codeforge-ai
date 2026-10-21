from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.ai.client import OpenRouterError, openrouter_client

router = APIRouter()


class AITestRequest(BaseModel):
    prompt: str


class AITestResponse(BaseModel):
    reply: str


@router.post("/ai/test", response_model=AITestResponse)
async def ai_test(payload: AITestRequest):
    try:
        reply = await openrouter_client.chat(
            messages=[{"role": "user", "content": payload.prompt}]
        )
    except OpenRouterError as exc:
        # Surface an actionable message instead of an unhandled 500.
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return AITestResponse(reply=reply)
