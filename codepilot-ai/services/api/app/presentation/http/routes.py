"""Versioned HTTP routes."""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.application.health_service import HealthService
from app.presentation.http.schemas import DependencyResponse, LiveResponse, ReadyResponse

router = APIRouter(prefix="/api/v1", tags=["platform"])


def get_health_service(request: Request) -> HealthService:
    """Resolve the health use case from the application container."""
    return request.app.state.health_service  # type: ignore[no-any-return]


@router.get("/health/live", response_model=LiveResponse, summary="Liveness probe")
async def liveness() -> LiveResponse:
    """Confirm that the process is alive without touching dependencies."""
    return LiveResponse(status="ok")


@router.get("/health/ready", response_model=ReadyResponse, summary="Readiness probe")
async def readiness(
    request: Request, health_service: HealthService = Depends(get_health_service)
) -> ReadyResponse | JSONResponse:
    """Confirm that all backing services are available for traffic."""
    healthy, dependencies = await health_service.readiness()
    details_enabled = request.app.state.feature_flags.health_details
    body = ReadyResponse(
        status="ok" if healthy else "unavailable",
        dependencies=[DependencyResponse(name=item.name, healthy=item.healthy) for item in dependencies]
        if details_enabled
        else None,
    )
    if not healthy:
        return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content=body.model_dump())
    return body
