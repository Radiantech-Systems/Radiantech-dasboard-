"""
Authentication helpers for Jetson telemetry and dashboard access.

- Jetson/device telemetry uses the shared API key.
- Browser dashboard access uses the authenticated telemetry_session cookie.
"""

from fastapi import Header, HTTPException, Query, Cookie, Depends
from typing import Optional

from app.config import settings


def verify_api_key(
    x_api_key: Optional[str] = Header(None),
    api_key: Optional[str] = Query(None),
) -> None:
    """
    Authentication for Jetson/device API requests.

    Checks the X-API-Key header and falls back to ?api_key=
    for browser download links that cannot send custom headers.
    """
    if not settings.API_KEY:
        return

    if x_api_key != settings.API_KEY and api_key != settings.API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key",
        )


def verify_dashboard_auth(
    telemetry_session: Optional[str] = Cookie(default=None),
) -> None:
    """
    Authentication for browser dashboard REST requests.

    The browser receives telemetry_session after successful
    dashboard login and sends it automatically with API requests.
    """
    from app.auth import _valid_session

    if not _valid_session(telemetry_session):
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
        )


def verify_api_key_ws(
    api_key: Optional[str] = Query(None),
) -> bool:
    """
    Legacy WebSocket API-key authentication.
    Kept for compatibility with device/API-key clients.
    """
    if not settings.API_KEY:
        return True

    return api_key == settings.API_KEY


def require_page_access(permission: str):
    """Require an authenticated dashboard session and the requested page permission."""
    def check_page_access(
        telemetry_session: Optional[str] = Cookie(default=None),
    ) -> None:
        from app.auth import _session_identity

        identity = _session_identity(telemetry_session)
        if not identity:
            raise HTTPException(status_code=401, detail="Not authenticated")

        # Administrators retain full access, including bootstrap-admin sessions.
        if identity.get("role") == "Admin":
            return

        if permission not in identity.get("permissions", []):
            raise HTTPException(status_code=403, detail="Page access denied")

    return check_page_access
