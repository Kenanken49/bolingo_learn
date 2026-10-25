"""Test environment.

Environment variables are set BEFORE any `app` import so the app binds to a
throwaway SQLite database and the offline generator, with provider keys
stripped from the shell so tests never touch the network.
"""

from __future__ import annotations

import os
import tempfile
import time
from pathlib import Path

_TMP = Path(tempfile.mkdtemp(prefix="bolingo-tests-"))
os.environ["BOLINGO_DATABASE_URL"] = f"sqlite:///{_TMP / 'test.db'}"
os.environ["BOLINGO_UPLOAD_DIR"] = str(_TMP / "uploads")
os.environ["LLM_PROVIDER"] = "offline"
# Background jobs would touch the database mid-test and apply rollovers before
# a test has seeded last week's attempts.
os.environ["BOLINGO_SCHEDULER_ENABLED"] = "0"
for _provider_key in ("OPENAI_API_KEY", "ELEVENLABS_API_KEY", "DEEPGRAM_API_KEY"):
    os.environ.pop(_provider_key, None)

import pytest
from starlette.testclient import TestClient

PASSWORD = "correct horse battery"


@pytest.fixture()
def client():
    from app.db import Base, engine
    from app.events import hub
    from app.main import app

    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    hub._logs.clear()  # events outlive requests; don't leak across tests

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def auth(client):
    """Sign up a learner and return (client, headers)."""
    return client, signup(client, f"learner-{time.monotonic_ns()}@bolingo.app")


def signup(client: TestClient, email: str = "learner@bolingo.app") -> dict:
    response = client.post(
        "/api/auth/signup", json={"email": email, "password": PASSWORD}
    )
    assert response.status_code == 201, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def upload_text(
    client: TestClient,
    headers: dict,
    text: str,
    filename: str = "notes.txt",
    language: str | None = "es",
) -> dict:
    data = {"language": language} if language else {}
    response = client.post(
        "/api/materials",
        headers=headers,
        files={"file": (filename, text.encode("utf-8"), "text/plain")},
        data=data,
    )
    assert response.status_code == 201, response.text
    return response.json()


def wait_for_material(
    client: TestClient,
    headers: dict,
    material_id: int,
    timeout: float = 10.0,
) -> dict:
    """Poll until generation reaches a terminal state."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        response = client.get(f"/api/materials/{material_id}", headers=headers)
        assert response.status_code == 200, response.text
        data = response.json()
        if data["status"] in ("ready", "failed"):
            return data
        time.sleep(0.05)
    raise AssertionError(f"Material {material_id} never finished generating")


SAMPLE_TEXT = (
    "The solar system has eight planets that orbit the Sun. "
    "Mercury is the closest planet to the Sun and the smallest of them all. "
    "Venus is covered by thick clouds of sulfuric acid that trap heat. "
    "Earth is the only planet known to support life, with liquid water oceans. "
    "Mars has the largest volcano in the solar system, called Olympus Mons. "
    "Jupiter is a gas giant with a famous storm known as the Great Red Spot. "
    "Saturn is famous for its bright rings made of ice and rock particles. "
    "Uranus rotates on its side, likely because of a massive ancient collision. "
    "Neptune is the farthest planet and has the strongest winds ever measured. "
    "Astronomers study distant stars to understand how planets form over time."
)
