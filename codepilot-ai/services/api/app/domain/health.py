"""Health domain contracts."""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class DependencyStatus:
    """The availability result for one required platform dependency."""

    name: str
    healthy: bool


class ReadinessProbe(Protocol):
    """Checks the services needed to accept work."""

    async def check(self) -> list[DependencyStatus]:
        """Return a status for every required dependency."""

