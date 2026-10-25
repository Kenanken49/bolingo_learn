"""40-dimensional learner profile vectors, cached in Redis.

Each learner has one Redis key holding a fixed-length float vector. Dimensions
0-9 track per-difficulty accuracy (levels 1-10), 10-19 track recent accuracy by
difficulty band, and the rest are reserved for model features. Attempts update
the vector with an exponential moving average, so a read is one HGET-sized call.
"""

from __future__ import annotations

import struct
from typing import Protocol

PROFILE_DIM = 40
DIFFICULTY_LEVELS = 10
EMA_ALPHA = 0.2
KEY_PREFIX = "bolingo:profile:"
_FORMAT = f"<{PROFILE_DIM}f"


class ProfileStore(Protocol):
    def get(self, user_id: int) -> list[float]: ...
    def put(self, user_id: int, vector: list[float]) -> None: ...


def neutral_profile() -> list[float]:
    """Starting profile: 50% accuracy assumed on every dimension."""
    return [0.5] * PROFILE_DIM


def _key(user_id: int) -> str:
    return f"{KEY_PREFIX}{user_id}"


def _pack(vector: list[float]) -> bytes:
    return struct.pack(_FORMAT, *vector)


def _unpack(blob: bytes) -> list[float]:
    return list(struct.unpack(_FORMAT, blob))


class RedisProfileStore:
    def __init__(self, client) -> None:
        self._client = client

    def get(self, user_id: int) -> list[float]:
        blob = self._client.get(_key(user_id))
        return _unpack(blob) if blob else neutral_profile()

    def put(self, user_id: int, vector: list[float]) -> None:
        if len(vector) != PROFILE_DIM:
            raise ValueError(f"profile must have {PROFILE_DIM} dimensions")
        self._client.set(_key(user_id), _pack(vector))


class InMemoryProfileStore:
    """Process-local fallback used when Redis is not configured (dev/tests)."""

    def __init__(self) -> None:
        self._data: dict[int, list[float]] = {}

    def get(self, user_id: int) -> list[float]:
        return list(self._data.get(user_id, neutral_profile()))

    def put(self, user_id: int, vector: list[float]) -> None:
        if len(vector) != PROFILE_DIM:
            raise ValueError(f"profile must have {PROFILE_DIM} dimensions")
        self._data[user_id] = list(vector)


def update_profile(vector: list[float], difficulty: int, correct: int, total: int) -> list[float]:
    """Blend one attempt's accuracy at `difficulty` into the profile."""
    if total <= 0:
        return list(vector)
    level = min(max(difficulty, 1), DIFFICULTY_LEVELS) - 1
    accuracy = correct / total
    updated = list(vector)
    updated[level] = (1 - EMA_ALPHA) * updated[level] + EMA_ALPHA * accuracy
    band = DIFFICULTY_LEVELS + min(level // 2, 4)
    updated[band] = (1 - EMA_ALPHA) * updated[band] + EMA_ALPHA * accuracy
    return updated
