from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Database
    DATABASE_URL: str = "sqlite:///./codeforge.db"

    # OpenRouter
    OPENROUTER_API_KEY: str
    OPENROUTER_MODEL: str = "anthropic/claude-3.5-haiku"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    # CORS
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    FRONTEND_URL: str = "http://localhost:5173"

    # Chroma Vector Store
    CHROMA_DATA_DIR: str = "chroma_data"

    # When True, the app runs Base.metadata.create_all() at startup.
    # Development convenience only — production uses Alembic migrations.
    AUTO_CREATE_TABLES: bool = True

    # SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
