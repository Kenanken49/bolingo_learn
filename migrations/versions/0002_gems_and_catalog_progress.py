"""Gems currency and catalog progress tables.

Revision ID: 0002_gems_and_catalog_progress
Revises: 0001_initial
Create Date: 2026-10-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_gems_and_catalog_progress"
down_revision: Union[str, Sequence[str], None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("gems", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_table(
        "catalog_lesson_completions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("track_slug", sa.String(length=64), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("lesson_index", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "track_slug", "level", "lesson_index"),
    )
    op.create_index(
        op.f("ix_catalog_lesson_completions_user_id"),
        "catalog_lesson_completions",
        ["user_id"],
    )
    op.create_table(
        "catalog_level_unlocks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("track_slug", sa.String(length=64), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "track_slug", "level"),
    )
    op.create_index(
        op.f("ix_catalog_level_unlocks_user_id"),
        "catalog_level_unlocks",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_catalog_level_unlocks_user_id"), table_name="catalog_level_unlocks")
    op.drop_table("catalog_level_unlocks")
    op.drop_index(
        op.f("ix_catalog_lesson_completions_user_id"),
        table_name="catalog_lesson_completions",
    )
    op.drop_table("catalog_lesson_completions")
    op.drop_column("users", "gems")
