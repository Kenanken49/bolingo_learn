"""Alembic must build the same schema as the SQLAlchemy models."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect

from app import models  # noqa: F401  (registers every table on Base.metadata)
from app.db import Base

ROOT = Path(__file__).resolve().parents[1]


def _alembic(database_url: str, *args: str) -> subprocess.CompletedProcess[str]:
    env = {**os.environ, "BOLINGO_DATABASE_URL": database_url}
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )


def test_migrations_build_the_full_schema(tmp_path: Path) -> None:
    database_url = f"sqlite:///{(tmp_path / 'migrated.db').as_posix()}"

    result = _alembic(database_url, "upgrade", "head")
    assert result.returncode == 0, result.stdout + result.stderr

    engine = create_engine(database_url)
    try:
        tables = set(inspect(engine).get_table_names())
    finally:
        engine.dispose()

    assert set(Base.metadata.tables) <= tables
    assert {"users", "attempts", "speech_attempts", "league_seasons"} <= tables
    assert "alembic_version" in tables


def test_stamp_adopts_a_database_created_by_create_all(tmp_path: Path) -> None:
    """Legacy zero-config databases can adopt migrations without data loss."""
    database_url = f"sqlite:///{(tmp_path / 'legacy.db').as_posix()}"
    engine = create_engine(database_url)
    Base.metadata.create_all(engine)
    engine.dispose()

    stamped = _alembic(database_url, "stamp", "head")
    assert stamped.returncode == 0, stamped.stdout + stamped.stderr

    upgraded = _alembic(database_url, "upgrade", "head")
    assert upgraded.returncode == 0, upgraded.stdout + upgraded.stderr
    assert "Running upgrade" not in upgraded.stderr

    engine = create_engine(database_url)
    try:
        assert "alembic_version" in inspect(engine).get_table_names()
    finally:
        engine.dispose()
