"""Catalog progress: lesson completion pays gems, levels unlock with gems."""

from __future__ import annotations

from starlette.testclient import TestClient

from app.db import SessionLocal
from app.models import User
from courses import all_courses
from tests.conftest import signup

GEMS_PER_LESSON = 5
GEMS_PER_UNLOCK = 50


def _set_gems(email: str, gems: int) -> None:
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).one()
        user.gems = gems
        db.commit()


def _gems(email: str) -> int:
    with SessionLocal() as db:
        return db.query(User).filter(User.email == email).one().gems


def _track_with_two_levels():
    return next(track for track in all_courses() if len(track.levels) >= 2)


def test_progress_requires_auth(client: TestClient) -> None:
    assert client.get("/api/catalog/progress").status_code == 401


def test_progress_starts_with_only_level_one_open(client: TestClient) -> None:
    headers = signup(client, "fresh@bolingo.app")
    body = client.get("/api/catalog/progress", headers=headers).json()

    assert body["gems"] == 0
    assert body["gems_per_lesson"] == GEMS_PER_LESSON
    assert body["gems_per_unlock"] == GEMS_PER_UNLOCK
    track = next(t for t in body["tracks"] if t["slug"] == all_courses()[0].slug)
    assert track["levels"][0]["unlocked"] is True
    assert all(not level["unlocked"] for level in track["levels"][1:])


def test_completing_a_lesson_pays_gems_once(client: TestClient) -> None:
    email = "earner@bolingo.app"
    headers = signup(client, email)
    track = all_courses()[0]
    payload = {"track_slug": track.slug, "level": 1, "lesson_index": 0}

    first = client.post("/api/catalog/lessons/complete", json=payload, headers=headers)
    assert first.status_code == 200
    assert first.json() == {
        "gems_awarded": GEMS_PER_LESSON,
        "gems": GEMS_PER_LESSON,
        "already_completed": False,
    }

    again = client.post("/api/catalog/lessons/complete", json=payload, headers=headers)
    assert again.json() == {
        "gems_awarded": 0,
        "gems": GEMS_PER_LESSON,
        "already_completed": True,
    }
    assert _gems(email) == GEMS_PER_LESSON

    body = client.get("/api/catalog/progress", headers=headers).json()
    lesson = next(t for t in body["tracks"] if t["slug"] == track.slug)["levels"][0]["lessons"][0]
    assert lesson["completed"] is True


def test_locked_level_cannot_be_completed(client: TestClient) -> None:
    headers = signup(client, "locked@bolingo.app")
    track = _track_with_two_levels()
    response = client.post(
        "/api/catalog/lessons/complete",
        json={"track_slug": track.slug, "level": 2, "lesson_index": 0},
        headers=headers,
    )
    assert response.status_code == 403


def test_invalid_lesson_index_is_rejected(client: TestClient) -> None:
    headers = signup(client, "index@bolingo.app")
    track = all_courses()[0]
    response = client.post(
        "/api/catalog/lessons/complete",
        json={"track_slug": track.slug, "level": 1, "lesson_index": 9999},
        headers=headers,
    )
    assert response.status_code == 400


def test_unlock_needs_gems_and_previous_level(client: TestClient) -> None:
    email = "unlock@bolingo.app"
    headers = signup(client, email)
    track = _track_with_two_levels()
    url = "/api/catalog/levels/unlock"

    skipped = client.post(url, json={"track_slug": track.slug, "level": 3}, headers=headers)
    if len(track.levels) >= 3:
        assert skipped.status_code == 409

    poor = client.post(url, json={"track_slug": track.slug, "level": 2}, headers=headers)
    assert poor.status_code == 402

    _set_gems(email, GEMS_PER_UNLOCK)
    opened = client.post(url, json={"track_slug": track.slug, "level": 2}, headers=headers)
    assert opened.status_code == 200
    assert opened.json() == {"gems": 0, "unlocked": True}

    body = client.get("/api/catalog/progress", headers=headers).json()
    levels = next(t for t in body["tracks"] if t["slug"] == track.slug)["levels"]
    assert levels[1]["unlocked"] is True

    # Once open, a level is unlocked again for free, and it charges nothing.
    repeat = client.post(url, json={"track_slug": track.slug, "level": 2}, headers=headers)
    assert repeat.json() == {"gems": 0, "unlocked": True}


def test_unlocked_level_lets_learner_complete_its_lessons(client: TestClient) -> None:
    email = "level2@bolingo.app"
    headers = signup(client, email)
    track = _track_with_two_levels()
    _set_gems(email, GEMS_PER_UNLOCK)
    client.post(
        "/api/catalog/levels/unlock", json={"track_slug": track.slug, "level": 2}, headers=headers
    )

    response = client.post(
        "/api/catalog/lessons/complete",
        json={"track_slug": track.slug, "level": 2, "lesson_index": 0},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["gems_awarded"] == GEMS_PER_LESSON


def test_unknown_track_is_404(client: TestClient) -> None:
    headers = signup(client, "ghost@bolingo.app")
    response = client.post(
        "/api/catalog/levels/unlock",
        json={"track_slug": "no-such-track", "level": 2},
        headers=headers,
    )
    assert response.status_code == 404


def test_me_reports_gems(client: TestClient) -> None:
    email = "me-gems@bolingo.app"
    headers = signup(client, email)
    _set_gems(email, 12)
    assert client.get("/api/me", headers=headers).json()["gems"] == 12
