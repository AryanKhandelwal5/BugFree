"""Tenant management endpoints with explicit authorization."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.organization_service import OrganizationService
from app.domain.identity import OrganizationRole
from app.presentation.http.auth import current_user_id, get_session
from app.presentation.http.rate_limit import enforce_rate_limit

router = APIRouter(prefix="/api/v1/organizations", tags=["organizations"])


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class OrganizationView(BaseModel):
    id: UUID
    name: str
    slug: str


class MemberCreate(BaseModel):
    email: str
    role: OrganizationRole = OrganizationRole.MEMBER


@router.post("", response_model=OrganizationView, status_code=201, dependencies=[Depends(enforce_rate_limit)])
async def create_organization(body: OrganizationCreate, user_id: UUID = Depends(current_user_id), session: AsyncSession = Depends(get_session)) -> OrganizationView:
    organization = await OrganizationService(session).create(user_id, body.name)
    return OrganizationView.model_validate(organization, from_attributes=True)


@router.get("", response_model=list[OrganizationView])
async def list_organizations(user_id: UUID = Depends(current_user_id), session: AsyncSession = Depends(get_session)) -> list[OrganizationView]:
    organizations = await OrganizationService(session).list_for_user(user_id)
    return [OrganizationView.model_validate(item, from_attributes=True) for item in organizations]


@router.post("/{organization_id}/members", status_code=status.HTTP_201_CREATED, dependencies=[Depends(enforce_rate_limit)])
async def add_member(organization_id: UUID, body: MemberCreate, user_id: UUID = Depends(current_user_id), session: AsyncSession = Depends(get_session)) -> dict[str, str]:
    try:
        membership = await OrganizationService(session).add_member(user_id, organization_id, body.email, body.role)
    except PermissionError as error:
        raise HTTPException(status_code=403, detail="administrator role required") from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail="user not found") from error
    except ValueError as error:
        raise HTTPException(status_code=409, detail="user is already a member") from error
    return {"membership_id": str(membership.id), "role": membership.role.value}
