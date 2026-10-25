"""WebSocket progress hub for lesson-generation runs.

Each material keeps an ordered log of events plus live subscriber queues, so
clients that connect mid-run still receive earlier events (replay on subscribe).
"""

from __future__ import annotations

import asyncio
from typing import Any

MAX_EVENTS_PER_MATERIAL = 200


class GenerationLog:
    def __init__(self) -> None:
        self.events: list[dict[str, Any]] = []
        self.queues: set[asyncio.Queue] = set()

    def publish(self, event: dict[str, Any]) -> None:
        self.events.append(event)
        if len(self.events) > MAX_EVENTS_PER_MATERIAL:
            del self.events[: len(self.events) - MAX_EVENTS_PER_MATERIAL]
        for queue in list(self.queues):
            queue.put_nowait(event)


class Hub:
    def __init__(self) -> None:
        self._logs: dict[int, GenerationLog] = {}

    def begin(self, material_id: int) -> GenerationLog:
        """Start a fresh run log (clears stale events from prior runs).

        Live subscriber queues are carried over so a client that subscribed
        before the run started keeps receiving this run's events.
        """
        previous = self._logs.get(material_id)
        log = GenerationLog()
        if previous is not None:
            log.queues = previous.queues
        self._logs[material_id] = log
        return log

    def log(self, material_id: int) -> GenerationLog:
        return self._logs.setdefault(material_id, GenerationLog())

    def publish(self, material_id: int, event: dict[str, Any]) -> None:
        self.log(material_id).publish(event)

    def subscribe(self, material_id: int) -> tuple[GenerationLog, asyncio.Queue]:
        log = self.log(material_id)
        queue: asyncio.Queue = asyncio.Queue()
        for event in log.events:  # replay history to late subscribers
            queue.put_nowait(event)
        log.queues.add(queue)
        return log, queue

    def unsubscribe(self, material_id: int, queue: asyncio.Queue) -> None:
        log = self._logs.get(material_id)
        if log is not None:
            log.queues.discard(queue)


hub = Hub()
