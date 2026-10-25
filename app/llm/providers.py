"""LLM provider protocol and implementation.

Each provider implements :class:`LessonGenerator` and turns one text chunk into a
validated :class:`LessonPayload`.  The pipeline never knows which provider it is
running: same JSON contract, same validation, same progress events.

OpenAI GPT-4o uses :class:`~langchain_openai.LLM` behind the scenes so the
prompt is a proper LangChain pipeline; Anthropic Claude 3.5 Sonnet does the same
with :class:`~langchain_anthropic.LLM`.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from pydantic import BaseModel, Field, ValidationError

from ..config import settings
from ..schemas import LessonPayload
from ..ai.generation_error import GenerationError

try:  # Optional dependency - installed only when a paid provider is configured.
    from langchain_core.output_parsers import PydanticOutputParser
    from langchain_core.prompts import PromptTemplate
    from langchain_openai import ChatOpenAI
    from langchain_anthropic import ChatAnthropic
except ImportError:  # pragma: no cover - optional
    PydanticOutputParser = None  # type: ignore
    PromptTemplate = None  # type: ignore
    ChatOpenAI = None  # type: ignore
    ChatAnthropic = None  # type: ignore


class ProviderNotInstalled(GenerationError):
    """Raised when the LangChain SDK for a provider is missing."""


class _LessonItem(BaseModel):
    question_type: str
    prompt: str
    options: list[str] | None = None
    correct_answer: str = Field(min_length=1)
    explanation: str | None = None


class _LessonPayload(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    language: str | None = Field(default=None, max_length=64)
    items: list[_LessonItem] = Field(min_length=1, max_length=20)


class LessonGenerator(Protocol):
    """Any provider that turns a text chunk into a validated LessonPayload."""

    name: str

    def generate(self, *, chunk: str, index: int, total: int, language: str | None, title_hint: str) -> LessonPayload: ...


class OpenAIGenerator:
    """GPT-4o lesson generator driven by LangChain."""

    name = "openai"

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        self.api_key = api_key if api_key is not None else settings.openai_api_key
        self.model = model or settings.openai_model
        if ChatOpenAI is None:
            raise ProviderNotInstalled(
                "langchain_openai is not installed. "
                "Install it with `pip install langchain-openai` to use the OpenAI path."
            )
        if PydanticOutputParser is None or PromptTemplate is None:
            raise ProviderNotInstalled(
                "langchain_core is not installed. Install langchain_core with "
                "`pip install langchain-core`."
            )

    def generate(self, *, chunk: str, index: int, total: int, language: str | None, title_hint: str) -> LessonPayload:
        parser = PydanticOutputParser(pydantic_object=_LessonPayload)
        prompt = PromptTemplate(
            template=(
                "You are Bolingo, an expert curriculum designer creating ONE lesson.\\n\\n"
                "Respond with RAW JSON ONLY -- no markdown fences, no commentary -- "
                "matching this schema exactly:\\n\\n"
                "{schema}\\n\\n"
                "Rules:\\n"
                "- 4-8 items, all answers unique per item\\n"
                "- every exercise answerable purely from the source excerpt\\n"
                "- no duplicated options, no markdown\\n"
                "- correct_answer MUST be one of the options for multiple_choice items\\n"
            ),
            input_variables=["chunk"],
        )
        llm = ChatOpenAI(
            model_name=self.model,
            openai_api_key=self.api_key,
            temperature=0.6,
        )
        chain = prompt | llm | parser
        raw = chain.invoke({"chunk": chunk, "schema": parser.get_format_instructions()})
        try:
            return LessonPayload.model_validate(raw.model_dump())
        except ValidationError as exc:
            raise GenerationError(f"OpenAI returned invalid lesson JSON: {exc}") from exc


class ClaudeGenerator:
    """Claude 3.5 Sonnet lesson generator driven by LangChain."""

    name = "claude"

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        self.api_key = api_key if api_key is not None else settings.anthropic_api_key
        self.model = model or settings.anthropic_model
        if ChatAnthropic is None:
            raise ProviderNotInstalled(
                "langchain_anthropic is not installed. "
                "Install it with `pip install langchain-anthropic` to use the Claude path."
            )
        if PydanticOutputParser is None or PromptTemplate is None:
            raise ProviderNotInstalled(
                "langchain_core is not installed. Install langchain_core with "
                "`pip install langchain-core`."
            )

    def generate(self, *, chunk: str, index: int, total: int, language: str | None, title_hint: str) -> LessonPayload:
        parser = PydanticOutputParser(pydantic_object=_LessonPayload)
        prompt = PromptTemplate(
            template=(
                "You are Bolingo, an expert curriculum designer creating ONE lesson.\\n\\n"
                "Respond with RAW JSON ONLY -- no markdown fences, no commentary -- "
                "matching this schema exactly:\\n\\n"
                "{schema}\\n\\n"
                "Rules:\\n"
                "- 4-8 items, all answers unique per item\\n"
                "- every exercise answerable purely from the source excerpt\\n"
                "- no duplicated options, no markdown\\n"
                "- correct_answer MUST be one of the options for multiple_choice items\\n"
            ),
            input_variables=["chunk"],
        )
        llm = ChatAnthropic(
            model_name=self.model,
            anthropic_api_key=self.api_key,
            temperature=0.6,
        )
        chain = prompt | llm | parser
        raw = chain.invoke({"chunk": chunk, "schema": parser.get_format_instructions()})
        try:
            return LessonPayload.model_validate(raw.model_dump())
        except ValidationError as exc:
            raise GenerationError(f"Claude returned invalid lesson JSON: {exc}") from exc
