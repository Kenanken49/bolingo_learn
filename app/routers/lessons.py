"""Lesson reading and attempt scoring.

Correct answers are stripped from GET responses and only revealed when an
attempt is scored server-side.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import TypeAdapter, ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from courses import all_courses

from ..ai import GenerationError
from ..ai import NotConfigured
from ..ai.speech import transcribe_audio
from ..config import settings
from ..db import get_db
from ..deps import get_current_user
from ..models import Attempt, Course, Lesson, SpeechAttempt, User
from ..schemas import (
    LessonItem,
    AttemptIn,
    AttemptOut,
    BirdbrainLevelOut,
    BirdbrainProfileOut,
    CheckIn,
    CheckOut,
    CatalogLessonOut,
    CatalogLevelOut,
    CatalogTrackOut,
    CourseOut,
    CourseSummary,
    ItemResult,
    LessonDetail,
    LessonSummary,
    SpeechAttemptOut,
)
from ..services.progress import (
    award_lesson_xp,
    consume_heart,
    is_answer_correct,
    refill_hearts,
    update_streak,
)
from ..services.difficulty import build_selector
from ..services.learner_profile import (
    DIFFICULTY_LEVELS,
    InMemoryProfileStore,
    RedisProfileStore,
    update_profile,
)
from ..services.storage import storage

router = APIRouter(prefix="/api", tags=["lessons"])
logger = logging.getLogger(__name__)

_redis_client = None
_memory_store = InMemoryProfileStore()


def _profile_store():
    """Redis when BOLINGO_REDIS_URL is set; otherwise the in-process store."""
    global _redis_client
    if not settings.redis_url:
        return _memory_store
    if _redis_client is None:
        import redis  # noqa: PLC0415 - only needed when Redis is configured

        _redis_client = redis.Redis.from_url(settings.redis_url)
    return RedisProfileStore(_redis_client)


def _selector():
    return build_selector(settings.difficulty_model_path, settings.difficulty_server_url)


def _update_profile_and_select(user_id: int, level: int, correct: int, total: int) -> int:
    """Blend the attempt into the learner profile and pick the next level.

    The attempt is already scored and committed, so a Redis outage must not
    turn it into a 500. On failure, fall back to the in-process store.
    """
    try:
        store = _profile_store()
        profile = update_profile(store.get(user_id), level, correct, total)
        store.put(user_id, profile)
    except Exception:  # noqa: BLE001 - any Redis failure falls back
        logger.exception("learner profile store failed; using in-memory fallback")
        profile = update_profile(_memory_store.get(user_id), level, correct, total)
        _memory_store.put(user_id, profile)
    return _selector().next_level(profile, level)

_HIDDEN_KEYS = ("correct_answer", "accepted_answers")
_ITEM_ADAPTER: TypeAdapter = TypeAdapter(LessonItem)


def _playable_items(lesson: Lesson) -> list[dict]:
    """Items that pass the strict lesson schema, checked at render/grade time.

    Malformed generated items (duplicate options, answer not in options, empty
    prompt) are dropped here, so every endpoint sees the same indices.
    """
    valid: list[dict] = []
    for item in lesson.payload.get("items", []):
        try:
            _ITEM_ADAPTER.validate_python(item)
        except ValidationError:
            logger.warning("skipping invalid item in lesson %s", lesson.id)
            continue
        valid.append(item)
    return valid


def _lesson_score(lesson: Lesson) -> int:
    """The course difficulty score (1-5); lessons without one default to 1."""
    score = lesson.payload.get("difficulty")
    if not isinstance(score, int) or not 1 <= score <= 5:
        return 1
    return score


def _lesson_level(lesson: Lesson) -> int:
    """Map the course difficulty score (1-5) onto the 1-10 Birdbrain levels."""
    return 1 + round((_lesson_score(lesson) - 1) * 9 / 4)


def _owned_course(course_id: int, user: User, db: Session) -> Course:
    course = db.get(Course, course_id)
    if course is None or course.user_id != user.id:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


def _owned_lesson(lesson_id: int, user: User, db: Session) -> Lesson:
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    course = db.get(Course, lesson.course_id)
    if course is None or course.user_id != user.id:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@router.get("/courses", response_model=list[CourseSummary])
def list_courses(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CourseSummary]:
    """Every course the caller owns, newest first, with its lesson count."""
    courses = db.scalars(
        select(Course)
        .where(Course.user_id == user.id)
        .order_by(Course.id.desc())
    ).all()
    if not courses:
        return []

    counts = dict(
        db.execute(
            select(Lesson.course_id, func.count())
            .where(Lesson.course_id.in_([course.id for course in courses]))
            .group_by(Lesson.course_id)
        ).all()
    )
    return [
        CourseSummary(
            id=course.id,
            title=course.title,
            language=course.language,
            material_id=course.material_id,
            lesson_count=counts.get(course.id, 0),
        )
        for course in courses
    ]


@router.get("/courses/catalog", response_model=list[CatalogTrackOut])
def list_catalog(
    user: User = Depends(get_current_user),
) -> list[CatalogTrackOut]:
    """The built-in curriculum tracks shipped in `courses.py`.

    Static content: same catalog for every learner, independent of uploads.
    """
    return [
        CatalogTrackOut(
            slug=track.slug,
            name=track.name,
            description=track.description,
            levels=[
                CatalogLevelOut(
                    number=level.number,
                    lessons=[
                        CatalogLessonOut(
                            title=lesson.title,
                            kind=lesson.kind,
                            instruction=lesson.instruction,
                            difficulty=lesson.difficulty,
                        )
                        for lesson in level.lessons
                    ],
                )
                for level in track.levels
            ],
        )
        for track in all_courses()
    ]


@router.get("/courses/{course_id}/lessons", response_model=CourseOut)
def list_course_lessons(
    course_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CourseOut:
    course = _owned_course(course_id, user, db)
    lessons = db.scalars(
        select(Lesson).where(Lesson.course_id == course.id).order_by(Lesson.ord)
    ).all()

    best: dict[int, tuple[int, bool]] = {}
    if lessons:
        attempts = db.scalars(
            select(Attempt).where(
                Attempt.user_id == user.id,
                Attempt.lesson_id.in_([lesson.id for lesson in lessons]),
            )
        ).all()
        for attempt in attempts:
            current = best.get(attempt.lesson_id, (0, False))
            best[attempt.lesson_id] = (
                max(current[0], attempt.correct),
                current[1] or bool(attempt.passed),
            )

    summaries = [
        LessonSummary(
            id=lesson.id,
            ord=lesson.ord,
            title=lesson.title,
            item_count=len(_playable_items(lesson)),
            best_correct=best.get(lesson.id, (None, False))[0],
            passed=best.get(lesson.id, (0, False))[1],
        )
        for lesson in lessons
    ]
    return CourseOut(
        id=course.id,
        title=course.title,
        language=course.language,
        material_id=course.material_id,
        lessons=summaries,
    )


@router.get("/lessons/{lesson_id}", response_model=LessonDetail)
def get_lesson(
    lesson_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LessonDetail:
    lesson = _owned_lesson(lesson_id, user, db)
    course = db.get(Course, lesson.course_id)
    items = [
        {key: value for key, value in item.items() if key not in _HIDDEN_KEYS}
        for item in _playable_items(lesson)
    ]
    return LessonDetail(
        id=lesson.id,
        course_id=lesson.course_id,
        ord=lesson.ord,
        title=lesson.title,
        language=lesson.payload.get("language") or (course.language if course else None),
        difficulty=_lesson_score(lesson),
        birdbrain_level=_lesson_level(lesson),
        items=items,
    )


@router.post("/lessons/{lesson_id}/check", response_model=CheckOut)
def check_item(
    lesson_id: int,
    body: CheckIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CheckOut:
    """Grade one question immediately (Duolingo-style feedback).

    Practice check: no hearts, no XP, nothing recorded — the scored run is
    the attempt submitted at the end of the lesson.
    """
    lesson = _owned_lesson(lesson_id, user, db)
    items = _playable_items(lesson)
    if not 0 <= body.index < len(items):
        raise HTTPException(status_code=400, detail=f"Invalid item index {body.index}")
    item = items[body.index]
    accepted = item.get("accepted_answers") or []
    ok = is_answer_correct(item.get("correct_answer", ""), body.answer, accepted)
    return CheckOut(
        index=body.index,
        correct=ok,
        correct_answer=item.get("correct_answer", ""),
        explanation=item.get("explanation"),
    )


@router.post("/lessons/{lesson_id}/attempt", response_model=AttemptOut)
def submit_attempt(
    lesson_id: int,
    body: AttemptIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AttemptOut:
    lesson = _owned_lesson(lesson_id, user, db)
    items = _playable_items(lesson)
    if len(body.answers) != len(items):
        raise HTTPException(
            status_code=400,
            detail=f"This lesson has {len(items)} questions, "
            f"got {len(body.answers)} answers",
        )

    refill_hearts(user)
    if user.hearts <= 0:
        raise HTTPException(
            status_code=403,
            detail="No hearts left — wait for one to refill before trying again.",
        )

    results: list[ItemResult] = []
    correct = 0
    for index, (item, given) in enumerate(zip(items, body.answers)):
        accepted = item.get("accepted_answers") or []
        ok = is_answer_correct(item.get("correct_answer", ""), given, accepted)
        if ok:
            correct += 1
        results.append(
            ItemResult(
                index=index,
                correct=ok,
                correct_answer=item.get("correct_answer", ""),
                given=given,
                explanation=item.get("explanation"),
            )
        )

    total = len(items)
    ratio = correct / total if total else 0.0
    passed = ratio >= settings.pass_threshold
    perfect = correct == total and total > 0
    xp = award_lesson_xp(correct, passed, perfect)

    user.xp += xp
    if passed:
        update_streak(user)
    else:
        consume_heart(user)

    db.add(
        Attempt(
            user_id=user.id,
            lesson_id=lesson.id,
            correct=correct,
            total=total,
            passed=1 if passed else 0,
            xp_awarded=xp,
        )
    )
    db.commit()

    level = _lesson_level(lesson)
    next_level = _update_profile_and_select(user.id, level, correct, total)

    return AttemptOut(
        lesson_id=lesson.id,
        correct=correct,
        total=total,
        passed=passed,
        xp_awarded=xp,
        results=results,
        hearts=user.hearts,
        streak=user.streak,
        xp=user.xp,
        next_difficulty=next_level,
    )


@router.get("/birdbrain/profile", response_model=BirdbrainProfileOut)
def get_birdbrain_profile(
    level: int = Query(1, ge=1, le=DIFFICULTY_LEVELS),
    user: User = Depends(get_current_user),
) -> BirdbrainProfileOut:
    """Read-only view of the learner profile and the difficulty it would pick next."""
    try:
        profile = _profile_store().get(user.id)
    except Exception:  # noqa: BLE001 - same fallback as attempts
        logger.exception("learner profile store failed; using in-memory fallback")
        profile = _memory_store.get(user.id)
    levels = [
        BirdbrainLevelOut(level=i + 1, accuracy=round(profile[i], 3))
        for i in range(DIFFICULTY_LEVELS)
    ]
    return BirdbrainProfileOut(
        levels=levels,
        current_difficulty=level,
        next_difficulty=_selector().next_level(profile, level),
    )


@router.post("/lessons/{lesson_id}/speech-attempt", response_model=SpeechAttemptOut)
async def submit_speech_attempt(
    lesson_id: int,
    index: int = Form(...),
    audio: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SpeechAttemptOut:
    lesson = _owned_lesson(lesson_id, user, db)
    items = _playable_items(lesson)
    if not 0 <= index < len(items):
        raise HTTPException(status_code=400, detail=f"Invalid item index {index}")
    item = items[index]
    if item.get("question_type") != "speak":
        raise HTTPException(
            status_code=400, detail="That question is not a speaking exercise"
        )

    data = await audio.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded audio is empty")
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Audio file is too large")

    storage_path = storage.save(audio.filename or "speech.mp3", data)
    try:
        transcript = await transcribe_audio(storage_path)
    except NotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except GenerationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    correct = is_answer_correct(
        item.get("correct_answer", ""), transcript, item.get("accepted_answers")
    )
    refill_hearts(user)
    xp = 0
    if correct:
        xp = settings.xp_per_correct
        user.xp += xp
    else:
        consume_heart(user)

    # Speaking practice feeds XP, the daily quest and the activity strip, but
    # stays out of `attempts` so it can't skew lesson best scores.
    db.add(
        SpeechAttempt(
            user_id=user.id,
            lesson_id=lesson.id,
            item_index=index,
            correct=1 if correct else 0,
            xp_awarded=xp,
        )
    )
    db.commit()

    return SpeechAttemptOut(
        transcript=transcript,
        correct=correct,
        correct_answer=item.get("correct_answer", ""),
        xp_awarded=xp,
        hearts=user.hearts,
    )
