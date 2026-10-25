"""Provider selection for lesson generation."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from ..schemas import LessonPayload
from .generation_error import GenerationError

__all__ = ["ClaudeGenerator", "GenerationError", "LessonGenerator", "OpenAIGenerator"]


@runtime_checkable
class LessonGenerator(Protocol):
    """Any provider that turns a text chunk into a validated LessonPayload."""

    name: str

    def generate(
        self,
        *,
        chunk: str,
        index: int,
        total: int,
        language: str | None,
        title_hint: str,
    ) -> LessonPayload: ...


def get_generator() -> LessonGenerator:
    """Resolve the provider: explicit setting wins, 'auto' prefers a keyed LLM."""
    from ..config import settings
    from .offline import OfflineGenerator
    from .openai_provider import OpenAIGenerator

    provider = settings.llm_provider

    if provider == "offline":
        return OfflineGenerator()

    if provider == "openai":
        if not settings.openai_api_key:
            raise GenerationError(
                "LLM_PROVIDER=openai but OPENAI_API_KEY is not set. "
                "Set the key or use LLM_PROVIDER=offline."
            )
        return OpenAIGenerator()

    if provider == "claude":
        if not settings.anthropic_api_key:
            raise GenerationError(
                "LLM_PROVIDER=claude but ANTHROPIC_API_KEY is not set. "
                "Set the key or use LLM_PROVIDER=offline."
            )
        from .llm.providers import ClaudeGenerator

        return ClaudeGenerator()

    if provider == "auto":
        if settings.openai_api_key:
            return OpenAIGenerator()
        if settings.anthropic_api_key:
            from .llm.providers import ClaudeGenerator

            return ClaudeGenerator()
        return OfflineGenerator()

    raise GenerationError(
        f"Unknown LLM_PROVIDER {provider!r}. Use 'auto', 'openai', 'claude' "
        f"or 'offline'."
    )
