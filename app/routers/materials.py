"""Material upload, listing, and lesson-generation trigger."""

from __future__ import annotations

import asyncio
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
)
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import get_current_user
from ..ingest.extract import (
    ExtractError,
    UnsupportedMaterial,
    classify,
    extract_text,
)
from ..models import Course, Lesson, Material, User
from ..schemas import GenerateOut, MaterialOut
from ..services.storage import storage

router = APIRouter(prefix="/api", tags=["materials"])

# Keep strong references so scheduled generation tasks are not garbage-collected.
_BACKGROUND_TASKS: set[asyncio.Task] = set()


def _schedule_generation(material_id: int) -> None:
    from ..services.generate import run_generation

    task = asyncio.create_task(run_generation(material_id))
    _BACKGROUND_TASKS.add(task)
    task.add_done_callback(_BACKGROUND_TASKS.discard)


def _material_out(material: Material) -> MaterialOut:
    return MaterialOut(
        id=material.id,
        filename=material.filename,
        kind=material.kind,
        language=material.language,
        status=material.status,
        error=material.error,
        char_count=material.char_count,
        created_at=material.created_at.isoformat(),
    )


def _get_owned(material_id: int, user: User, db: Session) -> Material:
    material = db.get(Material, material_id)
    if material is None or material.user_id != user.id:
        raise HTTPException(status_code=404, detail="Material not found")
    return material


@router.post("/materials", response_model=MaterialOut, status_code=201)
async def upload_material(
    file: UploadFile = File(...),
    language: str | None = Form(default=None),
    transcript: str | None = Form(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MaterialOut:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the {settings.max_upload_bytes} byte limit",
        )

    filename = Path(file.filename or "material").name
    try:
        kind = classify(filename)
    except UnsupportedMaterial as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc

    if kind == "audio":
        # Transcript provided now, or Whisper transcribes it at generation time.
        text = (transcript or "").strip()
    else:
        try:
            text = extract_text(filename, data)
        except ExtractError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    language_val = (language or "").strip()[:64] or None

    material = Material(
        user_id=user.id,
        filename=filename,
        kind=kind,
        language=language_val,
        storage_path="",
        text=text,
        char_count=len(text),
        status="uploaded",
    )
    db.add(material)
    db.flush()
    material.storage_path = storage.save(filename, data)
    db.commit()
    return _material_out(material)


@router.get("/materials", response_model=list[MaterialOut])
def list_materials(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MaterialOut]:
    rows = db.scalars(
        select(Material)
        .where(Material.user_id == user.id)
        .order_by(Material.created_at.desc())
    ).all()
    return [_material_out(row) for row in rows]


@router.get("/materials/{material_id}", response_model=MaterialOut)
def get_material(
    material_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MaterialOut:
    return _material_out(_get_owned(material_id, user, db))


@router.delete("/materials/{material_id}", status_code=204)
def delete_material(
    material_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Delete an uploaded material. Its courses and lessons are kept, unlinked."""
    material = _get_owned(material_id, user, db)
    if material.status == "processing":
        raise HTTPException(
            status_code=409,
            detail="Cannot delete a material while lessons are being generated",
        )
    db.execute(
        update(Course)
        .where(Course.material_id == material.id)
        .values(material_id=None)
    )
    db.execute(
        update(Lesson)
        .where(Lesson.material_id == material.id)
        .values(material_id=None)
    )
    db.delete(material)
    db.commit()
    return Response(status_code=204)


@router.post("/materials/{material_id}/lessons", response_model=GenerateOut)
async def generate_lessons(
    material_id: int,
    response: Response,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GenerateOut:
    material = _get_owned(material_id, user, db)

    if material.status == "processing":
        raise HTTPException(
            status_code=409, detail="Lesson generation is already in progress"
        )

    lessons = db.scalars(
        select(Lesson)
        .where(Lesson.material_id == material.id)
        .order_by(Lesson.ord)
    ).all()
    if lessons:
        # Idempotent: ready material with lessons just returns them.
        return GenerateOut(
            course_id=lessons[0].course_id,
            material_id=material.id,
            status=material.status,
            lesson_ids=[lesson.id for lesson in lessons],
        )

    if material.status == "failed" and not material.error:
        material.error = None
        db.commit()

    response.status_code = 202
    _schedule_generation(material.id)
    return GenerateOut(
        course_id=None,
        material_id=material.id,
        status="processing",
        lesson_ids=[],
    )
