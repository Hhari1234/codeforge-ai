from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import relationship

from app.database.session import Base


class RepositoryChatMessage(Base):
    __tablename__ = "repository_chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    analysis_id = Column(Integer, ForeignKey("repository_analyses.id"), nullable=False, index=True)
    role = Column(String, nullable=False)
    content = Column(String, nullable=False)
    cited_files = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", backref="repository_chat_messages")
    analysis = relationship("RepositoryAnalysis", backref="chat_messages")
