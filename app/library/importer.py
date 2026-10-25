"""Idempotent import of library courses into the database.

Courses and lessons are matched by slug and updated in place, so running the
import again refreshes content without creating duplicates.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import SessionLocal, init_db
from ..models import LibraryCourse, LibraryLesson
from .content import COURSES


def import_library(db: Session, courses: list[dict] = COURSES) -> int:
    """Upsert every course and its lessons. Returns the number of courses written."""
    for c_ord, data in enumerate(courses):
        course = db.scalar(select(LibraryCourse).where(LibraryCourse.slug == data["slug"]))
        if course is None:
            course = LibraryCourse(slug=data["slug"])
            db.add(course)
        course.title = data["title"]
        course.description = data["description"]
        course.source = data["source"]
        course.source_url = data["source_url"]
        course.ord = c_ord
        db.flush()

        existing = {l.slug: l for l in course.lessons}
        for l_ord, lesson_data in enumerate(data["lessons"]):
            lesson = existing.get(lesson_data["slug"])
            if lesson is None:
                lesson = LibraryLesson(course_id=course.id, slug=lesson_data["slug"])
                db.add(lesson)
            lesson.title = lesson_data["title"]
            lesson.body = lesson_data["body"]
            lesson.ord = l_ord
        db.flush()
    db.commit()
    return len(courses)


if __name__ == "__main__":
    init_db()
    with SessionLocal() as session:
        print(f"Imported {import_library(session)} library courses.")
