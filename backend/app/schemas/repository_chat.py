from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChatMessageRequest(BaseModel):
    message: str


class ChatMessageResponse(BaseModel):
    answer: str
    cited_files: list[str]


class ChatHistoryItem(BaseModel):
    id: int
    role: str
    content: str
    cited_files: list[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
