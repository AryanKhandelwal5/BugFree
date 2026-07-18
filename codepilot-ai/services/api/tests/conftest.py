"""Shared test composition helpers."""

import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://unused")
os.environ.setdefault("REDIS_URL", "redis://unused")
os.environ.setdefault("QDRANT_URL", "http://qdrant.test/")
os.environ.setdefault("JWT_SECRET_KEY", "test-only-secret-key-that-is-at-least-thirty-two-bytes")

from fastapi.testclient import TestClient
import pytest

from app.application.feature_flags import FeatureFlags
from app.application.health_service import HealthService
from app.domain.health import DependencyStatus
from app.infrastructure.config import Settings
from app.presentation.http.main import create_app


class FixedProbe:
    """Deterministic readiness adapter for HTTP integration tests."""

    def __init__(self, healthy: bool) -> None:
        self._healthy = healthy

    async def check(self) -> list[DependencyStatus]:
        return [DependencyStatus("postgres", self._healthy)]


@pytest.fixture
def settings() -> Settings:
    """Return valid non-secret test configuration."""
    return Settings(
        environment="test",
        database_url="postgresql+asyncpg://unused",
        redis_url="redis://unused",
        qdrant_url="http://qdrant.test/",
        jwt_secret_key="test-only-secret-key-that-is-at-least-thirty-two-bytes",
    )


@pytest.fixture
def client(settings: Settings) -> TestClient:
    """Return an application client with healthy dependencies."""
    app = create_app(settings)
    app.state.health_service = HealthService(FixedProbe(True))
    with TestClient(app) as test_client:
        yield test_client
