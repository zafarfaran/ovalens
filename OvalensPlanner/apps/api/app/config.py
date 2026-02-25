"""Application configuration via Pydantic Settings."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-validated application settings."""

    # Database
    database_url: str = "sqlite+aiosqlite:///./helio.db"

    # AI
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    ai_model: str = "claude-sonnet-4-20250514"

    # App
    environment: str = "development"
    log_level: str = "DEBUG"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
