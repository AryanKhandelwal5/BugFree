"""Unit tests for readiness orchestration."""

import pytest

from app.application.health_service import HealthService
from app.domain.health import DependencyStatus


class Probe:
    def __init__(self, statuses: list[DependencyStatus]) -> None:
        self._statuses = statuses

    async def check(self) -> list[DependencyStatus]:
        return self._statuses


@pytest.mark.parametrize(
    ("statuses", "expected"),
    [([], True), ([DependencyStatus("postgres", True)], True), ([DependencyStatus("redis", False)], False)],
)
async def test_readiness_requires_every_dependency(statuses: list[DependencyStatus], expected: bool) -> None:
    healthy, received = await HealthService(Probe(statuses)).readiness()
    assert healthy is expected
    assert received == statuses

