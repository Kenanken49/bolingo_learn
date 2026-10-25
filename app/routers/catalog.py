"""Catalog progress: gems, lesson completions and gem-unlocked levels.

Level 1 of every track is open. Each completed lesson pays gems once; a
higher level costs gems to unlock and must be paid for in order.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from courses import all_courses
from ..db import get_db
from ..deps import get_current_user
from ..models import CatalogLessonCompletion, CatalogLevelUnlock, User

router = APIRouter(prefix="/api/catalog", tags=["catalog"])

GEMS_PER_LESSON = 5
GEMS_PER_UNLOCK = 50


class _Out(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LessonProgressOut(_Out):
    index: int
    completed: bool


class LevelProgressOut(_Out):
    number: int
    unlocked: bool
    unlock_cost: int
    lessons: list[LessonProgressOut]


class TrackProgressOut(_Out):
    slug: str
    levels: list[LevelProgressOut]


class CatalogProgressOut(_Out):
    gems: int
    gems_per_lesson: int
    gems_per_unlock: int
    tracks: list[TrackProgressOut]


class CompleteLessonIn(_Out):
    track_slug: str = Field(min_length=1, max_length=64)
    level: int = Field(ge=1)
    lesson_index: int = Field(ge=0)


class CompleteLessonOut(_Out):
    gems_awarded: int
    gems: int
    already_completed: bool


class UnlockLevelIn(_Out):
    track_slug: str = Field(min_length=1, max_length=64)
    level: int = Field(ge=2)


class UnlockLevelOut(_Out):
    gems: int
    unlocked: bool


def _track(slug: str):
    for track in all_courses():
        if track.slug == slug:
            return track
    raise HTTPException(status_code=404, detail="Track not found")


def _level(track, number: int):
    for level in track.levels:
        if level.number == number:
            return level
    raise HTTPException(status_code=404, detail="Level not found")


def _unlocked_levels(db: Session, user: User, slug: str) -> set[int]:
    rows = db.scalars(
        select(CatalogLevelUnlock.level).where(
            CatalogLevelUnlock.user_id == user.id,
            CatalogLevelUnlock.track_slug == slug,
        )
    ).all()
    return {1, *rows}


@router.get("/progress", response_model=CatalogProgressOut)
def get_progress(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CatalogProgressOut:
    completions = db.scalars(
        select(CatalogLessonCompletion).where(CatalogLessonCompletion.user_id == user.id)
    ).all()
    done = {
        (row.track_slug, row.level, row.lesson_index) for row in completions
    }
    tracks: list[TrackProgressOut] = []
    for track in all_courses():
        unlocked = _unlocked_levels(db, user, track.slug)
        tracks.append(
            TrackProgressOut(
                slug=track.slug,
                levels=[
                    LevelProgressOut(
                        number=level.number,
                        unlocked=level.number in unlocked,
                        unlock_cost=0 if level.number == 1 else GEMS_PER_UNLOCK,
                        lessons=[
                            LessonProgressOut(
                                index=index,
                                completed=(track.slug, level.number, index) in done,
                            )
                            for index in range(len(level.lessons))
                        ],
                    )
                    for level in track.levels
                ],
            )
        )
    return CatalogProgressOut(
        gems=user.gems,
        gems_per_lesson=GEMS_PER_LESSON,
        gems_per_unlock=GEMS_PER_UNLOCK,
        tracks=tracks,
    )


@router.post("/lessons/complete", response_model=CompleteLessonOut)
def complete_lesson(
    body: CompleteLessonIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CompleteLessonOut:
    """Mark a catalog lesson done. Pays gems once; repeats award nothing."""
    track = _track(body.track_slug)
    level = _level(track, body.level)
    if body.level not in _unlocked_levels(db, user, track.slug):
        raise HTTPException(status_code=403, detail="This level is still locked")
    if not 0 <= body.lesson_index < len(level.lessons):
        raise HTTPException(status_code=400, detail="Invalid lesson index")

    existing = db.scalar(
        select(CatalogLessonCompletion).where(
            CatalogLessonCompletion.user_id == user.id,
            CatalogLessonCompletion.track_slug == track.slug,
            CatalogLessonCompletion.level == body.level,
            CatalogLessonCompletion.lesson_index == body.lesson_index,
        )
    )
    if existing is not None:
        return CompleteLessonOut(gems_awarded=0, gems=user.gems, already_completed=True)

    db.add(
        CatalogLessonCompletion(
            user_id=user.id,
            track_slug=track.slug,
            level=body.level,
            lesson_index=body.lesson_index,
        )
    )
    user.gems += GEMS_PER_LESSON
    db.commit()
    return CompleteLessonOut(
        gems_awarded=GEMS_PER_LESSON, gems=user.gems, already_completed=False
    )


@router.post("/levels/unlock", response_model=UnlockLevelOut)
def unlock_level(
    body: UnlockLevelIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UnlockLevelOut:
    """Spend gems to open the next level. Levels open strictly in order."""
    track = _track(body.track_slug)
    _level(track, body.level)
    unlocked = _unlocked_levels(db, user, track.slug)
    if body.level in unlocked:
        return UnlockLevelOut(gems=user.gems, unlocked=True)
    if body.level - 1 not in unlocked:
        raise HTTPException(
            status_code=409, detail="Unlock the previous level first"
        )
    if user.gems < GEMS_PER_UNLOCK:
        raise HTTPException(
            status_code=402,
            detail=f"Unlocking needs {GEMS_PER_UNLOCK} gems; you have {user.gems}",
        )

    user.gems -= GEMS_PER_UNLOCK
    db.add(
        CatalogLevelUnlock(user_id=user.id, track_slug=track.slug, level=body.level)
    )
    db.commit()
    return UnlockLevelOut(gems=user.gems, unlocked=True)
