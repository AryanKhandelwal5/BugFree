"""Centralized, typed feature flag access."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class FeatureFlags:
    """Feature flags available to the platform foundation."""

    health_details: bool

