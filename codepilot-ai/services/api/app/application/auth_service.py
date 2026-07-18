"""Transactional identity use cases."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.config import Settings
from app.infrastructure.persistence import AuditEventRecord, RefreshSessionRecord, UserRecord
from app.infrastructure.security import (
    hash_password,
    hash_refresh_token,
    issue_access_token,
    new_refresh_token,
    verify_password,
)


class AuthenticationError(ValueError):
    """Authentication failed without revealing sensitive details."""


class DuplicateEmailError(ValueError):
    """An account already exists for the supplied email."""


class AuthService:
    """Creates users and rotates server-revocable refresh credentials."""

    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._session, self._settings = session, settings

    async def register(self, email: str, password: str) -> UserRecord:
        normalized = email.casefold().strip()
        if await self._session.scalar(select(UserRecord.id).where(UserRecord.email == normalized)):
            raise DuplicateEmailError
        user = UserRecord(email=normalized, password_hash=hash_password(password))
        self._session.add(user)
        await self._session.flush()
        self._session.add(AuditEventRecord(actor_user_id=user.id, action="auth.user_registered"))
        await self._session.commit()
        await self._session.refresh(user)
        return user

    async def login(self, email: str, password: str) -> tuple[str, str]:
        user = await self._session.scalar(select(UserRecord).where(UserRecord.email == email.casefold().strip()))
        if user is None or not user.is_active or not verify_password(password, user.password_hash):
            raise AuthenticationError
        return await self._create_session(user.id, "auth.user_logged_in")

    async def rotate(self, refresh_token: str) -> tuple[str, str]:
        token_hash = hash_refresh_token(refresh_token)
        record = await self._session.scalar(select(RefreshSessionRecord).where(RefreshSessionRecord.token_hash == token_hash))
        if record is None or record.revoked_at is not None or record.expires_at <= datetime.now(UTC):
            raise AuthenticationError
        record.revoked_at = datetime.now(UTC)
        return await self._create_session(record.user_id, "auth.refresh_rotated")

    async def logout(self, refresh_token: str) -> None:
        record = await self._session.scalar(
            select(RefreshSessionRecord).where(RefreshSessionRecord.token_hash == hash_refresh_token(refresh_token))
        )
        if record is not None and record.revoked_at is None:
            record.revoked_at = datetime.now(UTC)
            self._session.add(AuditEventRecord(actor_user_id=record.user_id, action="auth.user_logged_out"))
            await self._session.commit()

    async def _create_session(self, user_id: UUID, action: str) -> tuple[str, str]:
        refresh_token, token_hash = new_refresh_token()
        expiry = datetime.now(UTC) + timedelta(days=self._settings.refresh_token_ttl_days)
        self._session.add(RefreshSessionRecord(user_id=user_id, token_hash=token_hash, expires_at=expiry))
        self._session.add(AuditEventRecord(actor_user_id=user_id, action=action))
        await self._session.commit()
        return issue_access_token(user_id, self._settings), refresh_token
