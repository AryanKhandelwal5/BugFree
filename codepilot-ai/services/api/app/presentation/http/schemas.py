"""Stable OpenAPI schemas for operational endpoints."""

from pydantic import BaseModel


class LiveResponse(BaseModel):
    """Liveness response schema."""

    status: str


class DependencyResponse(BaseModel):
    """Public dependency state schema."""

    name: str
    healthy: bool


class ReadyResponse(BaseModel):
    """Readiness response schema."""

    status: str
    dependencies: list[DependencyResponse] | None = None

