import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    ai_test,
    api_documentation,
    auth,
    bug_debug,
    code_explainer,
    code_review,
    health,
    project_generator,
    readme_generator,
    repository_analyzer,
    repository_chat,
)
from app.core.config import settings
from app.database.session import Base, engine
from app.models import (  # noqa: F401 - ensures models are registered before create_all
    api_documentation as api_documentation_model,
    bug_debug as bug_debug_model,
    code_explanation,
    code_review as code_review_model,
    project_generation,
    readme_generation,
    repository_analysis,
    repository_chat_message,
    user,
)

logging.basicConfig(level=logging.INFO)

# Development convenience: auto-create tables. In production set
# AUTO_CREATE_TABLES=false and manage schema via Alembic migrations.
if settings.AUTO_CREATE_TABLES:
    Base.metadata.create_all(bind=engine)

app = FastAPI(title="CodeForge AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_ORIGIN,
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(ai_test.router, prefix="/api", tags=["AI Test"])
app.include_router(
    project_generator.router,
    prefix="/api/generations",
    tags=["Project Generator"],
)
app.include_router(
    readme_generator.router,
    prefix="/api/readmes",
    tags=["README Generator"],
)
app.include_router(
    code_explainer.router,
    prefix="/api",
    tags=["Code Explainer"],
)
app.include_router(
    repository_analyzer.router,
    prefix="/api/repositories",
    tags=["Repository Analyzer"],
)
app.include_router(
    repository_chat.router,
    prefix="/api/repositories",
    tags=["Repository Chat"],
)
app.include_router(
    code_review.router,
    prefix="/api/reviews",
    tags=["Code Reviewer"],
)
app.include_router(
    bug_debug.router,
    prefix="/api/debug",
    tags=["Bug Debugger"],
)
app.include_router(
    api_documentation.router,
    prefix="/api/documentation",
    tags=["API Documentation Generator"],
)


@app.get("/")
def root():
    return {"message": "Welcome to CodeForge AI API"}