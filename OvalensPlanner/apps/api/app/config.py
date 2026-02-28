"""Application configuration via Pydantic Settings."""

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _normalize_database_url(url: str) -> str:
    """Use asyncpg for PostgreSQL URLs (Supabase/local Postgres)."""
    if url.strip().startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "https://ovalens-web.vercel.app",
    "https://www.ovalens.com",
    "https://ovalens.com",
]


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
    cors_origins: list[str] = Field(default_factory=lambda: list(DEFAULT_CORS_ORIGINS))
    default_tax_year: str | None = None  # e.g. "2025/26"; if unset, derived from current date

    # Auth: Supabase JWT secret (Project Settings → API → JWT Secret) for token verification
    supabase_jwt_secret: str | None = None

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str] | None) -> list[str]:
        def merge_with_defaults(origins: list[str]) -> list[str]:
            """Always include default origins so production never drops due to env typo."""
            combined = list(DEFAULT_CORS_ORIGINS)
            for o in origins:
                o = str(o).strip()
                if o and o not in combined:
                    combined.append(o)
            return combined

        if isinstance(v, str):
            s = v.strip()
            if not s:
                return list(DEFAULT_CORS_ORIGINS)
            if s.startswith("["):
                import json

                try:
                    parsed = json.loads(s)
                except json.JSONDecodeError:
                    return list(DEFAULT_CORS_ORIGINS)
                if not isinstance(parsed, list) or len(parsed) == 0:
                    return list(DEFAULT_CORS_ORIGINS)
                return merge_with_defaults([str(o).strip() for o in parsed if str(o).strip()])
            origins = [o.strip() for o in v.split(",") if o.strip()]
            return merge_with_defaults(origins) if origins else list(DEFAULT_CORS_ORIGINS)
        if isinstance(v, list):
            return merge_with_defaults(list(v)) if v else list(DEFAULT_CORS_ORIGINS)
        return list(DEFAULT_CORS_ORIGINS)

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
