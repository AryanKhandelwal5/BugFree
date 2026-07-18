"""Add multi-tenant identity and audit records."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260717_02"
down_revision: str | None = "20260717_01"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table("users", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("email", sa.String(320), nullable=False, unique=True), sa.Column("password_hash", sa.String(512), nullable=False), sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))
    op.create_table("organizations", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("name", sa.String(120), nullable=False), sa.Column("slug", sa.String(80), nullable=False, unique=True), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))
    op.create_table("organization_memberships", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("organization_id", sa.Uuid(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False), sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("role", sa.String(16), nullable=False), sa.UniqueConstraint("organization_id", "user_id"))
    op.create_table("refresh_sessions", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("token_hash", sa.String(64), nullable=False, unique=True), sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False), sa.Column("revoked_at", sa.DateTime(timezone=True)), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))
    op.create_table("audit_events", sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("organization_id", sa.Uuid(), sa.ForeignKey("organizations.id")), sa.Column("actor_user_id", sa.Uuid(), sa.ForeignKey("users.id")), sa.Column("action", sa.String(120), nullable=False), sa.Column("metadata_json", sa.Text(), nullable=False, server_default="{}"), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))


def downgrade() -> None:
    op.drop_table("audit_events")
    op.drop_table("refresh_sessions")
    op.drop_table("organization_memberships")
    op.drop_table("organizations")
    op.drop_table("users")
