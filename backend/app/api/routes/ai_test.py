from fastapi import APIRouter
from pydantic import BaseModel

from app.ai.client import openrouter_client

router = APIRouter()


class AITestRequest(BaseModel):
    prompt: str


class AITestResponse(BaseModel):
    reply: str


@router.post("/ai/test", response_model=AITestResponse)
async def ai_test(payload: AITestRequest):
    reply = await openrouter_client.chat(
        messages=[{"role": "user", "content": payload.prompt}]
    )
    return AITestResponse(reply=reply)
