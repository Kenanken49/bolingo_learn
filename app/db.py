"""Database engine and session management.

SQLite by default for zero-config local dev. Set BOLINGO_DATABASE_URL to a
Postgres connection string to switch with no code changes.
"""

from __future__ import annotations
import os # Tumeongeza import hii ili kusoma variable za terminal

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

# Hapa tunalazimisha mfumo kusoma terminal kwanza, isipopoona ndio inatumia settings za ndani
DATABASE_URL = os.getenv(
    "BOLINGO_DATABASE_URL", 
    settings.database_url
)

_connect_args = (
    {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

# Tunatumia DATABASE_URL mpya hapa
engine = create_engine(DATABASE_URL, connect_args=_connect_args, future=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    from . import models  # noqa: F401  (register tables on Base)

    Base.metadata.create_all(engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
