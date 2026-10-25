"""Alembic environment: migrations run against the app's SQLAlchemy metadata.

The database URL comes from `BOLINGO_DATABASE_URL` (via app settings), never
from alembic.ini, so the same command works locally, in CI, and in production.
"""

from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config import settings
from app.db import Base
from app import models  # noqa: F401  (registers every table on Base.metadata)

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _configure_context(**kwargs) -> None:
    context.configure(
        target_metadata=target_metadata,
        compare_type=True,
        # SQLite cannot ALTER most columns in place; batch mode rewrites tables.
        render_as_batch=True,
        **kwargs,
    )


def run_migrations_offline() -> None:
    """Emit SQL instead of applying it (`alembic upgrade head --sql`)."""
    _configure_context(
        url=settings.database_url,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        _configure_context(connection=connection)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
