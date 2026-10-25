"""Library courses and lessons for stored course content.

Revision ID: 0004_library_courses
Revises: 0003_push_subscriptions
Create Date: 2026-10-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004_library_courses"
down_revision: Union[str, Sequence[str], None] = "0003_push_subscriptions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "library_courses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("source_url", sa.String(length=512), nullable=True),
        sa.Column("ord", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_table(
        "library_lessons",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("ord", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["library_courses.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("course_id", "slug"),
    )
    op.create_index(
        op.f("ix_library_lessons_course_id"),
        "library_lessons",
        ["course_id"],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_library_lessons_course_id"), table_name="library_lessons")
    op.drop_table("library_lessons")
    op.drop_table("library_courses")
