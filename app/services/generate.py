"""Generation orchestration: extract -> chunk -> generate -> validate -> persist.

Runs as a background task with its own DB session, publishing progress events
to the WebSocket hub. It never raises: failures are recorded on the material
and broadcast so clients can show a real error.
"""

from __future__ import annotations

import asyncio
from pathlib import Path

from sqlalchemy import select

from ..ai import GenerationError, NotConfigured
from ..ai.base import get_generator
from ..ai.speech import transcribe_audio
from ..config import settings
from ..db import SessionLocal
from ..events import hub
from ..ingest.chunk import chunk_text
from ..models import Course, Lesson, Material
from ..llm import orchestrator as rag
from ..services.difficulty_score import course_score

_MIN_TEXT_CHARS = 20


def _publish(material_id: int, **fields) -> None:
    hub.publish(material_id, fields)


async def run_generation(material_id: int) -> None:
    db = SessionLocal()
    material: Material | None = None
    try:
        material = db.get(Material, material_id)
        if material is None:
            return
        hub.begin(material_id)
        material.status = "processing"
        material.error = None
        db.commit()

        _publish(material_id, stage="extracting", percent=5, done=False)

        text = material.text or ""
        if not text.strip() and material.kind == "audio":
            _publish(material_id, stage="transcribing", percent=10, done=False)
            text = await transcribe_audio(material.storage_path)
            material.text = text
            material.char_count = len(text)
            db.commit()

        if len(text.strip()) < _MIN_TEXT_CHARS:
            raise GenerationError(
                "This material has too little text to build lessons from it."
            )

        # RAG: if retrieval-augmented generation is enabled, generate lessons
        # through the LangChain orchestrator instead of the legacy pipeline.
        if settings.rag_enabled:
            await rag.generate_with_rag(material)
            return

        _publish(material_id, stage="chunking", percent=15, done=False)
        chunks = chunk_text(
            text, settings.chunk_target_chars, settings.max_lessons_per_material
        )
        if not chunks:
            raise GenerationError("No chunks could be produced from this material.")

        generator = get_generator()
        title_hint = Path(material.filename).stem[:80]

        course = db.scalar(select(Course).where(Course.material_id == material.id))
        if course is None:
            course = Course(
                user_id=material.user_id,
                material_id=material.id,
                title=title_hint,
                language=material.language,
            )
            db.add(course)
            db.flush()

        total = len(chunks)
        lesson_ids: list[int] = []
        for i, chunk in enumerate(chunks):
            _publish(
                material_id,
                stage="generating",
                chunk=i,
                total=total,
                provider=generator.name,
                percent=20 + int(60 * i / total),
                done=False,
            )
            payload = await asyncio.to_thread(
                generator.generate,
                chunk=chunk,
                index=i,
                total=total,
                language=material.language,
                title_hint=title_hint,
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
            lesson_ids.append(lesson.id)
            _publish(
                material_id,
                stage="validated",
                chunk=i,
                total=total,
                lesson_id=lesson.id,
                percent=20 + int(75 * (i + 1) / total),
                done=False,
            )

        material.status = "ready"
        material.error = None
        db.commit()
        _publish(
            material_id,
            stage="ready",
            percent=100,
            done=True,
            course_id=course.id,
            lesson_ids=lesson_ids,
            provider=generator.name,
        )
    except NotConfigured as exc:
        _fail(db, material, str(exc))
    except GenerationError as exc:
        _fail(db, material, str(exc))
    except Exception as exc:  # background tasks must never raise
        _fail(db, material, f"Unexpected error: {exc}")
    finally:
        db.close()


def _fail(db, material: Material | None, message: str) -> None:
    message = message[:2000]
    db.rollback()
    if material is not None:
        try:
            material.status = "failed"
            material.error = message
            db.commit()
        except Exception:
            db.rollback()
    hub.publish(
        material_id=(material.id if material is not None else 0),
        event={
            "stage": "failed",
            "percent": 100,
            "done": True,
            "error": message,
        },
    )
