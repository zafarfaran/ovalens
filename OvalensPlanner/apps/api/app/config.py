"""Application configuration via Pydantic Settings."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


def _normalize_database_url(url: str) -> str:
    """Use asyncpg for PostgreSQL URLs (Supabase/local Postgres)."""
    if url.strip().startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


class Settings(BaseSettings):
    """Environment-validated application settings."""

    # Database: set DATABASE_URL for Supabase/Postgres (e.g. from Supabase dashboard).
    # For SQLite (local dev) omit or use sqlite+aiosqlite:///./helio.db
    database_url: str = "sqlite+aiosqlite:///./helio.db"

    @property
    def database_url_async(self) -> str:
        """URL with async driver for PostgreSQL (asyncpg)."""
        return _normalize_database_url(self.database_url)

    @property
    def is_postgres(self) -> bool:
        """True when using PostgreSQL (e.g. Supabase)."""
        return "postgresql" in self.database_url

    # AI
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    ai_model: str = "claude-sonnet-4-20250514"

    # App
    environment: str = "development"
    log_level: str = "DEBUG"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"]
    # Default tax year for calculations (e.g. "2025/26"). If unset, derived from current date.
    default_tax_year: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
