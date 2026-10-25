"""Bolingo ORM models.

Bolingo - Language learning platform backend.
"""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    JSON,
    UniqueConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base

# JSON stored as JSONB on Postgres, plain JSON on SQLite.
# AI-generated lesson payloads have flexible per-question-type shapes,
# so they live as JSON documents.
JSON_COL = JSON().with_variant(JSONB(), "postgresql")


def now() -> datetime:
    """Naive local time -- used consistently for streaks and heart refills."""
    return datetime.now()


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))

    xp: Mapped[int] = mapped_column(Integer, default=0)
    streak: Mapped[int] = mapped_column(Integer, default=0)
    last_active_day: Mapped[date | None] = mapped_column(Date, nullable=True)
    hearts: Mapped[int] = mapped_column(Integer, default=5)
    hearts_updated_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    gems: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    tokens: Mapped[list["AuthToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    materials: Mapped[list["Material"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
    attempts: Mapped[list["Attempt"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    speech_attempts: Mapped[list["SpeechAttempt"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    quests: Mapped[list["UserQuest"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    leagues: Mapped[list["UserLeague"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    user: Mapped[User] = relationship(back_populates="tokens")


class Material(Base):
    """A user-uploaded learning material: PDF, text, or audio."""

    __tablename__ = "materials"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    kind: Mapped[str] = mapped_column(String(16))  # pdf | text | audio
    language: Mapped[str | None] = mapped_column(String(64), nullable=True)
    storage_path: Mapped[str] = mapped_column(String(512))
    text: Mapped[str] = mapped_column(Text, default="")
    char_count: Mapped[int] = mapped_column(Integer, default=0)

    status: Mapped[str] = mapped_column(String(16), default="uploaded")
    # uploaded | processing | ready | failed
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    owner: Mapped[User] = relationship(back_populates="materials")
    # Deleting a material keeps its courses; they are unlinked (material_id=NULL).
    courses: Mapped[list["Course"]] = relationship(back_populates="material")


class Course(Base):
    """Relational course structure; one course is created per material."""

    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    material_id: Mapped[int | None] = mapped_column(
        ForeignKey("materials.id"), index=True, nullable=True
    )
    title: Mapped[str] = mapped_column(String(255))
    language: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    material: Mapped[Material | None] = relationship(back_populates="courses")
    lessons: Mapped[list["Lesson"]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="Lesson.ord",
    )


class Lesson(Base):
    """One generated lesson. `payload` is the strict-validated lesson JSON."""

    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), index=True)
    material_id: Mapped[int | None] = mapped_column(
        ForeignKey("materials.id"), index=True, nullable=True
    )
    ord: Mapped[int] = mapped_column(Integer, default=0)
    title: Mapped[str] = mapped_column(String(255))
    generator: Mapped[str] = mapped_column(String(32), default="offline")
    payload: Mapped[dict] = mapped_column(JSON_COL)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    course: Mapped[Course] = relationship(back_populates="lessons")
    attempts: Mapped[list["Attempt"]] = relationship(
        back_populates="lesson", cascade="all, delete-orphan"
    )
    speech_attempts: Mapped[list["SpeechAttempt"]] = relationship(
        back_populates="lesson", cascade="all, delete-orphan"
    )


class LibraryCourse(Base):
    """A curated course from an external source, stored for rendering.

    `source` names where the content came from; `source_url` links back to it.
    """

    __tablename__ = "library_courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(String(64))
    source_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    ord: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    lessons: Mapped[list["LibraryLesson"]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="LibraryLesson.ord",
    )


class LibraryLesson(Base):
    """One lesson in a library course. `body` is Markdown."""

    __tablename__ = "library_lessons"
    __table_args__ = (UniqueConstraint("course_id", "slug"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("library_courses.id"), index=True)
    slug: Mapped[str] = mapped_column(String(64))
    ord: Mapped[int] = mapped_column(Integer, default=0)
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)

    course: Mapped[LibraryCourse] = relationship(back_populates="lessons")


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), index=True)
    correct: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer, default=0)
    passed: Mapped[int] = mapped_column(Integer, default=0)  # 0/1 (bool on SQLite)
    xp_awarded: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    user: Mapped[User] = relationship(back_populates="attempts")
    lesson: Mapped[Lesson] = relationship(back_populates="attempts")


class SpeechAttempt(Base):
    """One scored speaking exercise.

    Kept separate from `Attempt` so recording a spoken answer doesn't look like
    a full lesson attempt in course progress and best-score summaries, while
    still feeding XP, the daily quest, and the activity strip.
    """

    __tablename__ = "speech_attempts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), index=True)
    item_index: Mapped[int] = mapped_column(Integer, default=0)
    correct: Mapped[int] = mapped_column(Integer, default=0)  # 0/1
    xp_awarded: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    user: Mapped[User] = relationship(back_populates="speech_attempts")
    lesson: Mapped[Lesson] = relationship(back_populates="speech_attempts")


class UserQuest(Base):
    __tablename__ = "user_quests"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    quest_type: Mapped[str] = mapped_column(String(32))  # daily | weekly | milestone
    target: Mapped[int] = mapped_column(Integer, default=0)
    current: Mapped[int] = mapped_column(Integer, default=0)
    completed: Mapped[int] = mapped_column(Integer, default=0)  # 0/1
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)

    user: Mapped[User] = relationship(back_populates="quests")


class UserLeague(Base):
    __tablename__ = "user_leagues"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    league_tier: Mapped[str] = mapped_column(String(32))  # bronze, silver, gold, diamond, master
    league_points: Mapped[int] = mapped_column(Integer, default=0)  # XP this week
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    user: Mapped[User] = relationship(back_populates="leagues")


class LeagueSeason(Base):
    """Marker row proving one weekly season rollover has been applied.

    One row per Monday: its presence makes rollover idempotent across
    requests and restarts without a scheduler.
    """

    __tablename__ = "league_seasons"

    week_start: Mapped[date] = mapped_column(Date, primary_key=True)
    processed_at: Mapped[datetime] = mapped_column(DateTime, default=now)

class CatalogLessonCompletion(Base):
    """A built-in catalog lesson the learner has finished (awards gems once)."""

    __tablename__ = "catalog_lesson_completions"
    __table_args__ = (
        UniqueConstraint("user_id", "track_slug", "level", "lesson_index"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    track_slug: Mapped[str] = mapped_column(String(64))
    level: Mapped[int] = mapped_column(Integer)
    lesson_index: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class PushSubscription(Base):
    """One browser's Web Push endpoint for a learner."""

    __tablename__ = "push_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    endpoint: Mapped[str] = mapped_column(String(512), unique=True)
    p256dh: Mapped[str] = mapped_column(String(255))
    auth: Mapped[str] = mapped_column(String(255))
    last_reminded_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class CatalogLevelUnlock(Base):
    """A catalog level the learner paid gems to open. Level 1 is always open."""

    __tablename__ = "catalog_level_unlocks"
    __table_args__ = (UniqueConstraint("user_id", "track_slug", "level"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    track_slug: Mapped[str] = mapped_column(String(64))
    level: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
