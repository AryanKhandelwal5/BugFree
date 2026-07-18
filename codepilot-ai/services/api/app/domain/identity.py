"""Identity domain types and authorization invariants."""

from enum import StrEnum


class OrganizationRole(StrEnum):
    """Roles ordered by privileges inside an organization."""

    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


ROLE_RANK = {
    OrganizationRole.OWNER: 4,
    OrganizationRole.ADMIN: 3,
    OrganizationRole.MEMBER: 2,
    OrganizationRole.VIEWER: 1,
}


def role_allows(actual: OrganizationRole, required: OrganizationRole) -> bool:
    """Return whether a membership role has the required privilege."""
    return ROLE_RANK[actual] >= ROLE_RANK[required]

