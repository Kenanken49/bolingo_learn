"""Strict Pydantic schemas for AI-generated lesson JSON.

The LLM must output JSON that validates against these models exactly:
`extra="forbid"` everywhere, a discriminated `question_type`, and semantic
checks (e.g. the correct answer must appear in the options list).
"""

from __future__ import annotations

import re
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

QuestionType = Literal[
    "multiple_choice",
    "fill_in_blank",
    "translate",
    "listening",
    "speak",
]


def _clean(value: str) -> str:
    return value.strip()


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class MultipleChoiceItem(_Strict):
    question_type: Literal["multiple_choice"] = "multiple_choice"
    prompt: str = Field(min_length=1)
    options: list[str] = Field(min_length=2, max_length=8)
    correct_answer: str = Field(min_length=1)
    explanation: str | None = None

    @field_validator("options")
    @classmethod
    def options_unique(cls, value: list[str]) -> list[str]:
        cleaned = [_clean(v) for v in value]
        if len(set(cleaned)) != len(cleaned):
            raise ValueError("options must be unique")
        if any(not v for v in cleaned):
            raise ValueError("options must not be empty")
        return cleaned

    @model_validator(mode="after")
    def answer_in_options(self) -> "MultipleChoiceItem":
        if self.correct_answer not in self.options:
            raise ValueError(
                f"correct_answer {self.correct_answer!r} is not one of the options"
            )
        return self


class FillInBlankItem(_Strict):
    question_type: Literal["fill_in_blank"] = "fill_in_blank"
    prompt: str = Field(min_length=1)  # contains ____ where the blank goes
    correct_answer: str = Field(min_length=1)
    options: list[str] | None = None  # optional word bank
    explanation: str | None = None

    @model_validator(mode="after")
    def bank_must_contain_answer(self) -> "FillInBlankItem":
        if self.options is not None:
            if len(self.options) < 2:
                raise ValueError("options needs at least 2 entries")
            if len(set(self.options)) != len(self.options):
                raise ValueError("options must be unique")
            if self.correct_answer not in self.options:
                raise ValueError("correct_answer is not in options")
        return self


class TranslateItem(_Strict):
    question_type: Literal["translate"] = "translate"
    prompt: str = Field(min_length=1)
    correct_answer: str = Field(min_length=1)
    accepted_answers: list[str] = Field(default_factory=list)
    explanation: str | None = None


class ListeningItem(_Strict):
    """Audio is produced on demand via POST /api/tts from `prompt`."""

    question_type: Literal["listening"] = "listening"
    prompt: str = Field(min_length=1)  # the sentence to speak aloud
    options: list[str] = Field(min_length=2, max_length=8)
    correct_answer: str = Field(min_length=1)
    explanation: str | None = None

    @field_validator("options")
    @classmethod
    def options_unique(cls, value: list[str]) -> list[str]:
        cleaned = [_clean(v) for v in value]
        if len(set(cleaned)) != len(cleaned):
            raise ValueError("options must be unique")
        return cleaned

    @model_validator(mode="after")
    def answer_in_options(self) -> "ListeningItem":
        if self.correct_answer not in self.options:
            raise ValueError("correct_answer is not one of the options")
        return self


class SpeakItem(_Strict):
    """Learner records themselves; evaluation goes through Whisper."""

    question_type: Literal["speak"] = "speak"
    prompt: str = Field(min_length=1)  # sentence the learner should say
    correct_answer: str = Field(min_length=1)  # reference transcript
    explanation: str | None = None


LessonItem = Annotated[
    Union[
        MultipleChoiceItem,
        FillInBlankItem,
        TranslateItem,
        ListeningItem,
        SpeakItem,
    ],
    Field(discriminator="question_type"),
]


class LessonPayload(_Strict):
    """The strict JSON contract every provider must produce."""

    title: str = Field(min_length=1, max_length=255)
    language: str | None = Field(default=None, max_length=64)
    items: list[LessonItem] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def item_types_unique_enough(self) -> "LessonPayload":
        if not self.items:
            raise ValueError("items must not be empty")
        return self


# ---------------------------------------------------------------- auth


_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class SignUpIn(_Strict):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def email_shape(cls, value: str) -> str:
        value = value.lower()
        if not _EMAIL_RE.match(value):
            raise ValueError("invalid email address")
        return value


class LoginIn(_Strict):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def lower(cls, value: str) -> str:
        return value.lower()


class TokenOut(_Strict):
    access_token: str
    token_type: str = "bearer"
    user_id: int


LeagueTier = Literal["bronze", "silver", "gold", "diamond", "master"]
LeagueZone = Literal["promotion", "safe", "demotion"]


class DailyQuestOut(_Strict):
    id: int
    quest_type: str
    target: int
    current: int
    progress_percent: float
    completed: bool


class UserOut(_Strict):
    id: int
    email: str
    xp: int
    streak: int
    hearts: int
    hearts_refill_seconds: int
    gems: int = 0
    lessons_completed: int = 0
    daily_quest: DailyQuestOut | None = None
    activity_days: list[str] = Field(default_factory=list)
    league_tier: LeagueTier = "bronze"
    league_points: int = 0  # XP earned this week
    league_next_in: int = 0  # weekly XP to the promotion zone
    league_rank: int | None = None
    league_zone: LeagueZone = "safe"
    created_at: str


class LeaderboardEntry(_Strict):
    user_id: int
    name: str
    xp: int  # XP earned this week
    streak: int
    zone: LeagueZone = "safe"


class LeaderboardOut(_Strict):
    tier: LeagueTier
    week_start: str
    entries: list[LeaderboardEntry]
    me: LeaderboardEntry


# ---------------------------------------------------------- materials


class MaterialOut(_Strict):
    id: int
    filename: str
    kind: str
    language: str | None
    status: str
    error: str | None
    char_count: int
    created_at: str


class GenerateOut(_Strict):
    course_id: int | None = None  # unknown until generation finishes
    material_id: int
    status: str
    lesson_ids: list[int] = Field(default_factory=list)


class LessonSummary(_Strict):
    id: int
    ord: int
    title: str
    item_count: int
    best_correct: int | None = None
    passed: bool = False


class CourseOut(_Strict):
    id: int
    title: str
    language: str | None
    material_id: int
    lessons: list[LessonSummary]


class CourseSummary(_Strict):
    """One row in the learner's course list (no lesson payloads)."""

    id: int
    title: str
    language: str | None
    material_id: int
    lesson_count: int


class CatalogLessonOut(_Strict):
    """One outline lesson from the built-in curriculum (`courses.py`)."""

    title: str
    kind: str
    instruction: str
    difficulty: int


class CatalogLevelOut(_Strict):
    number: int
    lessons: list[CatalogLessonOut]


class CatalogTrackOut(_Strict):
    """A built-in beginner-to-professional track (not learner-generated)."""

    slug: str
    name: str
    description: str
    levels: list[CatalogLevelOut]


class LessonDetail(_Strict):
    id: int
    course_id: int
    ord: int
    title: str
    language: str | None
    difficulty: int = Field(default=1, ge=1, le=5)  # course difficulty score
    birdbrain_level: int = Field(default=1, ge=1, le=10)
    items: list[dict]  # correct answers stripped until an attempt is scored


# ----------------------------------------------------------- attempts


class AttemptIn(_Strict):
    answers: list[str]


class CheckIn(_Strict):
    index: int = Field(ge=0)
    answer: str = ""


class CheckOut(_Strict):
    index: int
    correct: bool
    correct_answer: str
    explanation: str | None = None


class ItemResult(_Strict):
    index: int
    correct: bool
    correct_answer: str
    given: str
    explanation: str | None = None


class AttemptOut(_Strict):
    lesson_id: int
    correct: int
    total: int
    passed: bool
    xp_awarded: int
    results: list[ItemResult]
    hearts: int
    streak: int
    xp: int
    next_difficulty: int


class SpeechAttemptOut(_Strict):
    transcript: str
    correct: bool
    correct_answer: str
    xp_awarded: int
    hearts: int


class TtsIn(_Strict):
    text: str = Field(min_length=1, max_length=2000)


class TtsOut(_Strict):
    text: str
    provider: str
    audio_base64: str
    audio_url: str | None = None
    content_type: str


class BirdbrainLevelOut(_Strict):
    level: int
    accuracy: float


class BirdbrainProfileOut(_Strict):
    levels: list[BirdbrainLevelOut]
    next_difficulty: int
    current_difficulty: int
