"""Tests for privilege boundary decisions."""

from app.domain.identity import OrganizationRole, role_allows


def test_viewers_cannot_mutate_membership() -> None:
    assert not role_allows(OrganizationRole.VIEWER, OrganizationRole.ADMIN)


def test_admins_cannot_grant_owner() -> None:
    assert not (OrganizationRole.ADMIN == OrganizationRole.OWNER)
