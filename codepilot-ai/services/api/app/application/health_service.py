"""Use case for operational health reporting."""

from app.domain.health import DependencyStatus, ReadinessProbe


class HealthService:
    """Provides liveness and dependency-aware readiness state."""

    def __init__(self, readiness_probe: ReadinessProbe) -> None:
        self._readiness_probe = readiness_probe

    async def readiness(self) -> tuple[bool, list[DependencyStatus]]:
        """Evaluate whether this instance can safely receive traffic."""
        dependencies = await self._readiness_probe.check()
        return all(item.healthy for item in dependencies), dependencies

