"""Unit tests for settings normalization."""

from app.infrastructure.config import Settings


def test_settings_split_and_trim_cors_origins() -> None:
    settings = Settings(
        database_url="postgresql+asyncpg://unused",
        redis_url="redis://unused",
        qdrant_url="http://qdrant.test/",
        jwt_secret_key="test-only-secret-key-that-is-at-least-thirty-two-bytes",
        allowed_origins=" https://one.example ,https://two.example ",
    )
    assert settings.cors_origins == ["https://one.example", "https://two.example"]
