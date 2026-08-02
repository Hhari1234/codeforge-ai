from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    ai_test,
    auth,
    code_explainer,
    health,
    project_generator,
    readme_generator,
    repository_analyzer,
)
from app.core.config import settings
from app.database.session import Base, engine
from app.models import (  # noqa: F401 - ensures models are registered before create_all
    code_explanation,
    project_generation,
    readme_generation,
    repository_analysis,
    user,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CodeForge AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_ORIGIN,
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
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


@app.get("/")
def root():
    return {"message": "Welcome to CodeForge AI API"}