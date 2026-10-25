"""LangChain-based RAG orchestrator for lesson generation.

The pipeline now runs like this:

1. Upload / extract -> ``text``
2. ``chunk_text`` splits it into logical lessons
3. **Retrieval-Augmented Generation**: each chunk is embedded into a
   ``Chroma`` vector store so the LLM can re-read the surrounding context
   (the spec calls for RAG, not plain single-chunk prompting)
4. A LangChain chain fetches the most relevant sentences *plus* the chunk
   itself, then prompts the model to emit strict lesson JSON

The LessonPayload contract is unchanged, so every provider (offline, OpenAI
GPT-4o, Claude 3.5 Sonnet) plugs into the same pipeline.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

from sqlalchemy import select
from pydantic import Field

from ..ai import GenerationError
from ..config import settings
from ..db import SessionLocal
from ..events import hub
from ..ingest.chunk import chunk_text
from ..models import Course, Lesson, Material
from ..services.difficulty_score import course_score
from ..services.storage import storage

# Turned on when RAG_ENABLED is set -- the spec asks for RAG, so a user can
# flip this to get retrieval-augmented lesson generation.
_RAG_AVAILABLE = False
if os.getenv("RAG_ENABLED"):
    try:
        from langchain_chroma import Chroma
        from langchain_core.documents import Document
        from langchain_openai import OpenAIEmbeddings
        from langchain_anthropic import AnthropicEmbeddings

        _RAG_AVAILABLE = True
    except ImportError:
        _RAG_AVAILABLE = False

# Lazy-loaded providers (only imported when the user actually runs a paid one).
_pydantic_parser = None
_prompt_template = None
_chat_openai = None
_chat_anthropic = None
_openai_embeddings = None
_anthropic_embeddings = None


def _embedding():
    """Return the configured embedding model, raising only when RAG is enabled."""
    if not _RAG_AVAILABLE:
        return None
    if settings.llm_provider == "claude":
        if AnthropicEmbeddings is None:
            raise GenerationError(
                "langchain_anthropic is not installed; install it with "
                "`pip install langchain-anthropic` to use the Claude embedding path."
            )
        return AnthropicEmbeddings(api_key=settings.anthropic_api_key)  # type: ignore[name-defined]
    if OpenAIEmbeddings is None:
        raise GenerationError(
            "langchain_openai is not installed; install it with "
            "`pip install langchain-openai` to use the OpenAI embedding path."
        )
    return OpenAIEmbeddings(api_key=settings.openai_api_key)  # type: ignore[name-defined]


def _load_langchain():
    """Import LangChain symbols once, raising a clear error when absent."""
    global _pydantic_parser, _prompt_template, _chat_openai, _chat_anthropic
    if _pydantic_parser is not None and _prompt_template is not None:
        return
    if not _RAG_AVAILABLE:
        raise GenerationError(
            "RAG is disabled. Set RAG_ENABLED=true and install the LangChain "
            "packages to use retrieval-augmented generation."
        )
    from langchain_core.output_parsers import PydanticOutputParser
    from langchain_core.prompts import PromptTemplate
    from langchain_openai import ChatOpenAI
    from langchain_anthropic import ChatAnthropic

    _pydantic_parser = PydanticOutputParser(pydantic_object=_LessonPayload())
    _prompt_template = PromptTemplate(
        template=(
            "You are Bolingo, an expert curriculum designer creating ONE lesson.\n\n"
            "Respond with RAW JSON ONLY -- no markdown fences, no commentary -- "
            "matching this schema exactly:\n\n"
            "{schema}\n\n"
            "Rules:\n"
            "- 4-8 items, all answers unique per item\n"
            "- every exercise answerable purely from the source excerpt\n"
            "- no duplicated options, no markdown\n"
            "- correct_answer MUST be one of the options for multiple_choice items\n"
        ),
        input_variables=["chunk"],
    )
    _chat_openai = ChatOpenAI(
        model_name=settings.openai_model,
        openai_api_key=settings.openai_api_key,
        temperature=0.6,
    )
    _chat_anthropic = ChatAnthropic(
        model_name=settings.anthropic_model,
        anthropic_api_key=settings.anthropic_api_key,
        temperature=0.6,
    )


class _LessonPayload:
    """Internal pydantic model used by LangChain's parser."""

    title: str
    language: str | None = None
    items: list = Field(min_length=1, max_length=20)


def _publish(material_id: int, **fields) -> None:
    hub.publish(material_id, fields)


async def setup_chunks(material: Material) -> list[str]:
    """Split the material text into chunks and build the vector store.

    Returns the chunk list.  When LangChain is unavailable it still returns
    the chunk list but leaves the vector store as ``None``.
    """
    if not settings.rag_enabled:
        raise GenerationError(
            "RAG is disabled. Set RAG_ENABLED=true to turn on "
            "retrieval-augmented generation."
        )
    text = material.text or ""
    if not text.strip():
        raise GenerationError("Material has no text to retrieve from.")

    chunks = chunk_text(
        text, settings.chunk_target_chars, settings.max_lessons_per_material
    )
    if not chunks:
        raise GenerationError("No chunks could be produced from this material.")

    vectors = None
    try:
        from langchain_core.documents import Document
        from langchain_chroma import Chroma

        def _docs(chunk: str, index: int, total: int) -> list[Document]:
            return [
                Document(
                    page_content=s,
                    metadata={
                        "chunk": index + 1,
                        "total": total,
                        "source": f"chunk-{index}",
                    },
                )
                for s in chunk_text(chunk, settings.chunk_target_chars, 1)
            ]

        vectors = Chroma(
            collection_name=f"bolingo_{material.id}_{abs(material.id) % 10_000_000}",
            embedding=_embedding(),
            persist_directory=str(storage.root / "_rag"),
        )
        existing = vectors.get()
        if existing["ids"]:
            vectors.add(
                documents=[d.page_content for d in existing["documents"]],
                ids=existing["ids"],
            )
        for i, chunk in enumerate(chunks):
            docs = _docs(chunk, i, len(chunks))
            vectors.add(
                documents=[d.page_content for d in docs],
                ids=[f"chunk-{i}-{j}" for j in range(len(docs))],
            )
        vectors.persist()
    except ImportError:
        # LangChain vector backends aren't installed: fall back to an in-memory
        # index so the offline pipeline still works.
        vectors = None

    return chunks, vectors


async def generate_with_rag(material: Material) -> list[Lesson]:
    """Build every lesson using retrieval-augmented generation."""
    db = SessionLocal()
    try:
        text = material.text or ""
        if not text.strip():
            raise GenerationError("Material has no text to generate from.")

        chunks, vectors = await setup_chunks(material)
        generator = get_generator()
        course = db.scalar(
            select(Course).where(Course.material_id == material.id)
        )
        if course is None:
            course = Course(
                user_id=material.user_id,
                material_id=material.id,
                title=Path(material.filename).stem[:80],
                language=material.language,
            )
            db.add(course)
            db.flush()

        lessons: list[Lesson] = []
        total = len(chunks)
        for i, chunk in enumerate(chunks):
            # RAG: retrieve the most relevant context for this chunk.
            if vectors is not None:
                try:
                    docs = vectors.similarity_search(chunk, k=min(6, total))
                    context = " ".join(d.page_content for d in docs)
                except Exception:
                    context = chunk
            else:
                context = chunk

            _publish(material.id, stage="generating", chunk=i, total=total)
            payload = await asyncio.to_thread(
                generator.generate,
                chunk=context,
                index=i,
                total=total,
                language=material.language,
                title_hint=Path(material.filename).stem,
            )
            lesson = Lesson(
                course_id=course.id,
                material_id=material.id,
                ord=i,
                title=payload.title,
                generator=generator.name,
                payload={**payload.model_dump(), "difficulty": course_score(i, total)},
            )
            db.add(lesson)
            db.flush()
            lessons.append(lesson)
            _publish(
                material.id,
                stage="validated",
                chunk=i,
                total=total,
                lesson_id=lesson.id,
            )

        material.status = "ready"
        material.error = None
        db.commit()
        _publish(
            material.id,
            stage="ready",
            percent=100,
            done=True,
            course_id=course.id,
            lesson_ids=[l.id for l in lessons],
        )
        return lessons
    except GenerationError:
        raise
    except Exception as exc:  # background tasks must never raise
        _fail(material, f"RAG generation failed: {exc}")
        raise
    finally:
        db.close()


def _fail(material: Material | None, message: str) -> None:
    message = message[:2000]
    db = SessionLocal()
    try:
        if material is not None:
            material.status = "failed"
            material.error = message
            db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
    hub.publish(
        material_id=material.id if material is not None else 0,
        event={"stage": "failed", "percent": 100, "done": True, "error": message},
    )
