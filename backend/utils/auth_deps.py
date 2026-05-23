"""JWT token helpers and FastAPI auth dependency functions.

These are shared across all routers that need authentication.
"""

from __future__ import annotations

import time
import uuid
from typing import Any, Dict, Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..config import (
    ACCESS_TOKEN_TTL_SEC,
    ALGORITHM,
    COOKIE_DOMAIN,
    COOKIE_SAMESITE,
    COOKIE_SECURE,
    REFRESH_TOKEN_TTL_SEC,
    SECRET_KEY,
)

ADMIN_ROLE_CODE = "admin"
DEVELOPER_ROLE_CODE = "developer"

# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------


def _create_jwt(payload: dict, ttl: int) -> str:
    """Create a signed JWT token with the given payload and TTL.

    Args:
        payload: Claims to embed in the token.
        ttl: Time-to-live in seconds.

    Returns:
        Encoded JWT string.
    """
    now = int(time.time())
    body = dict(payload)
    body["iat"] = now
    body["exp"] = now + ttl
    return jwt.encode(body, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(sub: dict) -> str:
    """Create an access token for the given subject payload.

    Args:
        sub: Dict representing the authenticated user to embed as the "sub" claim.

    Returns:
        Signed JWT access token string.
    """
    return _create_jwt({"sub": sub, "type": "access"}, ACCESS_TOKEN_TTL_SEC)


def create_refresh_token(sub: dict, jti: str) -> str:
    """Create a refresh token for the given subject payload.

    Args:
        sub: Dict representing the authenticated user.
        jti: Unique JWT ID (use str(uuid.uuid4())).

    Returns:
        Signed JWT refresh token string.
    """
    return _create_jwt({"sub": sub, "type": "refresh", "jti": jti}, REFRESH_TOKEN_TTL_SEC)


def decode_token(token: str) -> dict:
    """Decode and verify a JWT token.

    Args:
        token: Encoded JWT string.

    Returns:
        Decoded payload dict.
    """
    # Disable "sub must be string" validation since we embed a dict in sub.
    return jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM],
        options={"verify_sub": False},
    )


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------


def hash_password(plain: str) -> str:
    """Hash a plain-text password with bcrypt.

    Args:
        plain: Plain-text password string.

    Returns:
        Bcrypt-hashed password string.
    """
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain.encode(), salt).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against a bcrypt hash.

    Args:
        plain: Plain-text password to verify.
        hashed: Previously hashed password string.

    Returns:
        True if the password matches.
    """
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Cookie helpers
# ---------------------------------------------------------------------------

from fastapi import Response


def set_cookie(resp: Response, name: str, value: str, max_age: int) -> None:
    """Set a secure HTTP-only cookie on the response.

    Args:
        resp: FastAPI Response object.
        name: Cookie name.
        value: Cookie value.
        max_age: Max-age in seconds.
    """
    resp.set_cookie(
        key=name,
        value=value,
        max_age=max_age,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        path="/",
    )


def clear_cookie(resp: Response, name: str) -> None:
    """Delete a cookie from the response.

    Args:
        resp: FastAPI Response object.
        name: Cookie name to clear.
    """
    resp.delete_cookie(key=name, domain=COOKIE_DOMAIN, path="/")


# ---------------------------------------------------------------------------
# Auth dependencies
# ---------------------------------------------------------------------------

bearer = HTTPBearer(auto_error=False)


def _user_has_role(user: Dict[str, Any], role_code: str) -> bool:
    """Check if a decoded JWT user payload includes a specific role code.

    Args:
        user: Decoded user payload dict from JWT sub claim.
        role_code: Role code to check for.

    Returns:
        True if the user has the role.
    """
    role_codes = user.get("role_codes")
    if isinstance(role_codes, list):
        if role_code in role_codes:
            return True
    elif isinstance(role_codes, str):
        if role_codes == role_code:
            return True
    legacy_role = user.get("role")
    return legacy_role == role_code


def _read_access_token(
    req: Request, creds: Optional[HTTPAuthorizationCredentials]
) -> Optional[str]:
    """Extract the access token from Bearer header or cookie.

    Args:
        req: Incoming FastAPI request.
        creds: Optional HTTPBearer credentials.

    Returns:
        Token string or None.
    """
    if creds and creds.scheme.lower() == "bearer":
        return creds.credentials
    return req.cookies.get("access_token")


def get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> Dict[str, Any]:
    """FastAPI dependency that extracts and validates the current user from the JWT.

    Args:
        request: FastAPI request object.
        creds: Optional Bearer credentials from Authorization header.

    Returns:
        Decoded user payload dict from JWT sub claim.
    """
    token = _read_access_token(request, creds)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise ValueError("wrong token type")
        return payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_optional_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> Optional[Dict[str, Any]]:
    """FastAPI dependency that returns the current user or None if unauthenticated.

    Args:
        request: FastAPI request object.
        creds: Optional Bearer credentials from Authorization header.

    Returns:
        Decoded user payload dict or None.
    """
    token = _read_access_token(request, creds)
    if not token:
        return None
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        return payload["sub"]
    except Exception:
        return None


def admin_required(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """FastAPI dependency that enforces admin role.

    Args:
        user: Current authenticated user (injected by get_current_user).

    Returns:
        The user dict if the user has the admin role.
    """
    if not user or not _user_has_role(user, ADMIN_ROLE_CODE):
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def developer_required(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """FastAPI dependency that enforces developer role.

    Args:
        user: Current authenticated user (injected by get_current_user).

    Returns:
        The user dict if the user has the developer role.
    """
    if not user or not _user_has_role(user, DEVELOPER_ROLE_CODE):
        raise HTTPException(status_code=403, detail="Developer only")
    return user
