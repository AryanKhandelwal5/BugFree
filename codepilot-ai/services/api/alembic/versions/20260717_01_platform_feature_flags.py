"""Add platform feature flag overrides.

Revision ID: 20260717_01
Revises:
Create Date: 2026-07-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260717_01"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Create auditable feature-flag persistence for controlled rollouts."""
    op.create_table(
        "feature_flag_overrides",
        sa.Column("key", sa.String(length=128), primary_key=True),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    """Remove the platform feature-flag persistence table."""
    op.drop_table("feature_flag_overrides")

