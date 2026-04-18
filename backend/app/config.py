"""
Application settings loaded from environment variables.
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost:3306/book_intelligence"

    # AI Provider: "anthropic" | "openai" | "lmstudio" | "gemini"
    AI_PROVIDER: str = "anthropic"
    ANTHROPIC_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None

    # LM Studio local endpoint
    LM_STUDIO_URL: str = "http://localhost:1234/v1"
    LM_STUDIO_MODEL: str = "local-model"

    # ChromaDB
    CHROMA_PERSIST_DIR: str = "./chroma_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # App
    SECRET_KEY: str = "change-me-in-production"
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
