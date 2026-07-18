"""Security primitive tests."""

from uuid import uuid4

from app.infrastructure.security import decode_access_token, hash_password, issue_access_token, verify_password


def test_argon2_passwords_verify_and_reject() -> None:
    password_hash = hash_password("a-strong-password-123")
    assert verify_password("a-strong-password-123", password_hash)
    assert not verify_password("wrong-password", password_hash)


def test_access_token_round_trip(settings) -> None:
    user_id = uuid4()
    token = issue_access_token(user_id, settings)
    assert decode_access_token(token, settings) == user_id
