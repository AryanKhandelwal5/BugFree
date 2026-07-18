"""Rate limiter behavior with an in-memory fake Redis adapter."""

import pytest

from app.infrastructure.rate_limit import RedisRateLimiter


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, int] = {}

    async def incr(self, key: str) -> int:
        self.values[key] = self.values.get(key, 0) + 1
        return self.values[key]

    async def expire(self, key: str, seconds: int) -> bool:
        return True


@pytest.mark.asyncio
async def test_rate_limiter_rejects_after_budget() -> None:
    limiter = RedisRateLimiter(FakeRedis(), limit=2)  # type: ignore[arg-type]
    assert await limiter.allow("client")
    assert await limiter.allow("client")
    assert not await limiter.allow("client")
