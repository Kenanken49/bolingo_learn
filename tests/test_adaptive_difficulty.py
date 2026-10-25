"""Adaptive difficulty: learner profile vectors, selector and attempt wiring."""

from __future__ import annotations

import os

import pytest

from app.services.difficulty import (
    HeuristicSelector,
    TargetSelector,
    clamp_level,
    closest_to_target_item,
)
from app.services.learner_profile import (
    PROFILE_DIM,
    InMemoryProfileStore,
    RedisProfileStore,
    neutral_profile,
    update_profile,
)


def test_update_profile_moves_level_accuracy_toward_attempt() -> None:
    profile = neutral_profile()
    updated = update_profile(profile, difficulty=3, correct=5, total=5)
    assert len(updated) == PROFILE_DIM
    assert updated[2] > 0.5  # level 3 pulled toward 100%
    assert updated[0] == 0.5  # other levels untouched
    assert update_profile(profile, 3, 0, 0) == profile  # no attempts, no change


def test_hints_and_slow_correct_answers_lower_evidence() -> None:
    base = update_profile(neutral_profile(), 3, 4, 4)
    hinted = update_profile(neutral_profile(), 3, 4, 4, hints=4)
    slow = update_profile(neutral_profile(), 3, 4, 4, seconds=4 * 60)
    assert hinted[2] < base[2]
    assert slow[2] < base[2]
    fast = update_profile(neutral_profile(), 3, 4, 4, seconds=4 * 5)
    assert fast[2] == base[2]


def test_target_selector_picks_level_nearest_80_percent() -> None:
    profile = neutral_profile()
    profile[4] = 0.79  # level 5 is closest to the 80% target
    profile[6] = 0.6
    assert TargetSelector().next_level(profile, 1) == 5


def test_heuristic_steps_up_and_down_and_clamps() -> None:
    selector = HeuristicSelector()
    strong = neutral_profile()
    strong[2] = 0.95
    weak = neutral_profile()
    weak[2] = 0.1
    assert selector.next_level(strong, 3) == 4
    assert selector.next_level(weak, 3) == 2
    top = neutral_profile()
    top[9] = 0.95
    assert selector.next_level(top, 10) == 10  # clamped at the ceiling
    assert selector.next_level(weak, 1) == 1
    # 50% is below the step-down cutoff (target - 0.2), so the learner drops a level.
    assert selector.next_level(neutral_profile(), 5) == 4
    assert clamp_level(99) == 10


def test_selector_rejects_wrong_profile_size() -> None:
    with pytest.raises(ValueError):
        HeuristicSelector().next_level([0.5] * 3, 1)


def test_in_memory_store_round_trip() -> None:
    store = InMemoryProfileStore()
    assert store.get(7) == neutral_profile()
    vector = update_profile(store.get(7), 2, 1, 2)
    store.put(7, vector)
    assert store.get(7) == vector


def test_redis_store_round_trip() -> None:
    redis = pytest.importorskip("redis")
    url = os.getenv("BOLINGO_TEST_REDIS_URL", "redis://localhost:6380/15")
    client = redis.Redis.from_url(url)
    try:
        client.ping()
    except redis.exceptions.RedisError:
        pytest.skip("Redis is not reachable; set BOLINGO_TEST_REDIS_URL")
    store = RedisProfileStore(client)
    vector = update_profile(neutral_profile(), 4, 3, 4)
    store.put(424242, vector)
    try:
        assert store.get(424242) == pytest.approx(vector, rel=1e-6)
    finally:
        client.delete("bolingo:profile:424242")


def test_attempt_survives_redis_failure(client, monkeypatch) -> None:
    from app.routers import lessons as lessons_router
    from tests.conftest import SAMPLE_TEXT, signup, upload_text, wait_for_material
    from tests.test_api import _correct_answers

    class BrokenStore:
        def get(self, user_id):
            raise RuntimeError("redis down")

        def put(self, user_id, vector):
            raise RuntimeError("redis down")

    monkeypatch.setattr(lessons_router, "_profile_store", lambda: BrokenStore())
    headers = signup(client, "fallback@bolingo.app")
    material = upload_text(client, headers, SAMPLE_TEXT, filename="fallback.txt")
    client.post(f"/api/materials/{material['id']}/lessons", headers=headers)
    ready = wait_for_material(client, headers, material["id"])
    assert ready["status"] == "ready", ready.get("error")
    lesson_id = client.post(
        f"/api/materials/{material['id']}/lessons", headers=headers
    ).json()["lesson_ids"][0]

    response = client.post(
        f"/api/lessons/{lesson_id}/attempt",
        headers=headers,
        json={"answers": _correct_answers(lesson_id)},
    )
    assert response.status_code == 200, response.text
    assert 1 <= response.json()["next_difficulty"] <= 10


def test_attempt_returns_next_difficulty_and_updates_profile(client) -> None:
    from app.db import SessionLocal
    from app.models import Lesson
    from app.routers import lessons as lessons_router
    from tests.conftest import SAMPLE_TEXT, signup, upload_text, wait_for_material
    from tests.test_api import _correct_answers

    headers = signup(client, "adaptive@bolingo.app")
    material = upload_text(client, headers, SAMPLE_TEXT, filename="adaptive.txt")
    client.post(f"/api/materials/{material['id']}/lessons", headers=headers)
    ready = wait_for_material(client, headers, material["id"])
    assert ready["status"] == "ready", ready.get("error")
    lesson_ids = client.post(
        f"/api/materials/{material['id']}/lessons", headers=headers
    ).json()["lesson_ids"]
    lesson_id = lesson_ids[0]
    answers = _correct_answers(lesson_id)

    response = client.post(
        f"/api/lessons/{lesson_id}/attempt", headers=headers, json={"answers": answers}
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert 1 <= body["next_difficulty"] <= 10

    # A perfect attempt raises accuracy at the lesson's level in the stored profile.
    user_id = client.get("/api/me", headers=headers).json()["id"]
    with SessionLocal() as db:
        ord_ = db.get(Lesson, lesson_id).ord
    level = min(max(ord_ + 1, 1), 10)
    profile = lessons_router._memory_store.get(user_id)
    assert profile[level - 1] > 0.5


def test_closest_to_target_item_picks_nearest_to_eighty_percent() -> None:
    assert closest_to_target_item([0.95, 0.6, 0.82, 0.5]) == 2


def test_closest_to_target_item_ties_go_to_earlier_item() -> None:
    assert closest_to_target_item([0.9, 0.9]) == 0


def test_closest_to_target_item_empty_lesson_is_zero() -> None:
    assert closest_to_target_item([]) == 0
