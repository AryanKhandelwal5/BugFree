"""Identity HTTP routes with cookie-backed refresh credentials."""

from collections.abc import AsyncIterator
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.auth_service import AuthService, AuthenticationError, DuplicateEmailError
from app.infrastructure.config import Settings
from app.infrastructure.persistence import Database
from app.infrastructure.security import TokenError, decode_access_token
from app.presentation.http.rate_limit import enforce_rate_limit

router = APIRouter(prefix="/api/v1/auth", tags=["identity"])
bearer = HTTPBearer(auto_error=False)
REFRESH_COOKIE = "codepilot_refresh"


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=256)


class AccessToken(BaseModel):
    access_token: str
    token_type: str = "bearer"


def get_settings_from_request(request: Request) -> Settings:
    return request.app.state.settings  # type: ignore[no-any-return]


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    database: Database = request.app.state.database
    async for session in database.session():
        yield session


def set_refresh_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        REFRESH_COOKIE,
        token,
        httponly=True,
        secure=settings.environment == "production",
        samesite="strict",
        max_age=settings.refresh_token_ttl_days * 86400,
        path="/api/v1/auth",
    )


@router.post("/register", response_model=AccessToken, status_code=status.HTTP_201_CREATED, dependencies=[Depends(enforce_rate_limit)])
async def register(body: Credentials, response: Response, request: Request, session: AsyncSession = Depends(get_session)) -> AccessToken:
    service = AuthService(session, get_settings_from_request(request))
    try:
        user = await service.register(str(body.email), body.password)
        access, refresh = await service.login(user.email, body.password)
    except DuplicateEmailError as error:
        raise HTTPException(status_code=409, detail="email already registered") from error
    set_refresh_cookie(response, refresh, get_settings_from_request(request))
    return AccessToken(access_token=access)


@router.post("/login", response_model=AccessToken, dependencies=[Depends(enforce_rate_limit)])
async def login(body: Credentials, response: Response, request: Request, session: AsyncSession = Depends(get_session)) -> AccessToken:
    try:
        access, refresh = await AuthService(session, get_settings_from_request(request)).login(str(body.email), body.password)
    except AuthenticationError as error:
        raise HTTPException(status_code=401, detail="invalid credentials") from error
    set_refresh_cookie(response, refresh, get_settings_from_request(request))
    return AccessToken(access_token=access)


@router.post("/refresh", response_model=AccessToken, dependencies=[Depends(enforce_rate_limit)])
async def refresh(response: Response, request: Request, session: AsyncSession = Depends(get_session)) -> AccessToken:
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="refresh token required")
    try:
        access, rotated = await AuthService(session, get_settings_from_request(request)).rotate(token)
    except AuthenticationError as error:
        raise HTTPException(status_code=401, detail="invalid refresh token") from error
    set_refresh_cookie(response, rotated, get_settings_from_request(request))
    return AccessToken(access_token=access)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response, request: Request, session: AsyncSession = Depends(get_session)) -> Response:
    token = request.cookies.get(REFRESH_COOKIE)
    if token:
        await AuthService(session, get_settings_from_request(request)).logout(token)
    response.delete_cookie(REFRESH_COOKIE, path="/api/v1/auth")
    return response


async def current_user_id(
    request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer)
) -> UUID:
    if credentials is None:
        raise HTTPException(status_code=401, detail="bearer token required")
    try:
        return decode_access_token(credentials.credentials, get_settings_from_request(request))
    except TokenError as error:
        raise HTTPException(status_code=401, detail="invalid access token") from error
