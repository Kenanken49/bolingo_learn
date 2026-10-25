"""Bolingo API — FastAPI application factory, WebSocket progress endpoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .db import SessionLocal, init_db
from .events import hub
from .models import AuthToken, Course, Lesson, Material, User
from .routers import auth, catalog, gamification, library, lessons, materials, push, speech
from .scheduler import start_scheduler, stop_scheduler
from .security import hash_token


def reset_interrupted_generations() -> None:
    """Mark materials stuck 'processing' after a restart as retryable failures."""
    db = SessionLocal()
    try:
        stuck = db.scalars(
            select(Material).where(Material.status == "processing")
        ).all()
        for material in stuck:
            material.status = "failed"
            material.error = (
                "Generation was interrupted (server restart). "
                "Trigger again to retry."
            )
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    reset_interrupted_generations()
    scheduler = start_scheduler()
    try:
        yield
    finally:
        if scheduler is not None:
            await stop_scheduler(scheduler)


app = FastAPI(
    title="Bolingo API",
    description=(
        "AI-powered lesson generation backend: ingest PDFs/text/audio, "
        "chunk them, and turn them into validated interactive lessons."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_allow_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(gamification.router)
app.include_router(materials.router)
app.include_router(catalog.router)
app.include_router(library.router)
app.include_router(lessons.router)
app.include_router(speech.router)
app.include_router(push.router)


@app.get("/health")
def health() -> dict:
    from .ai.base import get_generator

    try:
        provider = get_generator().name
    except Exception:
        provider = "unavailable"
    return {"status": "ok", "app": settings.app_name, "generator": provider}


def _user_from_ws_token(db: Session, token: str | None) -> User | None:
    if not token:
        return None
    row = db.scalar(
        select(AuthToken).where(AuthToken.token_hash == hash_token(token))
    )
    if row is None:
        return None
    return db.get(User, row.user_id)


@app.websocket("/ws/generations/{material_id}")
async def generation_progress(websocket: WebSocket, material_id: int) -> None:
    """Streams generation progress for one material. Auth: ?token=<bearer>."""
    db = SessionLocal()
    try:
        user = _user_from_ws_token(db, websocket.query_params.get("token"))
        if user is None:
            await websocket.close(code=4401)
            return
        material = db.get(Material, material_id)
        if material is None or material.user_id != user.id:
            await websocket.close(code=4403)
            return
        material_status = material.status
        material_error = material.error
        course_id = db.scalar(
            select(Course.id).where(Course.material_id == material_id)
        )
        lesson_ids = list(
            db.scalars(
                select(Lesson.id)
                .where(Lesson.material_id == material_id)
                .order_by(Lesson.ord)
            )
        )
    finally:
        db.close()

    await websocket.accept()
    log, queue = hub.subscribe(material_id)
    try:
        if not log.events and material_status in ("ready", "failed"):
            # No event history in this process (server restart): the DB already
            # knows the outcome, so send it as a terminal snapshot instead of
            # leaving the client waiting forever.
            await websocket.send_json(
                {
                    "stage": material_status,
                    "percent": 100,
                    "done": True,
                    "snapshot": True,
                    "course_id": course_id,
                    "lesson_ids": lesson_ids,
                    "error": material_error,
                }
            )
        else:
            while True:
                event = await queue.get()
                await websocket.send_json(event)
                if event.get("done"):
                    break
        # Explicit close frame: clients should see a clean 1000, not a dropped TCP.
        await websocket.close(code=1000)
    except WebSocketDisconnect:
        pass
    finally:
        hub.unsubscribe(material_id, queue)


__all__ = ["app"]
