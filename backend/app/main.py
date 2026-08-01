from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import ai_test, auth, health
from app.core.config import settings
from app.database.session import Base, engine
from app.models import user  # noqa: F401 - ensures model is registered before create_all

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CodeForge AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(ai_test.router, prefix="/api", tags=["AI Test"])


@app.get("/")
def root():
    return {"message": "Welcome to CodeForge AI API"}