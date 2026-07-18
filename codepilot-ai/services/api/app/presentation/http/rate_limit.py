"""HTTP adapter for the shared Redis rate limiter."""

from fastapi import HTTPException, Request, status


async def enforce_rate_limit(request: Request) -> None:
    """Reject authentication and mutation bursts with an explicit 429."""
    limiter = request.app.state.rate_limiter
    key = request.client.host if request.client else "unknown"
    if not await limiter.allow(key):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="rate limit exceeded")
