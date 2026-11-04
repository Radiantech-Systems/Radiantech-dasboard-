from datetime import datetime, timedelta, timezone
import hmac
import secrets

from fastapi import APIRouter, Cookie, HTTPException, Response
from pydantic import BaseModel, Field
from pwdlib import PasswordHash
from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.database import SessionLocal
from app.models import DashboardUser

router = APIRouter(prefix="/auth", tags=["authentication"])
password_hash = PasswordHash.recommended()

SESSION_COOKIE = "telemetry_session"
SESSION_MAX_AGE = 8 * 60 * 60

PAGE_PERMISSIONS = [
    "dashboard",
    "system_information",
    "live_cctv",
    "network_cameras",
    "network",
    "ai_snapshots",
    "temperature_history",
    "sliced_footage",
    "traffic_signal_control",
    "settings",
    "violations",
    "user_management",
]

ROLE_DEFAULTS = {
    "Admin": PAGE_PERMISSIONS,
    "IT": [
        "dashboard",
        "system_information",
        "temperature_history",
        "network",
        "network_cameras",
    ],
    "User": [
        "live_cctv",
        "violations",
        "traffic_signal_control",
        "sliced_footage",
    ],
}


class LoginRequest(BaseModel):
    username: str
    password: str
    role: str = "Admin"


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=128)
    password: str = Field(min_length=8, max_length=256)
    role: str = "User"
    permissions: list[str] | None = None


class UserUpdate(BaseModel):
    password: str | None = Field(default=None, min_length=8, max_length=256)
    role: str | None = None
    permissions: list[str] | None = None
    is_active: bool | None = None


_sessions: dict[str, datetime] = {}
_session_users: dict[str, dict] = {}


def _cleanup_sessions() -> None:
    now = datetime.now(timezone.utc)
    for session_id, expires_at in list(_sessions.items()):
        if expires_at <= now:
            _sessions.pop(session_id, None)
            _session_users.pop(session_id, None)


def _create_session(
    username: str,
    role: str = "Admin",
    permissions: list[str] | None = None,
    user_id: int | None = None,
) -> str:
    _cleanup_sessions()
    session_id = secrets.token_urlsafe(32)
    _sessions[session_id] = (
        datetime.now(timezone.utc) + timedelta(seconds=SESSION_MAX_AGE)
    )
    _session_users[session_id] = {
        "username": username,
        "role": role,
        "permissions": list(permissions or ROLE_DEFAULTS["Admin"]),
        "user_id": user_id,
    }
    return session_id


def _valid_session(session_id: str | None) -> bool:
    if not session_id:
        return False
    _cleanup_sessions()
    expires_at = _sessions.get(session_id)
    if not expires_at or expires_at <= datetime.now(timezone.utc):
        _sessions.pop(session_id, None)
        _session_users.pop(session_id, None)
        return False
    return True


def _session_identity(session_id: str | None) -> dict | None:
    if not _valid_session(session_id):
        return None
    return _session_users.get(session_id)


def _is_admin(session_id: str | None) -> bool:
    identity = _session_identity(session_id)
    return bool(identity and identity["role"] == "Admin")


def _public_user(user: DashboardUser) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "permissions": user.permissions or [],
        "is_active": user.is_active,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }


def _validate_permissions(role: str, permissions: list[str] | None) -> list[str]:
    if role not in ROLE_DEFAULTS:
        raise HTTPException(
            status_code=400,
            detail="Role must be Admin, IT, or User",
        )
    result = ROLE_DEFAULTS[role] if permissions is None else permissions
    unknown = sorted(set(result) - set(PAGE_PERMISSIONS))
    if unknown:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown permissions: {', '.join(unknown)}",
        )
    if role == "Admin" and set(result) != set(PAGE_PERMISSIONS):
        raise HTTPException(
            status_code=400,
            detail="Admin users must retain all permissions",
        )
    return list(dict.fromkeys(result))


def _require_admin(session_id: str | None) -> None:
    if not _valid_session(session_id):
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not _is_admin(session_id):
        raise HTTPException(status_code=403, detail="Admin access required")


@router.post("/login")
def login(payload: LoginRequest, response: Response):
    # Permanent environment-configured accounts take priority over database users.
    fixed_accounts = [
        (
            settings.AUTH_IT_USERNAME,
            settings.AUTH_IT_PASSWORD_HASH,
            "IT",
            ROLE_DEFAULTS["IT"],
        ),
        (
            settings.AUTH_USER_USERNAME,
            settings.AUTH_USER_PASSWORD_HASH,
            "User",
            ROLE_DEFAULTS["User"],
        ),
    ]

    username = None
    role = None
    permissions = None
    user_id = None

    for fixed_username, fixed_hash, fixed_role, fixed_permissions in fixed_accounts:
        if hmac.compare_digest(payload.username, fixed_username):
            if not fixed_hash or not password_hash.verify(payload.password, fixed_hash):
                raise HTTPException(
                    status_code=401,
                    detail="Invalid username or password",
                )
            username = fixed_username
            role = fixed_role
            permissions = fixed_permissions
            break

    db = SessionLocal()
    try:
        if username is None:
            user = (
                db.query(DashboardUser)
                .filter(DashboardUser.username == payload.username)
                .first()
            )

            if user is not None:
                if (
                    not user.is_active
                    or not password_hash.verify(payload.password, user.password_hash)
                ):
                    raise HTTPException(
                        status_code=401,
                        detail="Invalid username or password",
                    )
                role = user.role
                permissions = user.permissions or ROLE_DEFAULTS.get(user.role, [])
                user_id = user.id
                username = user.username
            else:
                # Preserve the existing environment-configured administrator.
                username_valid = hmac.compare_digest(
                    payload.username, settings.AUTH_USERNAME
                )
                password_valid = bool(settings.AUTH_PASSWORD_HASH) and (
                    password_hash.verify(
                        payload.password, settings.AUTH_PASSWORD_HASH
                    )
                )
                if not username_valid or not password_valid:
                    raise HTTPException(
                        status_code=401,
                        detail="Invalid username or password",
                    )
                username = settings.AUTH_USERNAME
                role = "Admin"
                permissions = PAGE_PERMISSIONS
                user_id = None

        if payload.role not in ROLE_DEFAULTS or payload.role != role:
            raise HTTPException(
                status_code=401,
                detail="Invalid username or password",
            )

        session_id = _create_session(
            username=username,
            role=role,
            permissions=permissions,
            user_id=user_id,
        )
        response.set_cookie(
            key=SESSION_COOKIE,
            value=session_id,
            max_age=SESSION_MAX_AGE,
            httponly=True,
            secure=False,
            samesite="lax",
            path="/",
        )
        return {
            "authenticated": True,
            "username": username,
            "role": role,
            "permissions": permissions,
        }
    finally:
        db.close()

@router.post("/logout")
def logout(
    response: Response,
    telemetry_session: str | None = Cookie(default=None),
):
    if telemetry_session:
        _sessions.pop(telemetry_session, None)
        _session_users.pop(telemetry_session, None)
    response.delete_cookie(key=SESSION_COOKIE, path="/")
    return {"authenticated": False}


@router.get("/me")
def me(telemetry_session: str | None = Cookie(default=None)):
    identity = _session_identity(telemetry_session)
    if not identity:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {
        "authenticated": True,
        "username": identity["username"],
        "role": identity["role"],
        "permissions": identity["permissions"],
    }


@router.get("/permissions")
def get_available_permissions(
    telemetry_session: str | None = Cookie(default=None),
):
    if not _valid_session(telemetry_session):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {
        "permissions": PAGE_PERMISSIONS,
        "role_defaults": ROLE_DEFAULTS,
    }


@router.get("/users")
def list_users(
    telemetry_session: str | None = Cookie(default=None),
):
    _require_admin(telemetry_session)
    db = SessionLocal()
    try:
        users = db.query(DashboardUser).order_by(DashboardUser.id).all()
        return {"users": [_public_user(user) for user in users]}
    finally:
        db.close()


@router.post("/users", status_code=201)
def create_user(
    payload: UserCreate,
    telemetry_session: str | None = Cookie(default=None),
):
    _require_admin(telemetry_session)
    username = payload.username.strip()
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")

    permissions = _validate_permissions(payload.role, payload.permissions)
    db = SessionLocal()
    try:
        if db.query(DashboardUser).filter_by(username=username).first():
            raise HTTPException(status_code=409, detail="Username already exists")

        user = DashboardUser(
            username=username,
            password_hash=password_hash.hash(payload.password),
            role=payload.role,
            permissions=permissions,
            is_active=True,
        )
        db.add(user)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=409, detail="Username already exists")
        db.refresh(user)
        return _public_user(user)
    finally:
        db.close()


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    payload: UserUpdate,
    telemetry_session: str | None = Cookie(default=None),
):
    _require_admin(telemetry_session)
    db = SessionLocal()
    try:
        user = db.query(DashboardUser).filter_by(id=user_id).first()
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        identity = _session_identity(telemetry_session)
        if (
            identity
            and identity.get("user_id") == user.id
            and payload.is_active is False
        ):
            raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

        role = payload.role if payload.role is not None else user.role
        permissions = (
            payload.permissions
            if payload.permissions is not None
            else user.permissions
        )
        user.permissions = _validate_permissions(role, permissions)
        user.role = role

        if payload.password is not None:
            user.password_hash = password_hash.hash(payload.password)
        if payload.is_active is not None:
            user.is_active = payload.is_active

        db.commit()
        db.refresh(user)

        # Invalidate every session for this user after any account update,
        # so role, permissions, password, and active status take effect
        # immediately. Other users and the bootstrap admin are unaffected.
        for sid, session_identity in list(_session_users.items()):
            if session_identity.get("user_id") == user.id:
                _sessions.pop(sid, None)
                _session_users.pop(sid, None)

        return _public_user(user)
    finally:
        db.close()


def verify_dashboard_session(
    telemetry_session: str | None = Cookie(default=None),
) -> None:
    if not _valid_session(telemetry_session):
        raise HTTPException(status_code=401, detail="Not authenticated")
