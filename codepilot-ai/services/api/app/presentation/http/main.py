"""ASGI composition root for CodePilot AI."""

import logging
import time
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.middleware.base import RequestResponseEndpoint
from redis.asyncio import Redis

from app.application.feature_flags import FeatureFlags
from app.application.health_service import HealthService
from app.infrastructure.config import Settings, get_settings
from app.infrastructure.logging import configure_logging
from app.infrastructure.persistence import Database
from app.infrastructure.readiness import PlatformReadinessProbe
from app.infrastructure.rate_limit import RedisRateLimiter
from app.presentation.http.auth import router as auth_router
from app.presentation.http.organizations import router as organization_router
from app.presentation.http.routes import router

REQUEST_COUNT = Counter("codepilot_http_requests_total", "HTTP requests", ["method", "path", "status"])
REQUEST_LATENCY = Histogram("codepilot_http_request_duration_seconds", "HTTP request duration", ["method", "path"])


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the API with explicit dependency wiring suitable for tests and production."""
    configured = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        configure_logging(configured.log_level)
        logging.getLogger(__name__).info("application_started")
        yield
        await app.state.database.close()
        await app.state.redis.aclose()
        logging.getLogger(__name__).info("application_stopped")

    app = FastAPI(
        title="CodePilot AI API",
        version="0.1.0",
        description="Production platform API for CodePilot AI.",
        lifespan=lifespan,
    )
    app.state.health_service = HealthService(PlatformReadinessProbe(configured))
    app.state.settings = configured
    app.state.database = Database(configured)
    app.state.redis = Redis.from_url(configured.redis_url, socket_connect_timeout=1.5)
    app.state.rate_limiter = RedisRateLimiter(app.state.redis, configured.auth_rate_limit_per_minute)
    app.state.feature_flags = FeatureFlags(health_details=configured.feature_health_details)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=configured.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    )

    @app.middleware("http")
    async def instrument_request(
        request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        started = time.perf_counter()
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        path = request.url.path
        REQUEST_COUNT.labels(request.method, path, response.status_code).inc()
        REQUEST_LATENCY.labels(request.method, path).observe(time.perf_counter() - started)
        return response

    @app.get("/metrics", include_in_schema=False)
    async def metrics() -> Response:
        """Expose Prometheus metrics when explicitly enabled."""
        if not configured.enable_metrics:
            return Response(status_code=404)
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    app.include_router(router)
    app.include_router(auth_router)
    app.include_router(organization_router)
    return app


app = create_app()
