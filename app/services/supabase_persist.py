"""Persist a generated lesson JSON payload into the JSONB ``Lesson.payload`` column.

The existing SQLAlchemy model already declares the column:

    payload: Mapped[dict] = mapped_column(JSON_COL)  # JSONB on Postgres, JSON on SQLite

This module is the thin "cache storage" layer the Phase-1 spec asks for: take the
validated ``LessonPayload`` (which matches the strict Pydantic schema every provider
produces) and upsert it against a lesson, scoped to the authenticated user so no other
learner can read or overwrite it.  The call is idempotent — re-running it with the same
lesson id replaces the payload but keeps the lesson id, so a retry after a restart is
safe.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from ..models import Course, Lesson


def _lesson_owned_by_user(session: Session, lesson_id: int, user_id: int) -> Lesson | None:
    row = session.get(Lesson, lesson_id)
    if row is None:
        return None
    # The course owns the lesson; verify the owner through the course chain.
    course = session.get(Course, row.course_id)
    if course is None or course.user_id != user_id:
        return None
    return row


def cache_lesson_payload(db: Session, lesson_id: int, payload: dict, user_id: int) -> Lesson:
    """Upsert a validated lesson payload under the given user.

    Returns the same lesson row, now holding the new payload.  Idempotent: a retry with
    the same lesson id replaces the payload but keeps the lesson id.
    """
    lesson = _lesson_owned_by_user(db, lesson_id, user_id)
    if lesson is None:
        raise ValueError(f"Lesson {lesson_id} is not owned by user {user_id}")
    lesson.payload = payload
    db.commit()
    db.refresh(lesson)
    return lesson


def cache_lessons_for_user(
    db: Session, course_id: int, lessons: list[dict], user_id: int
) -> list[Lesson]:
    """Bulk-cache a list of validated lesson payloads for a user's course."""
    course = db.get(Course, course_id)
    if course is None or course.user_id != user_id:
        raise ValueError(f"Course {course_id} is not owned by user {user_id}")

    cached: list[Lesson] = []
    for payload in lessons:
        lesson = _lesson_owned_by_user(db, payload["id"], user_id)
        if lesson is None:
            raise ValueError(f"Lesson {payload['id']} not found in course {course_id}")
        lesson.payload = payload
        db.commit()
        db.refresh(lesson)
        cached.append(lesson)
    return cached
