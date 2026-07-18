"""Network adapters used by the readiness use case."""

import asyncio

import asyncpg
import httpx
from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.domain.health import DependencyStatus
from app.infrastructure.config import Settings


class PlatformReadinessProbe:
    """Checks Postgres, Redis, and Qdrant concurrently with bounded calls."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def check(self) -> list[DependencyStatus]:
        """Return all dependency states without failing the health endpoint."""
        results = await asyncio.gather(
            self._postgres_status(), self._redis_status(), self._qdrant_status()
        )
        return list(results)

    async def _postgres_status(self) -> DependencyStatus:
        try:
            connection = await asyncpg.connect(self._settings.database_url, timeout=1.5)
            try:
                await connection.execute("SELECT 1")
            finally:
                await connection.close()
            return DependencyStatus("postgres", True)
        except (asyncpg.PostgresError, OSError, TimeoutError):
            return DependencyStatus("postgres", False)

    async def _redis_status(self) -> DependencyStatus:
        client = Redis.from_url(self._settings.redis_url, socket_connect_timeout=1.5)
        try:
            await client.ping()
            return DependencyStatus("redis", True)
        except (OSError, RedisError, TimeoutError):
            return DependencyStatus("redis", False)
        finally:
            await client.aclose()

    async def _qdrant_status(self) -> DependencyStatus:
        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                response = await client.get(f"{self._settings.qdrant_url}healthz")
            return DependencyStatus("qdrant", response.is_success)
        except httpx.HTTPError:
            return DependencyStatus("qdrant", False)
