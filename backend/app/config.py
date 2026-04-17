"""Application configuration via environment variables."""

import os
from pydantic_settings import BaseSettings
from functools import lru_cache

# Detect if running on Render (they set RENDER=true automatically)
_ON_RENDER = os.environ.get("RENDER", "false").lower() == "true"


class Settings(BaseSettings):
    # App
    APP_NAME: str = "MindBridge"
    DEBUG: bool = False

    # Auth
    JWT_SECRET: str = "change-me-in-production-use-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 1440  # 24 hours

    # Database
    # On Render with a Persistent Disk mounted at /data, override via env var:
    #   DATABASE_URL=sqlite+aiosqlite:////data/mindbridge.db
    DATABASE_URL: str = "sqlite+aiosqlite:///./mindbridge.db"

    # Groq
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"

    # ChromaDB
    # On Render: CHROMA_PERSIST_DIR=/data/chroma_db
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    CHROMA_COLLECTION: str = "cbt_knowledge"

    # Embeddings
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # Memory
    SHORT_TERM_MEMORY_SIZE: int = 20  # messages
    LONG_TERM_SUMMARY_INTERVAL: int = 5  # summarize every N messages

    # CORS — comma-separated list of allowed origins
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,https://mind-bridge-m889.vercel.app"

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
