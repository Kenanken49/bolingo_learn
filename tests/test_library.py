"""Library import and read-only library endpoints."""

from __future__ import annotations

from sqlalchemy import func, select

from app.db import SessionLocal
from app.library.content import COURSES
from app.library.importer import import_library
from app.models import LibraryCourse, LibraryLesson


def _import_once() -> None:
    with SessionLocal() as db:
        import_library(db)


def test_import_is_idempotent(client):
    _import_once()
    _import_once()

    with SessionLocal() as db:
        courses = db.scalar(select(func.count()).select_from(LibraryCourse))
        lessons = db.scalar(select(func.count()).select_from(LibraryLesson))

    assert courses == len(COURSES)
    assert lessons == sum(len(c["lessons"]) for c in COURSES)


def test_list_courses_returns_summaries_in_order(auth):
    client, headers = auth
    _import_once()

    response = client.get("/api/library/courses", headers=headers)

    assert response.status_code == 200, response.text
    data = response.json()
    assert [c["slug"] for c in data] == [c["slug"] for c in COURSES]
    first = data[0]
    assert first["title"] == COURSES[0]["title"]
    assert first["lesson_count"] == len(COURSES[0]["lessons"])
    assert "lessons" not in first


def test_get_course_returns_lessons_with_bodies(auth):
    client, headers = auth
    _import_once()
    expected = COURSES[0]

    response = client.get(f"/api/library/courses/{expected['slug']}", headers=headers)

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["title"] == expected["title"]
    assert [l["slug"] for l in data["lessons"]] == [l["slug"] for l in expected["lessons"]]
    assert data["lessons"][0]["body"] == expected["lessons"][0]["body"]


def test_get_unknown_course_is_404(auth):
    client, headers = auth
    _import_once()

    response = client.get("/api/library/courses/does-not-exist", headers=headers)

    assert response.status_code == 404


def test_library_requires_login(client):
    _import_once()

    assert client.get("/api/library/courses").status_code == 401
    assert client.get("/api/library/courses/html-css-basics").status_code == 401
