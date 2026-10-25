"""WebSocket generation progress: live streaming and late-join replay."""

from __future__ import annotations

import pytest
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from tests.conftest import SAMPLE_TEXT, signup, upload_text, wait_for_material


def test_live_stream_reports_progress_and_finishes(client: TestClient) -> None:
    headers = signup(client)
    material = upload_text(client, headers, SAMPLE_TEXT)
    token = headers["Authorization"].split(" ", 1)[1]

    with client.websocket_connect(
        f"/ws/generations/{material['id']}?token={token}"
    ) as websocket:
        trigger = client.post(
            f"/api/materials/{material['id']}/lessons", headers=headers
        )
        assert trigger.status_code == 202

        stages: list[dict] = []
        while True:
            event = websocket.receive_json()
            stages.append(event)
            if event.get("done"):
                break

    final = stages[-1]
    assert final["stage"] == "ready"
    assert final["lesson_ids"]
    assert final["percent"] == 100
    # Progress must move, not just jump to the end.
    assert any(e["stage"] == "generating" for e in stages)


def test_late_subscriber_receives_replay(client: TestClient) -> None:
    headers = signup(client)
    material = upload_text(client, headers, SAMPLE_TEXT)
    client.post(f"/api/materials/{material['id']}/lessons", headers=headers)
    final = wait_for_material(client, headers, material["id"])
    assert final["status"] == "ready"

    token = headers["Authorization"].split(" ", 1)[1]
    with client.websocket_connect(
        f"/ws/generations/{material['id']}?token={token}"
    ) as websocket:
        # No new run: the replayed history from the finished run arrives first.
        seen = []
        while True:
            event = websocket.receive_json()
            seen.append(event)
            if event.get("done"):
                break

    assert seen[-1]["stage"] == "ready"
    assert seen[-1]["lesson_ids"]


def test_snapshot_when_event_history_is_lost(client: TestClient) -> None:
    """After a server restart the in-memory log is empty; the DB answers instead."""
    from app.events import hub

    headers = signup(client)
    material = upload_text(client, headers, SAMPLE_TEXT)
    client.post(f"/api/materials/{material['id']}/lessons", headers=headers)
    final = wait_for_material(client, headers, material["id"])
    assert final["status"] == "ready"

    hub._logs.clear()  # simulate a process restart

    token = headers["Authorization"].split(" ", 1)[1]
    with client.websocket_connect(
        f"/ws/generations/{material['id']}?token={token}"
    ) as websocket:
        event = websocket.receive_json()

    assert event["done"] is True
    assert event["snapshot"] is True
    assert event["stage"] == "ready"
    assert event["lesson_ids"]
    assert event["error"] is None


def test_bad_token_is_rejected(client: TestClient) -> None:
    headers = signup(client)
    material = upload_text(client, headers, SAMPLE_TEXT)

    try:
        with client.websocket_connect(
            f"/ws/generations/{material['id']}?token=bogus"
        ) as websocket:
            with pytest.raises(WebSocketDisconnect):
                websocket.receive_json()
    except WebSocketDisconnect:
        pass  # denial happened during the handshake instead


def test_foreign_material_is_rejected(client: TestClient) -> None:
    owner_headers = signup(client, "owner@bolingo.app")
    material = upload_text(client, owner_headers, SAMPLE_TEXT)
    intruder_headers = signup(client, "intruder@bolingo.app")
    token = intruder_headers["Authorization"].split(" ", 1)[1]

    try:
        with client.websocket_connect(
            f"/ws/generations/{material['id']}?token={token}"
        ) as websocket:
            with pytest.raises(WebSocketDisconnect):
                websocket.receive_json()
    except WebSocketDisconnect:
        pass
