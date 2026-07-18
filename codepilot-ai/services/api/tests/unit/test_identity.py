"""Authorization invariant tests."""

from app.domain.identity import OrganizationRole, role_allows


def test_role_hierarchy_is_monotonic() -> None:
    assert role_allows(OrganizationRole.OWNER, OrganizationRole.ADMIN)
    assert role_allows(OrganizationRole.ADMIN, OrganizationRole.MEMBER)
    assert not role_allows(OrganizationRole.MEMBER, OrganizationRole.ADMIN)
