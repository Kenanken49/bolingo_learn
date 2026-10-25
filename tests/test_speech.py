"""Speech endpoints without provider keys: clear 503s, never crashes."""

from __future__ import annotations

from datetime import date, datetime

from starlette.testclient import TestClient

from app.db import SessionLocal
from app.models import Course, Lesson, Material, User
from tests.conftest import SAMPLE_TEXT, signup


def _insert_speak_lesson(client: TestClient, headers: dict) -> int:
    """Create a material/course/lesson with one speaking item directly."""
    me = client.get("/api/me", headers=headers).json()
    with SessionLocal() as db:
        user = db.get(User, me["id"])
        assert user is not None
        material = Material(
            user_id=user.id,
            filename="speaking.mp3",
            kind="audio",
            language="es",
            storage_path="/tmp/unused.mp3",
            text=SAMPLE_TEXT,
            char_count=len(SAMPLE_TEXT),
            status="ready",
        )
        db.add(material)
        db.flush()
        course = Course(
            user_id=user.id,
            material_id=material.id,
            title="Speaking practice",
            language="es",
        )
        db.add(course)
        db.flush()
        lesson = Lesson(
            course_id=course.id,
            material_id=material.id,
            ord=0,
            title="Greetings",
            generator="offline",
            payload={
                "title": "Greetings",
                "language": "es",
                "items": [
                    {
                        "question_type": "speak",
                        "prompt": "Hola, buenos días",
                        "correct_answer": "hola buenos dias",
                        "explanation": None,
                    }
                ],
            },
        )
        db.add(lesson)
        db.commit()
        return lesson.id


def test_tts_requires_auth(client: TestClient) -> None:
    response = client.post("/api/tts", json={"text": "hola"})
    assert response.status_code == 401


def test_tts_not_configured_is_clear(client: TestClient) -> None:
    headers = signup(client)
    response = client.post("/api/tts", headers=headers, json={"text": "hola"})
    assert response.status_code == 503
    detail = response.json()["detail"]
    assert "ELEVENLABS_API_KEY" in detail
    assert "DEEPGRAM_API_KEY" in detail


def test_speech_attempt_not_configured_is_clear(client: TestClient) -> None:
    headers = signup(client)
    lesson_id = _insert_speak_lesson(client, headers)

    response = client.post(
        f"/api/lessons/{lesson_id}/speech-attempt",
        headers=headers,
        data={"index": "0"},
        files={"audio": ("answer.mp3", b"\xff\xfb\x90\x00" * 32, "audio/mpeg")},
    )
    assert response.status_code == 503
    assert "OPENAI_API_KEY" in response.json()["detail"]


def test_correct_speech_attempt_feeds_xp_quest_and_activity(
    client: TestClient, monkeypatch
) -> None:
    headers = signup(client, "speaker@bolingo.app")
    lesson_id = _insert_speak_lesson(client, headers)

    async def fake_transcribe(_path) -> str:
        return "hola buenos dias"

    monkeypatch.setattr("app.routers.lessons.transcribe_audio", fake_transcribe)

    response = client.post(
        f"/api/lessons/{lesson_id}/speech-attempt",
        headers=headers,
        data={"index": "0"},
        files={"audio": ("answer.mp3", b"\xff\xfb\x90\x00" * 32, "audio/mpeg")},
    )
    assert response.status_code == 200, response.text
    assert response.json()["correct"] is True
    assert response.json()["xp_awarded"] == 10

    me = client.get("/api/me", headers=headers).json()
    assert me["xp"] == 10
    assert me["daily_quest"]["current"] == 10
    assert me["daily_quest"]["progress_percent"] == 50
    assert me["activity_days"] == [date.today().isoformat()]

    # Speaking practice must not masquerade as a full lesson attempt.
    with SessionLocal() as db:
        lesson = db.get(Lesson, lesson_id)
        assert lesson is not None
        course_id = lesson.course_id
    course = client.get(f"/api/courses/{course_id}/lessons", headers=headers).json()
    assert course["lessons"][0]["best_correct"] is None
    assert course["lessons"][0]["passed"] is False


def test_speech_attempt_rejects_non_speak_items(client: TestClient) -> None:
    headers = signup(client)
    material_response = client.post(
        "/api/materials",
        headers=headers,
        files={"file": ("notes.txt", SAMPLE_TEXT.encode(), "text/plain")},
    )
    material_id = material_response.json()["id"]
    client.post(f"/api/materials/{material_id}/lessons", headers=headers)
    from tests.conftest import wait_for_material

    wait_for_material(client, headers, material_id)
    lesson_id = client.post(
        f"/api/materials/{material_id}/lessons", headers=headers
    ).json()["lesson_ids"][0]

    response = client.post(
        f"/api/lessons/{lesson_id}/speech-attempt",
        headers=headers,
        data={"index": "0"},
        files={"audio": ("answer.mp3", b"\xff\xfb\x90\x00" * 32, "audio/mpeg")},
    )
    assert response.status_code == 400
    assert "speaking" in response.json()["detail"]
