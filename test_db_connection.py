"""Supabase Connection Test (psycopg2).

Reads connection parameters and tests the connection using SQLAlchemy 2.0 and
psycopg2.  This mirrors the exact URL the FastAPI backend uses for the tunnel
endpoint so that both converge on the same database.

Importable and runnable standalone:

    source .venv/bin/activate
    python test_db_connection.py

Or, if the variables are already in the environment:

    python test_db_connection.py
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool


def _env_or_default(name: str, default: str | None) -> str:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        if default is None:
            raise RuntimeError(f"{name} is not set and no default was provided")
        return default
    return value.strip()


def build_database_url() -> str:
    """Build the tunnel-connection string: 127.0.0.1:6543 -> Supabase Postgres.

    The FastAPI backend (app/db.py) reads BOLINGO_DATABASE_URL, which is
    pointint at the tunnel for this run.  This helper mirrors that URL so the
    test script validates the identical connection surface.
    """
    return os.getenv(
        "BOLINGO_DANGEROUSLY_OVERRIDE_DB_URL",
        "postgresql+psycopg2://postgres:postgres@127.0.0.1:6543/postgres?sslmode=require",
    )


def main() -> None:
    load_dotenv()
    url = build_database_url()
    print(f"Connecting to tunnel: {url}")
    try:
        engine = create_engine(url, poolclass=NullPool)
        with engine.connect() as conn:
            # readiness probe
            result = conn.execute(text("SELECT current_database(), current_user"))
            db, user = result.fetchone()
            print("Connection successful!")
            print(f"  database   : {db}")
            print(f"  user       : {user}")
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to connect: {exc}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
