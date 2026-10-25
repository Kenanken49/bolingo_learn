"""Choose the next difficulty level (1-10) from a learner profile vector.

The default selector is a heuristic: it steps up when the learner is accurate
at the current level and steps down when they struggle. If a model path is
configured and onnxruntime is installed, the ONNX model scores the profile
instead. Both return the same integer level.
"""

from __future__ import annotations

import logging
import time
from typing import Protocol

import httpx

from .learner_profile import DIFFICULTY_LEVELS, PROFILE_DIM

TARGET_ACCURACY = 0.8
MIN_LEVEL = 1
MAX_LEVEL = DIFFICULTY_LEVELS

logger = logging.getLogger(__name__)
SERVER_MODEL = "difficulty"
SERVER_VERSION = "1"
SERVER_TIMEOUT_SECONDS = 0.5
# After a failure, skip the server for this long so a down server adds no latency.
SERVER_COOLDOWN_SECONDS = 30.0


class DifficultySelector(Protocol):
    def next_level(self, profile: list[float], current_level: int) -> int: ...


def clamp_level(level: int) -> int:
    return min(max(level, MIN_LEVEL), MAX_LEVEL)


class HeuristicSelector:
    """Step up when accuracy at the current level beats the target, down when below."""

    def next_level(self, profile: list[float], current_level: int) -> int:
        if len(profile) != PROFILE_DIM:
            raise ValueError(f"profile must have {PROFILE_DIM} dimensions")
        level = clamp_level(current_level)
        accuracy = profile[level - 1]
        if accuracy >= TARGET_ACCURACY + 0.1:
            return clamp_level(level + 1)
        if accuracy < TARGET_ACCURACY - 0.2:
            return clamp_level(level - 1)
        return level


class OnnxSelector:
    """Runs an exported model that maps the 40-dim profile to a level score.

    The model must take a float32 tensor of shape (1, 40) and return a single
    value in [1, 10]. Loading fails loudly so a bad path is never silent.
    """

    def __init__(self, model_path: str) -> None:
        import numpy as np  # noqa: PLC0415 - optional heavy dependency
        import onnxruntime as ort  # noqa: PLC0415

        self._np = np
        self._session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
        self._input = self._session.get_inputs()[0].name

    def next_level(self, profile: list[float], current_level: int) -> int:
        if len(profile) != PROFILE_DIM:
            raise ValueError(f"profile must have {PROFILE_DIM} dimensions")
        x = self._np.asarray([profile], dtype=self._np.float32)
        score = float(self._session.run(None, {self._input: x})[0].reshape(-1)[0])
        return clamp_level(round(score))


class HttpOnnxSelector:
    """Scores the profile via an ONNX Runtime Server session over HTTP.

    The session is created lazily and re-created if the server restarted and
    lost it. Any error or timeout falls back to the heuristic, so a down model
    server never fails a learner's attempt.
    """

    def __init__(self, base_url: str, fallback: DifficultySelector | None = None) -> None:
        self._base_url = base_url.rstrip("/")
        self._fallback = fallback or HeuristicSelector()
        self._session_ready = False
        self._retry_after = 0.0
        # One pooled client per selector: building a client per call costs ~300 ms.
        self._client = httpx.Client(timeout=SERVER_TIMEOUT_SECONDS)

    def _create_session(self, client: httpx.Client) -> None:
        resp = client.post(
            f"{self._base_url}/api/sessions",
            json={"model": SERVER_MODEL, "version": SERVER_VERSION},
        )
        # 409 means the session already exists, which is also fine.
        if resp.status_code not in (200, 409):
            resp.raise_for_status()
        self._session_ready = True

    def next_level(self, profile: list[float], current_level: int) -> int:
        if len(profile) != PROFILE_DIM:
            raise ValueError(f"profile must have {PROFILE_DIM} dimensions")
        if time.monotonic() < self._retry_after:
            return self._fallback.next_level(profile, current_level)
        try:
            client = self._client
            if not self._session_ready:
                self._create_session(client)
            resp = client.post(
                f"{self._base_url}/api/sessions/{SERVER_MODEL}/{SERVER_VERSION}",
                json={"profile": [profile]},
            )
            if resp.status_code == 404:
                # Server restarted and dropped the session: recreate it once.
                self._session_ready = False
                self._create_session(client)
                resp = client.post(
                    f"{self._base_url}/api/sessions/{SERVER_MODEL}/{SERVER_VERSION}",
                    json={"profile": [profile]},
                )
            resp.raise_for_status()
            score = float(resp.json()["level_score"][0][0])
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
            logger.warning("difficulty server unavailable; using heuristic", exc_info=True)
            self._session_ready = False
            self._retry_after = time.monotonic() + SERVER_COOLDOWN_SECONDS
            return self._fallback.next_level(profile, current_level)
        return clamp_level(round(score))


_http_selectors: dict[str, HttpOnnxSelector] = {}


def build_selector(
    model_path: str | None, server_url: str | None = None
) -> DifficultySelector:
    if server_url:
        # Reuse one selector per URL so its server session is created once.
        if server_url not in _http_selectors:
            _http_selectors[server_url] = HttpOnnxSelector(server_url)
        return _http_selectors[server_url]
    if model_path:
        return OnnxSelector(model_path)
    return HeuristicSelector()
