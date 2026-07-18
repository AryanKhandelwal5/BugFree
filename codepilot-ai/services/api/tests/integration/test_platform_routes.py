"""HTTP contract tests for the platform surface."""

from fastapi.testclient import TestClient

from app.application.feature_flags import FeatureFlags
from app.application.health_service import HealthService
from tests.conftest import FixedProbe


def test_liveness_and_security_headers(client: TestClient) -> None:
    response = client.get("/api/v1/health/live", headers={"X-Request-ID": "request-42"})
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["x-request-id"] == "request-42"
    assert response.headers["x-content-type-options"] == "nosniff"


def test_readiness_returns_dependency_status(client: TestClient) -> None:
    response = client.get("/api/v1/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "dependencies": [{"name": "postgres", "healthy": True}]}


def test_unready_dependency_returns_service_unavailable(client: TestClient) -> None:
    client.app.state.health_service = HealthService(FixedProbe(False))
    response = client.get("/api/v1/health/ready")
    assert response.status_code == 503
    assert response.json()["status"] == "unavailable"


def test_feature_flag_can_hide_dependency_details(client: TestClient) -> None:
    client.app.state.feature_flags = FeatureFlags(health_details=False)
    response = client.get("/api/v1/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "dependencies": None}


def test_metrics_are_exposed(client: TestClient) -> None:
    client.get("/api/v1/health/live")
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "codepilot_http_requests_total" in response.text

