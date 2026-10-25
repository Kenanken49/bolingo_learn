"""Birdbrain profile endpoint: read-only per-level accuracy and next difficulty."""

from __future__ import annotations

ENDPOINT = "/api/birdbrain/profile"


def test_profile_returns_ten_levels_and_next_difficulty(auth):
    client, headers = auth
    response = client.get(ENDPOINT, params={"level": 3}, headers=headers)

    assert response.status_code == 200, response.text
    body = response.json()
    assert [row["level"] for row in body["levels"]] == list(range(1, 11))
    assert all(0.0 <= row["accuracy"] <= 1.0 for row in body["levels"])
    assert body["current_difficulty"] == 3
    assert 1 <= body["next_difficulty"] <= 10


def test_profile_rejects_out_of_range_level(auth):
    client, headers = auth
    response = client.get(ENDPOINT, params={"level": 11}, headers=headers)

    assert response.status_code == 422


def test_profile_requires_auth(client):
    response = client.get(ENDPOINT, params={"level": 1})

    assert response.status_code == 401
