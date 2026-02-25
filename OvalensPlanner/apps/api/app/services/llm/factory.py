"""LLM provider factory."""

from app.config import get_settings
from app.core.logging import get_logger
from app.services.llm.claude import ClaudeProvider

logger = get_logger(__name__)

_provider = None


def get_llm_provider() -> ClaudeProvider:
    global _provider
    if _provider is None:
        settings = get_settings()
        if settings.anthropic_api_key:
            _provider = ClaudeProvider()
            logger.info("LLM provider: Claude", model=settings.ai_model)
        else:
            raise RuntimeError(
                "No LLM provider configured — set ANTHROPIC_API_KEY"
            )
    return _provider
