"""Exceptions for the AI/LLM generation layer."""

from __future__ import annotations


class GenerationError(Exception):
    """A provider failed to produce a valid lesson for a given chunk."""


class NotConfigured(GenerationError):
    """The requested capability needs an API key that is not set."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
