"""Password and token primitives; raw refresh tokens are never persisted."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from app.infrastructure.config import Settings

_PASSWORDS = PasswordHasher()


class TokenError(ValueError):
    """Raised when an access token is invalid or expired."""


def hash_password(password: str) -> str:
    """Create an Argon2id password hash."""
    return _PASSWORDS.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password without leaking verification failures."""
    try:
        return _PASSWORDS.verify(password_hash, password)
    except (InvalidHashError, VerifyMismatchError):
        return False


def new_refresh_token() -> tuple[str, str]:
    """Return an opaque bearer token and its SHA-256 database representation."""
    token = secrets.token_urlsafe(48)
    return token, hash_refresh_token(token)


def hash_refresh_token(token: str) -> str:
    """Hash a refresh bearer token deterministically for lookup."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def issue_access_token(user_id: UUID, settings: Settings) -> str:
    """Issue a short-lived signed access token with a unique identifier."""
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "iss": settings.jwt_issuer,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_ttl_minutes),
        "jti": secrets.token_urlsafe(16),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")


def decode_access_token(token: str, settings: Settings) -> UUID:
    """Validate a token and return its subject UUID."""
    try:
        claims = jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"], issuer=settings.jwt_issuer)
        return UUID(str(claims["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError) as error:
        raise TokenError("invalid access token") from error
