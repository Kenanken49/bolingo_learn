"""Per-exercise accuracy for adaptive lesson ordering.

Revision ID: 0005_item_stats
Revises: 0004_library_courses
Create Date: 2026-10-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005_item_stats"
down_revision: Union[str, Sequence[str], None] = "0004_library_courses"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "item_stats",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("item_index", sa.Integer(), nullable=False),
        sa.Column("correct", sa.Integer(), nullable=False),
        sa.Column("total", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "lesson_id", "item_index"),
    )
    op.create_index(op.f("ix_item_stats_user_id"), "item_stats", ["user_id"])
    op.create_index(op.f("ix_item_stats_lesson_id"), "item_stats", ["lesson_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_item_stats_lesson_id"), table_name="item_stats")
    op.drop_index(op.f("ix_item_stats_user_id"), table_name="item_stats")
    op.drop_table("item_stats")
