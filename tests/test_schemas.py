"""The strict-JSON lesson contract every provider must satisfy."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas import LessonPayload, MultipleChoiceItem, SpeakItem


def _valid_payload() -> dict:
    return {
        "title": "Solar System Basics",
        "language": "en",
        "items": [
            {
                "question_type": "multiple_choice",
                "prompt": "The closest planet to the Sun is ____.",
                "options": ["Mercury", "Venus", "Earth", "Mars"],
                "correct_answer": "Mercury",
                "explanation": "Mercury orbits closest to the Sun.",
            },
            {
                "question_type": "fill_in_blank",
                "prompt": "Saturn is famous for its ____.",
                "correct_answer": "rings",
                "options": None,
                "explanation": None,
            },
            {
                "question_type": "translate",
                "prompt": "Where is the library?",
                "correct_answer": "¿Dónde está la biblioteca?",
                "accepted_answers": ["donde esta la biblioteca"],
                "explanation": None,
            },
            {
                "question_type": "listening",
                "prompt": "The solar system has eight planets.",
                "options": ["eight planets", "seven planets", "nine planets"],
                "correct_answer": "eight planets",
                "explanation": None,
            },
            {
                "question_type": "speak",
                "prompt": "Hola, buenos días",
                "correct_answer": "hola buenos dias",
                "explanation": None,
            },
        ],
    }


def test_valid_payload_passes() -> None:
    payload = LessonPayload.model_validate(_valid_payload())
    assert len(payload.items) == 5
    assert payload.items[0].question_type == "multiple_choice"


def test_answer_must_be_in_options() -> None:
    bad = _valid_payload()
    bad["items"][0]["correct_answer"] = "Jupiter"
    with pytest.raises(ValidationError, match="not one of the options"):
        LessonPayload.model_validate(bad)


def test_extra_keys_forbidden() -> None:
    bad = _valid_payload()
    bad["items"][0]["hint_text"] = "sneaky"
    with pytest.raises(ValidationError):
        LessonPayload.model_validate(bad)


def test_unknown_question_type_rejected() -> None:
    bad = _valid_payload()
    bad["items"][0]["question_type"] = "essay"
    with pytest.raises(ValidationError):
        LessonPayload.model_validate(bad)


def test_duplicate_options_rejected() -> None:
    with pytest.raises(ValidationError, match="unique"):
        MultipleChoiceItem.model_validate(
            {
                "question_type": "multiple_choice",
                "prompt": "Pick one",
                "options": ["a", "a", "b"],
                "correct_answer": "a",
            }
        )


def test_word_bank_must_contain_answer() -> None:
    with pytest.raises(ValidationError, match="correct_answer is not in options"):
        LessonPayload.model_validate(
            {
                "title": "Banks",
                "items": [
                    {
                        "question_type": "fill_in_blank",
                        "prompt": "The answer is ____",
                        "correct_answer": "yes",
                        "options": ["no", "maybe"],
                    }
                ],
            }
        )


def test_empty_items_rejected() -> None:
    with pytest.raises(ValidationError):
        LessonPayload.model_validate({"title": "Empty", "items": []})


def test_discriminator_maps_types() -> None:
    payload = LessonPayload.model_validate(_valid_payload())
    types = [item.question_type for item in payload.items]
    assert types == [
        "multiple_choice",
        "fill_in_blank",
        "translate",
        "listening",
        "speak",
    ]
    speak = payload.items[-1]
    assert isinstance(speak, SpeakItem)
