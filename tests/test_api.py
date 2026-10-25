"""End-to-end API flow: signup -> upload -> generate -> play -> score."""

from __future__ import annotations

from datetime import datetime, timedelta

from starlette.testclient import TestClient

from app.config import settings
from app.db import SessionLocal
from app.models import AuthToken, Lesson
from tests.conftest import PASSWORD, SAMPLE_TEXT, signup, upload_text, wait_for_material


def _correct_answers(lesson_id: int) -> list[str]:
    with SessionLocal() as db:
        lesson = db.get(Lesson, lesson_id)
        assert lesson is not None, "lesson missing from DB"
        return [
            item["correct_answer"] for item in lesson.payload.get("items", [])
        ]


def test_signup_login_and_me(client: TestClient) -> None:
    headers = signup(client, "me@bolingo.app")

    me = client.get("/api/me", headers=headers)
    assert me.status_code == 200
    body = me.json()
    assert body["email"] == "me@bolingo.app"
    assert body["xp"] == 0
    assert body["hearts"] == 5
    assert body["streak"] == 0

    login = client.post(
        "/api/auth/login", json={"email": "me@bolingo.app", "password": PASSWORD}
    )
    assert login.status_code == 200
    assert login.json()["user_id"] == body["id"]

    bad_login = client.post(
        "/api/auth/login", json={"email": "me@bolingo.app", "password": "wrong-pass"}
    )
    assert bad_login.status_code == 401

    duplicate = client.post(
        "/api/auth/signup",
        json={"email": "me@bolingo.app", "password": PASSWORD},
    )
    assert duplicate.status_code == 409


def test_expired_token_is_rejected_and_revoked(client: TestClient) -> None:
    headers = signup(client, "expired@bolingo.app")
    with SessionLocal() as db:
        token = db.query(AuthToken).one()
        token.created_at = datetime.now() - timedelta(
            seconds=settings.token_ttl_seconds + 60
        )
        db.commit()

    assert client.get("/api/me", headers=headers).status_code == 401
    # The expired row is deleted on first use, not checked forever.
    assert client.get("/api/me", headers=headers).status_code == 401
    with SessionLocal() as db:
        assert db.query(AuthToken).count() == 0


def test_logout_revokes_every_token(client: TestClient) -> None:
    headers = signup(client, "logout@bolingo.app")
    second = client.post(
        "/api/auth/login",
        json={"email": "logout@bolingo.app", "password": PASSWORD},
    ).json()["access_token"]
    second_headers = {"Authorization": f"Bearer {second}"}

    response = client.post("/api/auth/logout", headers=headers)
    assert response.status_code == 204
    assert response.content == b""

    assert client.get("/api/me", headers=headers).status_code == 401
    assert client.get("/api/me", headers=second_headers).status_code == 401


def test_requires_auth(client: TestClient) -> None:
    assert client.get("/api/materials").status_code == 401
    assert client.get("/api/me").status_code == 401
    assert (
        client.post("/api/materials", files={"file": ("a.txt", b"x", "text/plain")}).status_code
        == 401
    )


def test_unsupported_upload_rejected(client: TestClient) -> None:
    headers = signup(client)
    response = client.post(
        "/api/materials",
        headers=headers,
        files={"file": ("photo.png", b"\x89PNG", "image/png")},
    )
    assert response.status_code == 415


def test_full_lesson_flow(client: TestClient) -> None:
    headers = signup(client)
    material = upload_text(client, headers, SAMPLE_TEXT, filename="planets.txt")

    scheduled = client.post(f"/api/materials/{material['id']}/lessons", headers=headers)
    assert scheduled.status_code == 202, scheduled.text
    assert scheduled.json()["status"] == "processing"

    ready = wait_for_material(client, headers, material["id"])
    assert ready["status"] == "ready", ready.get("error")

    # Idempotent: a second trigger returns the same lessons.
    again = client.post(f"/api/materials/{material['id']}/lessons", headers=headers)
    assert again.status_code == 200
    lesson_ids = again.json()["lesson_ids"]
    assert lesson_ids, "expected at least one lesson"
    course_id = again.json()["course_id"]

    course = client.get(f"/api/courses/{course_id}/lessons", headers=headers)
    assert course.status_code == 200
    summaries = course.json()["lessons"]
    assert [s["id"] for s in summaries] == lesson_ids
    assert all(not s["passed"] for s in summaries)

    detail = client.get(f"/api/lessons/{lesson_ids[0]}", headers=headers)
    assert detail.status_code == 200
    items = detail.json()["items"]
    assert items, "lesson must have questions"
    # Answers must never ship to the client before scoring.
    for item in items:
        assert "correct_answer" not in item
        assert "accepted_answers" not in item

    answers = _correct_answers(lesson_ids[0])
    assert answers, "expected answer keys in stored payload"

    perfect = client.post(
        f"/api/lessons/{lesson_ids[0]}/attempt",
        headers=headers,
        json={"answers": answers},
    )
    assert perfect.status_code == 200, perfect.text
    result = perfect.json()
    assert result["passed"] is True
    assert result["correct"] == result["total"]
    assert result["xp_awarded"] > 0
    assert result["hearts"] == 5
    assert result["streak"] == 1
    assert all(r["correct"] for r in result["results"])

    me = client.get("/api/me", headers=headers).json()
    assert me["xp"] == result["xp_awarded"]
    assert me["streak"] == 1
    assert me["lessons_completed"] == 1

    # A failed attempt costs a heart but keeps the streak.
    failed = client.post(
        f"/api/lessons/{lesson_ids[0]}/attempt",
        headers=headers,
        json={"answers": ["wrong answer"] * len(answers)},
    )
    assert failed.status_code == 200
    failed_result = failed.json()
    assert failed_result["passed"] is False
    assert failed_result["hearts"] == 4
    assert failed_result["streak"] == 1
    # Results reveal the answers so the learner can review.
    assert failed_result["results"][0]["correct_answer"] == answers[0]

    course_after = client.get(f"/api/courses/{course_id}/lessons", headers=headers).json()
    assert course_after["lessons"][0]["passed"] is True
    assert course_after["lessons"][0]["best_correct"] == len(answers)


def test_instant_check_feedback(client: TestClient) -> None:
    headers = signup(client)
    material = upload_text(client, headers, SAMPLE_TEXT)
    client.post(f"/api/materials/{material['id']}/lessons", headers=headers)
    wait_for_material(client, headers, material["id"])
    lesson_id = client.post(
        f"/api/materials/{material['id']}/lessons", headers=headers
    ).json()["lesson_ids"][0]
    answers = _correct_answers(lesson_id)

    right = client.post(
        f"/api/lessons/{lesson_id}/check",
        headers=headers,
        json={"index": 0, "answer": answers[0]},
    )
    assert right.status_code == 200
    body = right.json()
    assert body["correct"] is True
    assert body["correct_answer"] == answers[0]

    wrong = client.post(
        f"/api/lessons/{lesson_id}/check",
        headers=headers,
        json={"index": 0, "answer": "definitely not it"},
    )
    assert wrong.json()["correct"] is False

    out_of_range = client.post(
        f"/api/lessons/{lesson_id}/check",
        headers=headers,
        json={"index": 99, "answer": "x"},
    )
    assert out_of_range.status_code == 400

    # Practice checks cost nothing and record nothing.
    me = client.get("/api/me", headers=headers).json()
    assert me["xp"] == 0
    assert me["hearts"] == 5

    intruder = signup(client, "intruder@bolingo.app")
    assert (
        client.post(
            f"/api/lessons/{lesson_id}/check",
            headers=intruder,
            json={"index": 0, "answer": answers[0]},
        ).status_code
        == 404
    )


def test_attempt_answer_count_mismatch(client: TestClient) -> None:
    headers = signup(client)
    material = upload_text(client, headers, SAMPLE_TEXT)
    client.post(f"/api/materials/{material['id']}/lessons", headers=headers)
    wait_for_material(client, headers, material["id"])
    lesson_ids = client.post(
        f"/api/materials/{material['id']}/lessons", headers=headers
    ).json()["lesson_ids"]

    response = client.post(
        f"/api/lessons/{lesson_ids[0]}/attempt",
        headers=headers,
        json={"answers": ["only one"]},
    )
    assert response.status_code == 400


def test_no_hearts_blocks_attempts(client: TestClient) -> None:
    headers = signup(client)
    material = upload_text(client, headers, SAMPLE_TEXT)
    client.post(f"/api/materials/{material['id']}/lessons", headers=headers)
    wait_for_material(client, headers, material["id"])
    lesson_id = client.post(
        f"/api/materials/{material['id']}/lessons", headers=headers
    ).json()["lesson_ids"][0]

    with SessionLocal() as db:
        from app.models import User

        user = db.query(User).filter(User.email == "learner@bolingo.app").one()
        user.hearts = 0
        db.commit()

    response = client.post(
        f"/api/lessons/{lesson_id}/attempt",
        headers=headers,
        json={"answers": ["x"] * len(_correct_answers(lesson_id))},
    )
    assert response.status_code == 403
    assert "hearts" in response.json()["detail"].lower()


def test_lessons_are_private_to_owner(client: TestClient) -> None:
    owner_headers = signup(client, "owner@bolingo.app")
    material = upload_text(client, owner_headers, SAMPLE_TEXT)
    client.post(f"/api/materials/{material['id']}/lessons", headers=owner_headers)
    wait_for_material(client, owner_headers, material["id"])
    lesson_id = client.post(
        f"/api/materials/{material['id']}/lessons", headers=owner_headers
    ).json()["lesson_ids"][0]
    course_id = client.get(f"/api/lessons/{lesson_id}", headers=owner_headers).json()[
        "course_id"
    ]

    intruder_headers = signup(client, "intruder@bolingo.app")
    assert client.get(f"/api/lessons/{lesson_id}", headers=intruder_headers).status_code == 404
    assert (
        client.get(f"/api/courses/{course_id}/lessons", headers=intruder_headers).status_code
        == 404
    )
    assert (
        client.post(
            f"/api/lessons/{lesson_id}/attempt",
            headers=intruder_headers,
            json={"answers": ["x"]},
        ).status_code
        == 404
    )
    assert (
        client.get(f"/api/materials/{material['id']}", headers=intruder_headers).status_code
        == 404
    )


def test_courses_list_is_owner_scoped(client: TestClient) -> None:
    assert client.get("/api/courses").status_code == 401

    owner_headers = signup(client, "courses-owner@bolingo.app")
    assert client.get("/api/courses", headers=owner_headers).json() == []

    material = upload_text(client, owner_headers, SAMPLE_TEXT, filename="planets.txt")
    client.post(f"/api/materials/{material['id']}/lessons", headers=owner_headers)
    wait_for_material(client, owner_headers, material["id"])
    course_id = client.post(
        f"/api/materials/{material['id']}/lessons", headers=owner_headers
    ).json()["course_id"]
    assert course_id

    mine = client.get("/api/courses", headers=owner_headers)
    assert mine.status_code == 200
    assert [c["id"] for c in mine.json()] == [course_id]
    listed = mine.json()[0]
    assert listed["title"]
    assert listed["material_id"] == material["id"]
    assert listed["lesson_count"] >= 1

    intruder_headers = signup(client, "courses-intruder@bolingo.app")
    assert client.get("/api/courses", headers=intruder_headers).json() == []


def test_catalog_lists_builtin_tracks(client: TestClient) -> None:
    """The built-in curriculum from courses.py is served to any learner."""
    assert client.get("/api/courses/catalog").status_code == 401

    headers = signup(client)
    response = client.get("/api/courses/catalog", headers=headers)
    assert response.status_code == 200
    tracks = response.json()

    assert [track["slug"] for track in tracks] == [
        "html-css-js",
        "python",
        "cpp",
        "data",            "devops",
            "operating-systems",
        ]
    for track in tracks:
        assert track["name"]
        assert track["description"]
        assert track["levels"], f"{track['slug']} has no levels"
        assert {level["number"] for level in track["levels"]} <= set(
            range(1, 7)
        )
        for level in track["levels"]:
            assert level["lessons"], f"{track['slug']} L{level['number']} empty"
            for lesson in level["lessons"]:
                assert lesson["title"]
                assert lesson["kind"]
                assert lesson["instruction"]
                assert 1 <= lesson["difficulty"] <= 5

    python = next(track for track in tracks if track["slug"] == "python")
    assert len(python["levels"]) == 6
    assert python["levels"][0]["lessons"][0]["title"]


def test_interrupted_generation_is_retriable(client: TestClient) -> None:
    """A material stuck 'processing' after a restart becomes a retryable failure."""
    from app.main import reset_interrupted_generations
    from app.models import Material

    headers = signup(client)
    material = upload_text(client, headers, SAMPLE_TEXT)
    with SessionLocal() as db:
        row = db.get(Material, material["id"])
        assert row is not None
        row.status = "processing"
        db.commit()

    reset_interrupted_generations()

    final = client.get(f"/api/materials/{material['id']}", headers=headers).json()
    assert final["status"] == "failed"
    assert "restart" in final["error"]

    trigger = client.post(f"/api/materials/{material['id']}/lessons", headers=headers)
    assert trigger.status_code == 202
    assert wait_for_material(client, headers, material["id"])["status"] == "ready"


def test_audio_without_transcript_fails_with_guidance(client: TestClient) -> None:
    headers = signup(client)
    response = client.post(
        "/api/materials",
        headers=headers,
        files={"file": ("lecture.mp3", b"\xff\xfb\x90\x00" * 64, "audio/mpeg")},
    )
    assert response.status_code == 201
    material_id = response.json()["id"]

    client.post(f"/api/materials/{material_id}/lessons", headers=headers)
    final = wait_for_material(client, headers, material_id)
    assert final["status"] == "failed"
    assert "OPENAI_API_KEY" in final["error"]


def test_audio_with_transcript_generates(client: TestClient) -> None:
    headers = signup(client)
    response = client.post(
        "/api/materials",
        headers=headers,
        files={"file": ("lecture.mp3", b"\xff\xfb\x90\x00" * 64, "audio/mpeg")},
        data={"transcript": SAMPLE_TEXT, "language": "en"},
    )
    assert response.status_code == 201
    material_id = response.json()["id"]

    client.post(f"/api/materials/{material_id}/lessons", headers=headers)
    final = wait_for_material(client, headers, material_id)
    assert final["status"] == "ready", final.get("error")
