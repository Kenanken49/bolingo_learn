"""Lesson quality: difficulty scores, Birdbrain level mapping and item validation."""

from __future__ import annotations

from app.routers.lessons import _lesson_level, _lesson_score, _playable_items
from app.services.difficulty_score import MAX_SCORE, MIN_SCORE, course_score


class _Lesson:
    """Minimal stand-in for the ORM row: only `payload` and `id` are read."""

    def __init__(self, payload: dict, lesson_id: int = 1) -> None:
        self.payload = payload
        self.id = lesson_id


def test_course_score_rises_from_min_to_max() -> None:
    total = 6
    scores = [course_score(i, total) for i in range(total)]
    assert scores[0] == MIN_SCORE
    assert scores[-1] == MAX_SCORE
    assert scores == sorted(scores)


def test_single_lesson_course_gets_minimum_score() -> None:
    assert course_score(0, 1) == MIN_SCORE
    assert course_score(0, 0) == MIN_SCORE


def test_birdbrain_level_spans_one_to_ten() -> None:
    levels = [_lesson_level(_Lesson({"difficulty": s})) for s in range(1, 6)]
    assert levels[0] == 1
    assert levels[-1] == 10
    assert levels == sorted(levels)
    assert all(1 <= level <= 10 for level in levels)


def test_missing_or_invalid_score_defaults_to_level_one() -> None:
    for payload in ({}, {"difficulty": 0}, {"difficulty": 9}, {"difficulty": "3"}):
        lesson = _Lesson(payload)
        assert _lesson_score(lesson) == 1
        assert _lesson_level(lesson) == 1


def _mc(prompt: str, options: list[str], answer: str) -> dict:
    return {
        "question_type": "multiple_choice",
        "prompt": prompt,
        "options": options,
        "correct_answer": answer,
    }


def test_playable_items_drop_malformed_questions() -> None:
    good = _mc("Pick one", ["a", "b"], "a")
    duplicate_options = _mc("Dup", ["a", "a"], "a")
    answer_missing = _mc("Missing", ["x", "y"], "z")
    empty_prompt = _mc("", ["a", "b"], "a")
    lesson = _Lesson({"items": [good, duplicate_options, answer_missing, empty_prompt]})

    assert _playable_items(lesson) == [good]


def test_playable_items_keep_order_so_indices_stay_stable() -> None:
    first = _mc("First", ["a", "b"], "a")
    second = _mc("Second", ["c", "d"], "d")
    lesson = _Lesson({"items": [first, _mc("Bad", ["a", "a"], "a"), second]})

    assert _playable_items(lesson) == [first, second]
