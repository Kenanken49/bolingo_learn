"""Bolingo runtime configuration.

Every setting is read from the environment with a working default, so the
backend runs with zero configuration and gains real providers as keys land.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _key(name: str) -> str | None:
    raw = os.getenv(name)
    return raw.strip() if raw and raw.strip() else None


def _list(name: str, default: str = "*") -> tuple[str, ...]:
    """Comma-separated env var -> tuple, falling back to the default."""
    raw = os.getenv(name, default)
    values = tuple(item.strip() for item in raw.split(",") if item.strip())
    return values or ("*",)


@dataclass(frozen=True)
class Settings:
    app_name: str = "Bolingo"

    # Persistence
    database_url: str = "sqlite:///./bolingo.db"
    upload_dir: Path = Path("./var/uploads")

    # Ingestion
    max_upload_bytes: int = 10 * 1024 * 1024
    chunk_target_chars: int = 1200
    max_lessons_per_material: int = 4
    max_items_per_lesson: int = 8

    # Providers
    llm_provider: str = "auto"  # auto | openai | offline
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-3-5-sonnet-20241022"
    elevenlabs_api_key: str | None = None
    deepgram_api_key: str | None = None
    rag_enabled: bool = False  # set to true to enable retrieval-augmented generation

    # Sessions
    token_ttl_seconds: int = 60 * 60 * 24 * 30  # 30 days

    # Adaptive difficulty: Redis holds learner profile vectors; empty URL uses
    # the in-process store. An ONNX model path enables the learned selector.
    redis_url: str | None = None
    difficulty_model_path: str | None = None
    difficulty_server_url: str | None = None  # e.g. http://localhost:8001

    # Web Push (reminders). Keys come from `vapid --gen`; empty disables push.
    vapid_private_key: str | None = None
    vapid_public_key: str | None = None
    vapid_subject: str = "mailto:hello@bolingo.app"

    # Background jobs (league seasons roll over weekly)
    scheduler_enabled: bool = True
    league_rollover_check_seconds: int = 300

    # Gamification
    pass_threshold: float = 0.8
    hearts_max: int = 5
    heart_refill_seconds: int = 1800
    xp_per_correct: int = 10
    xp_perfect_bonus: int = 20

    # Network
    cors_allow_origins: tuple[str, ...] = ("*",)

    # Supabase
    supabase_url: str | None = None
    supabase_key: str | None = None
    supabase_storage_bucket: str | None = None
    supabase_storage_path: str = "/lessons"
    supabase_db: str | None = None  # explicit Postgres database (often same as db)


def load_settings() -> Settings:
    return Settings(
        database_url=os.getenv("BOLINGO_DATABASE_URL", "sqlite:///./bolingo.db"),
        upload_dir=Path(os.getenv("BOLINGO_UPLOAD_DIR", "./var/uploads")),
        max_upload_bytes=_int("BOLINGO_MAX_UPLOAD_BYTES", 10 * 1024 * 1024),
        chunk_target_chars=_int("BOLINGO_CHUNK_TARGET_CHARS", 1200),
        max_lessons_per_material=_int("BOLINGO_MAX_LESSONS_PER_MATERIAL", 4),
        max_items_per_lesson=_int("BOLINGO_MAX_ITEMS_PER_LESSON", 8),
        llm_provider=os.getenv("LLM_PROVIDER", "auto").strip().lower() or "auto",
        openai_api_key=_key("OPENAI_API_KEY"),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-4o").strip() or "gpt-4o",
        anthropic_api_key=_key("ANTHROPIC_API_KEY"),
        anthropic_model=os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022").strip() or "claude-3-5-sonnet-20241022",
        elevenlabs_api_key=_key("ELEVENLABS_API_KEY"),
        deepgram_api_key=_key("DEEPGRAM_API_KEY"),
        rag_enabled=os.getenv("RAG_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"},
        token_ttl_seconds=_int("BOLINGO_TOKEN_TTL_SECONDS", 60 * 60 * 24 * 30),
        redis_url=_key("BOLINGO_REDIS_URL"),
        difficulty_model_path=_key("BOLINGO_DIFFICULTY_MODEL_PATH"),
        difficulty_server_url=_key("BOLINGO_DIFFICULTY_SERVER_URL"),
        vapid_private_key=_key("BOLINGO_VAPID_PRIVATE_KEY"),
        vapid_public_key=_key("BOLINGO_VAPID_PUBLIC_KEY"),
        vapid_subject=os.getenv("BOLINGO_VAPID_SUBJECT", "mailto:hello@bolingo.app"),
        scheduler_enabled=_bool("BOLINGO_SCHEDULER_ENABLED", True),
        league_rollover_check_seconds=_int(
            "BOLINGO_LEAGUE_ROLLOVER_CHECK_SECONDS", 300
        ),
        pass_threshold=_float("BOLINGO_PASS_THRESHOLD", 0.8),
        hearts_max=_int("BOLINGO_HEARTS_MAX", 5),
        heart_refill_seconds=_int("BOLINGO_HEART_REFILL_SECONDS", 1800),
        xp_per_correct=_int("BOLINGO_XP_PER_CORRECT", 10),
        xp_perfect_bonus=_int("BOLINGO_XP_PERFECT_BONUS", 20),
        cors_allow_origins=_list("BOLINGO_CORS_ORIGINS"),
        supabase_url=_key("SUPABASE_URL"),
        supabase_key=_key("SUPABASE_ANON_KEY"),
        supabase_storage_bucket=_key("SUPABASE_STORAGE_BUCKET"),
        supabase_storage_path=os.getenv("SUPABASE_STORAGE_PATH", "/lessons"),
        supabase_db=_key("SUPABASE_DB"),
    )


settings = load_settings()
