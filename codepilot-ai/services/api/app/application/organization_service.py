"""Tenant and membership use cases."""

import re
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.identity import OrganizationRole, role_allows
from app.infrastructure.persistence import AuditEventRecord, MembershipRecord, OrganizationRecord, UserRecord


class OrganizationService:
    """Enforces organization membership and role transitions in one place."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, owner_id: UUID, name: str) -> OrganizationRecord:
        slug = re.sub(r"[^a-z0-9]+", "-", name.casefold()).strip("-")[:80]
        org = OrganizationRecord(name=name.strip(), slug=slug)
        self._session.add(org)
        await self._session.flush()
        self._session.add(MembershipRecord(organization_id=org.id, user_id=owner_id, role=OrganizationRole.OWNER))
        self._session.add(AuditEventRecord(organization_id=org.id, actor_user_id=owner_id, action="organization.created"))
        await self._session.commit()
        await self._session.refresh(org)
        return org

    async def list_for_user(self, user_id: UUID) -> list[OrganizationRecord]:
        result = await self._session.scalars(
            select(OrganizationRecord).join(MembershipRecord).where(MembershipRecord.user_id == user_id)
        )
        return list(result.all())

    async def add_member(self, actor_id: UUID, organization_id: UUID, email: str, role: OrganizationRole) -> MembershipRecord:
        actor = await self._membership(actor_id, organization_id)
        if actor is None or not role_allows(actor.role, OrganizationRole.ADMIN):
            raise PermissionError
        if role == OrganizationRole.OWNER and actor.role != OrganizationRole.OWNER:
            raise PermissionError
        user = await self._session.scalar(select(UserRecord).where(UserRecord.email == email.casefold().strip()))
        if user is None:
            raise LookupError
        if await self._membership(user.id, organization_id) is not None:
            raise ValueError
        membership = MembershipRecord(organization_id=organization_id, user_id=user.id, role=role)
        self._session.add(membership)
        self._session.add(AuditEventRecord(organization_id=organization_id, actor_user_id=actor_id, action="organization.member_added"))
        await self._session.commit()
        await self._session.refresh(membership)
        return membership

    async def _membership(self, user_id: UUID, organization_id: UUID) -> MembershipRecord | None:
        return await self._session.scalar(select(MembershipRecord).where(MembershipRecord.user_id == user_id, MembershipRecord.organization_id == organization_id))
