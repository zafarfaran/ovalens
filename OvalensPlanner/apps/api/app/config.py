"""Application configuration via Pydantic Settings."""

from functools import lru_cache

from pydantic import Field, field_validator, model_validator
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

    # Database: set DATABASE_URL for Supabase/Postgres (prod) or local dev.
    # Local dev: omit or use sqlite+aiosqlite:///./helio.db (or a local Postgres).
    database_url: str = "sqlite+aiosqlite:///./helio.db"
    # Test: used only when environment=test (pytest). Default in-memory SQLite.
    test_database_url: str = "sqlite+aiosqlite:///:memory:"

    @model_validator(mode="after")
    def _require_postgres_in_production(self) -> "Settings":
        """In beta/production, DATABASE_URL must be set to a Postgres URL (no accidental SQLite)."""
        if self.environment not in ("beta", "production"):
            return self
        url = self.database_url.strip()
        if not url.startswith("postgresql") and "postgresql+" not in url:
            raise ValueError(
                "In beta/production, DATABASE_URL must be a PostgreSQL URL. "
                "Set DATABASE_URL in your deployment environment (e.g. Supabase connection string)."
            )
        return self

    @property
    def effective_database_url(self) -> str:
        """Database URL for current environment; tests never use production DB."""
        if self.environment == "test":
            return self.test_database_url
        return self.database_url

    @property
    def database_url_async(self) -> str:
        """URL with async driver for PostgreSQL (asyncpg)."""
        return _normalize_database_url(self.effective_database_url)

    @property
    def is_postgres(self) -> bool:
        """True when using PostgreSQL (e.g. Supabase)."""
        return "postgresql" in self.effective_database_url

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

    # Observability: Sentry DSN (leave unset to disable error reporting)
    sentry_dsn: str | None = None
    sentry_release: str | None = None  # e.g. "ovalens-api@0.0.1"; default used if unset
    # Metrics: enable exposition and optionally protect scrape endpoint with a token
    metrics_enabled: bool = False
    metrics_token: str | None = None

    # Rate limiting (expensive endpoints). 0 = disabled.
    # Chat stream: POST /api/chat/stream
    rate_limit_chat_stream_per_user: int = Field(
        default=30, ge=0, description="Max requests per window per user; 0=disabled"
    )
    rate_limit_chat_stream_per_ip: int = Field(
        default=60, ge=0, description="Max requests per window per IP; 0=disabled"
    )
    # Context ingest: POST /api/context/ingest
    rate_limit_context_ingest_per_user: int = Field(
        default=20, ge=0, description="Max requests per window per user; 0=disabled"
    )
    rate_limit_context_ingest_per_ip: int = Field(
        default=40, ge=0, description="Max requests per window per IP; 0=disabled"
    )
    # Window length in seconds (shared)
    rate_limit_window_seconds: int = Field(
        default=60, ge=1, le=86400, description="Rate limit window in seconds"
    )
    # When True, use X-Forwarded-For for IP (trusted proxy). When False, use request.client.host.
    rate_limit_trust_proxy: bool = Field(
        default=False,
        description="Use X-Forwarded-For for IP; only set True behind a trusted proxy",
    )

    # Input size limits (LLM cost / abuse). 0 = no limit (not recommended for chat).
    chat_max_message_length: int = Field(
        default=32_000, ge=0, description="Max chars per user message in chat; 0=unlimited"
    )

    @property
    def should_expose_metrics(self) -> bool:
        """Expose /metrics in beta/production by default, or via explicit flag."""
        return self.environment in {"beta", "production"} or self.metrics_enabled

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
