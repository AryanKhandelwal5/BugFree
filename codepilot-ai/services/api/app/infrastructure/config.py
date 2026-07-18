"""Validated runtime configuration loaded from the environment."""

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings; values are validated before the application starts."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: Literal["development", "test", "staging", "production"] = "development"
    log_level: str = "INFO"
    api_host: str = "0.0.0.0"
    api_port: int = Field(default=8000, ge=1, le=65535)
    database_url: str
    redis_url: str
    qdrant_url: AnyHttpUrl
    allowed_origins: str = "http://localhost:3000"
    enable_metrics: bool = True
    feature_health_details: bool = True
    jwt_secret_key: str = Field(min_length=32)
    jwt_issuer: str = "codepilot-ai"
    access_token_ttl_minutes: int = Field(default=15, ge=1, le=60)
    refresh_token_ttl_days: int = Field(default=30, ge=1, le=90)
    auth_rate_limit_per_minute: int = Field(default=10, ge=1, le=100)

    @property
    def cors_origins(self) -> list[str]:
        """Return normalized configured browser origins."""
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide immutable configuration."""
    return Settings()
