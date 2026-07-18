"""Redis-backed fixed-window rate limiting."""

import time

from redis.asyncio import Redis


class RateLimitExceeded(Exception):
    """The caller exceeded the configured request budget."""


class RedisRateLimiter:
    """Atomic-enough fixed-window limiter backed by Redis counters."""

    def __init__(self, redis: Redis, limit: int) -> None:
        self._redis, self._limit = redis, limit

    async def allow(self, key: str) -> bool:
        """Increment a one-minute bucket and return whether it remains allowed."""
        bucket = time.time_ns() // 60_000_000_000
        redis_key = f"codepilot:ratelimit:{key}:{bucket}"
        count = await self._redis.incr(redis_key)
        if count == 1:
            await self._redis.expire(redis_key, 61)
        return count <= self._limit
