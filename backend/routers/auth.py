"""Authentication router: register, login, token refresh, logout, and /auth/me."""

from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

import mysql.connector
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel

from ..city_config import DEFAULT_CITY, normalize_city_code
from ..db import get_raw_db
from ..utils.auth_deps import (
    ACCESS_TOKEN_TTL_SEC,
    ADMIN_ROLE_CODE,
    REFRESH_TOKEN_TTL_SEC,
    bearer,
    clear_cookie,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    set_cookie,
    verify_password,
)
from ..utils.helpers import (
    _customer_has_city,
    _normalize_city_label,
    _resolve_city_code,
)
from ..utils.rbac import (
    ensure_default_roles,
    parse_role_ids,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class CustomerCreate(BaseModel):
    """Registration payload for a new customer with their first address."""

    referred_by: Optional[str] = None
    primary_mobile: str
    alternative_mobile: Optional[str] = None
    name: str
    recipient_name: str
    payment_frequency: Optional[str] = "Daily"
    email: Optional[str] = None
    house_apartment_no: Optional[str] = None
    written_address: str
    city: str
    city_code: Optional[str] = None
    pin_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address_type: Optional[str] = None
    route_id: Optional[int] = None
    is_default: bool = False


class LoginRequest(BaseModel):
    """Login credentials payload."""

    phone: str
    admin_password: Optional[str] = None
    city_code: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers (shared with rbac router via import of build_role_context)
# ---------------------------------------------------------------------------


def _build_role_context_for_login(db, roles: List[int]):
    """Fetch role context needed at login time.

    Args:
        db: mysql.connector connection.
        roles: List of role IDs from the customer record.

    Returns:
        Tuple of (role_map, role_codes, role_details).
    """
    from ..utils.rbac import ensure_default_roles, fetch_role_map, make_role_summary

    cursor = db.cursor()
    try:
        ensure_default_roles(cursor)
        role_map = fetch_role_map(cursor, roles)
    finally:
        cursor.close()
    effective_roles = roles[:] if roles else list(role_map.keys())
    code_seen: set[str] = set()
    role_codes: List[str] = []
    for rid in effective_roles:
        details = role_map.get(rid)
        if not details:
            continue
        code = details.get("code")
        if not code or code in code_seen:
            continue
        code_seen.add(code)
        role_codes.append(code)
    from ..utils.rbac import make_role_summary

    role_details = make_role_summary(effective_roles, role_map)
    return role_map, role_codes, role_details


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/api/register")
def register_customer(data: CustomerCreate):
    """Register a new customer and create their first address.

    Checks for duplicate mobile numbers. On success, inserts into customers
    and addresses tables.

    Args:
        data: Customer registration payload including address details.

    Returns:
        Dict with success flag and new customer_id.
    """
    db = get_raw_db()
    cursor = db.cursor()
    try:
        normalized_city_code = _resolve_city_code(data.city, data.city_code)
        city_label = _normalize_city_label(data.city, normalized_city_code)

        cursor.execute("SELECT customer_id FROM customers WHERE primary_mobile = %s", (data.primary_mobile,))
        existing_customer = cursor.fetchone()
        if existing_customer:
            raise HTTPException(
                status_code=400,
                detail="Mobile number already exists! Please login instead.",
            )

        cursor.execute(
            """
            INSERT INTO customers (referred_by, primary_mobile, alternative_mobile, name, recipient_name, payment_frequency, email)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                data.referred_by,
                data.primary_mobile,
                data.alternative_mobile,
                data.name,
                data.recipient_name,
                data.payment_frequency,
                data.email,
            ),
        )
        customer_id = cursor.lastrowid

        cursor.execute(
            """
            INSERT INTO addresses (customer_id, house_apartment_no, written_address, city, city_code, pin_code, latitude, longitude, address_type, route_id, is_default)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                customer_id,
                data.house_apartment_no,
                data.written_address,
                city_label,
                normalized_city_code,
                data.pin_code,
                data.latitude,
                data.longitude,
                data.address_type,
                data.route_id,
                True,
            ),
        )

        db.commit()
        return {"success": True, "customer_id": customer_id}

    except mysql.connector.IntegrityError as err:
        db.rollback()
        if err.errno == 1062:
            raise HTTPException(
                status_code=400,
                detail="Duplicate entry: Mobile number already registered",
            )
        raise HTTPException(status_code=400, detail=str(err))
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.post("/api/login")
def login(data: LoginRequest, response: Response):
    """Authenticate a customer or admin user and issue JWT tokens.

    Sets access and refresh tokens as HTTP-only cookies (used by Next.js
    middleware and SSR requests) and also returns them in the JSON body
    so the frontend can persist them in localStorage for client-side API calls.

    Args:
        data: Login credentials (phone, optional admin_password, optional city_code).
        response: FastAPI response object used to set cookies.

    Returns:
        JSON with message, user profile, role info, and token pair.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        ensure_default_roles(cursor)
        cursor.execute(
            """
            SELECT
                c.customer_id,
                c.name AS customer_name,
                c.primary_mobile AS phone_number,
                c.roles,
                c.admin_password_hash,
                c.admin_is_active
            FROM customers c
            WHERE c.primary_mobile = %s
            LIMIT 1
            """,
            (data.phone,),
        )
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="User not found. Please register.")

        roles = parse_role_ids(result.get("roles"))
        role_map, role_codes, role_details = _build_role_context_for_login(db, roles)
        has_admin_role = ADMIN_ROLE_CODE in role_codes
        is_admin_account = has_admin_role and bool(result.get("admin_password_hash"))
        admin_password_provided = bool(data.admin_password)

        admin_login = False
        admin_is_active = bool(result.get("admin_is_active", True))
        if admin_password_provided:
            if not has_admin_role:
                raise HTTPException(
                    status_code=403, detail="Admin access not enabled for this user."
                )
            if not admin_is_active:
                raise HTTPException(status_code=403, detail="Admin account disabled")
            password_hash = result.get("admin_password_hash")
            if not password_hash:
                raise HTTPException(status_code=400, detail="Admin password not set")
            if not verify_password(data.admin_password, password_hash):
                raise HTTPException(status_code=401, detail="Invalid admin password")
            admin_login = True

        if not admin_password_provided and not data.city_code:
            raise HTTPException(status_code=400, detail="Please select a city to continue.")

        requested_city_code = _resolve_city_code(None, data.city_code)
        if not admin_password_provided and not _customer_has_city(
            cursor, result["customer_id"], requested_city_code
        ):
            raise HTTPException(
                status_code=403,
                detail="You are not registered for this city yet. Please add an address in this city to continue.",
            )

        cursor.execute(
            "SELECT DISTINCT city_code FROM addresses WHERE customer_id=%s",
            (result["customer_id"],),
        )
        eligible_rows = cursor.fetchall() or []
        eligible_codes = []
        for row in eligible_rows:
            code = row.get("city_code")
            if not code:
                continue
            eligible_codes.append(normalize_city_code(code))
        if requested_city_code not in eligible_codes:
            eligible_codes.append(requested_city_code)

        base_payload = {
            "customer_id": result["customer_id"],
            "phone": result["phone_number"],
            "name": result.get("customer_name"),
            "roles": roles,
            "role_codes": role_codes,
            "is_admin": has_admin_role,
            "admin_is_active": admin_is_active,
            "city_code": requested_city_code,
            "eligible_city_codes": eligible_codes or [requested_city_code],
        }
        if has_admin_role:
            base_payload["admin_id"] = result["customer_id"]
            base_payload["role"] = ADMIN_ROLE_CODE
        else:
            base_payload["role"] = "customer"

        access = create_access_token(base_payload)
        refresh_tok = create_refresh_token(base_payload, str(uuid.uuid4()))

        set_cookie(response, "access_token", access, ACCESS_TOKEN_TTL_SEC)
        set_cookie(response, "refresh_token", refresh_tok, REFRESH_TOKEN_TTL_SEC)

        user_payload = dict(base_payload)
        user_payload["role_details"] = role_details

        return {
            "message": "Login successful",
            "is_admin": admin_login,
            "is_admin_account": is_admin_account,
            "user": user_payload,
            "access_token": access,
            "refresh_token": refresh_tok,
            "role_codes": role_codes,
            "role_details": role_details,
        }
    finally:
        cursor.close()
        db.close()


@router.post("/auth/refresh")
async def refresh(
    request: Request,
    response: Response,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
):
    """Issue a new access token (and rotate the refresh token) given a valid refresh token.

    Token lookup order:
    1. HTTP-only ``refresh_token`` cookie.
    2. ``Authorization: Bearer <token>`` header.
    3. JSON body ``{"refresh_token": "..."}``.

    Args:
        request: FastAPI request object.
        response: FastAPI response object used to set cookies.
        creds: Optional Bearer credentials from the Authorization header.

    Returns:
        JSON with new ``access_token`` and ``refresh_token``.
    """
    token = request.cookies.get("refresh_token")

    if not token and creds and creds.scheme.lower() == "bearer":
        token = creds.credentials

    if not token:
        try:
            body = await request.json()
            if isinstance(body, dict):
                token = body.get("refresh_token")
        except Exception:
            pass

    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")

    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            raise ValueError("wrong token type")
        sub = payload.get("sub") or payload.get("usr")
        if not sub:
            raise ValueError("missing sub claim")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    new_access = create_access_token(sub)
    new_refresh = create_refresh_token(sub, str(uuid.uuid4()))

    set_cookie(response, "access_token", new_access, ACCESS_TOKEN_TTL_SEC)
    set_cookie(response, "refresh_token", new_refresh, REFRESH_TOKEN_TTL_SEC)

    return {"access_token": new_access, "refresh_token": new_refresh}


@router.post("/auth/logout")
def logout(response: Response):
    """Clear authentication cookies.

    Args:
        response: FastAPI response object.

    Returns:
        Dict with ok flag.
    """
    clear_cookie(response, "access_token")
    clear_cookie(response, "refresh_token")
    return {"ok": True}


@router.get("/auth/me")
def me(user: Dict[str, Any] = Depends(get_current_user)):
    """Return the currently authenticated user's JWT payload.

    Args:
        user: Current authenticated user (injected by get_current_user).

    Returns:
        The decoded JWT sub claim dict.
    """
    return user
