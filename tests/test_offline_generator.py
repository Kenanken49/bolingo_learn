"""Offline generator: deterministic, valid, and honest about its limits."""

from __future__ import annotations

import pytest

from app.ai import GenerationError
from app.ai.offline import OfflineGenerator
from app.schemas import LessonPayload
from tests.conftest import SAMPLE_TEXT

GENERATOR = OfflineGenerator()


def _generate(**overrides) -> LessonPayload:
    kwargs = {
        "chunk": SAMPLE_TEXT,
        "index": 0,
        "total": 1,
        "language": "en",
        "title_hint": "planets",
    }
    kwargs.update(overrides)
    return GENERATOR.generate(**kwargs)


def test_output_matches_strict_contract() -> None:
    payload = _generate()
    assert isinstance(payload, LessonPayload)
    assert payload.title
    assert 1 <= len(payload.items) <= 8


def test_deterministic_for_same_input() -> None:
    first = _generate().model_dump()
    second = _generate().model_dump()
    assert first == second


def test_multiple_choice_answers_are_in_options() -> None:
    payload = _generate()
    for item in payload.items:
        if item.question_type == "multiple_choice":
            assert item.correct_answer in item.options
            assert len(set(item.options)) == len(item.options)


def test_fill_in_blank_items_have_blank_marker() -> None:
    payload = _generate()
    blanks = [i for i in payload.items if i.question_type == "fill_in_blank"]
    assert blanks, "expected at least one fill-in-blank exercise"
    for item in blanks:
        assert "____" in item.prompt
        assert item.correct_answer


def test_varied_chunks_do_not_crash() -> None:
    # Short but valid prose: generator must either produce a payload or a
    # clear GenerationError — never an unhandled exception.
    for text in (
        "Go now.",
        "One sentence is all there is.",
        SAMPLE_TEXT[:120],
        "L'océan bleu brille. La lune éclaire la nuit.",
    ):
        try:
            payload = _generate(chunk=text, index=1, total=2, language="fr")
        except GenerationError:
            continue
        assert payload.items


def test_no_vocabulary_raises_clear_error() -> None:
    with pytest.raises(GenerationError, match="vocabulary"):
        _generate(chunk="go go go go go")


def test_empty_chunk_raises() -> None:
    with pytest.raises(GenerationError):
        _generate(chunk="   ")
