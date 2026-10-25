"""LLM provider layer: OpenAI (GPT-4o) and Anthropic (Claude 3.5 Sonnet).

Each provider implements :class:`LessonGenerator` and turns one text chunk into
a validated :class:`LessonPayload`.  The pipeline never knows which provider it
is running: same JSON contract, same validation, same progress events.
"""
from . import providers, orchestrator

__all__ = ["providers", "orchestrator"]
