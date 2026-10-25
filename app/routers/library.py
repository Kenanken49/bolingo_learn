"""Read-only access to library courses (original and external-source lessons)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import LibraryCourse, User

router = APIRouter(prefix="/api/library", tags=["library"])


class _Out(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LibraryCourseSummaryOut(_Out):
    slug: str
    title: str
    description: str
    source: str
    source_url: str | None
    lesson_count: int


class LibraryLessonOut(_Out):
    slug: str
    title: str
    body: str


class LibraryCourseOut(LibraryCourseSummaryOut):
    lessons: list[LibraryLessonOut]


def _summary(course: LibraryCourse) -> LibraryCourseSummaryOut:
    return LibraryCourseSummaryOut(
        slug=course.slug,
        title=course.title,
        description=course.description,
        source=course.source,
        source_url=course.source_url,
        lesson_count=len(course.lessons),
    )


@router.get("/courses", response_model=list[LibraryCourseSummaryOut])
def list_courses(
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[LibraryCourseSummaryOut]:
    courses = db.scalars(select(LibraryCourse).order_by(LibraryCourse.ord)).all()
    return [_summary(c) for c in courses]


@router.get("/courses/{slug}", response_model=LibraryCourseOut)
def get_course(
    slug: str,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LibraryCourseOut:
    course = db.scalar(select(LibraryCourse).where(LibraryCourse.slug == slug))
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return LibraryCourseOut(
        **_summary(course).model_dump(),
        lessons=[
            LibraryLessonOut(slug=l.slug, title=l.title, body=l.body)
            for l in course.lessons
        ],
    )
