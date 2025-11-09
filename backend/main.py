from calendar import month
from datetime import date, datetime, timedelta
import re
import mysql.connector
from mysql.connector import errorcode
from fastapi import FastAPI, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import Any, Dict, Iterable, List, Optional, Tuple
import random
from collections import defaultdict
from fastapi.middleware.cors import CORSMiddleware
import csv
import io
from .routers import admin_logs, reports, nl_router
from .customer.customer_crud import (
    create_customer,
    get_customer_by_id,
    get_all_customers,
    update_customer,
    delete_customer,
    CustomerUpdate,
    get_customer_count  # Add this line
)
import os, time, uuid, jwt, bcrypt
from fastapi import Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from .utils.logger import log_admin_action
from .utils.rbac import (
    ensure_default_roles,
    fetch_role_map,
    get_role_id,
    make_role_summary,
    parse_role_ids,
    roles_to_json,
)
from .city_config import DEFAULT_CITY, CityCode, normalize_city_code, city_supports_food, city_supports_condiments

class OrderStatusUpdate(BaseModel):
    status: str = Field(..., min_length=1, max_length=50)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:8000",  # swagger same-origin
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ADMIN_ROLE_CODE = "admin"
DEVELOPER_ROLE_CODE = "developer"

app.include_router(admin_logs.router)
app.include_router(reports.router)
app.include_router(nl_router.router)

# Database connection function
def get_db():
    return mysql.connector.connect(
        host="localhost",
        user="fastapi_user",
        password="password",
        database="kk_v1"
    )


def _format_datetime(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    return dt.isoformat()


def _parse_optional_date(value: Optional[str]) -> Optional[date]:
    if value is None:
        return None
    stripped = value.strip()
    if not stripped:
        return None
    try:
        return datetime.strptime(stripped, "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.") from exc


MEAL_NORMALIZATION_MAP = {
    "breakfast": "Breakfast",
    "lunch": "Lunch",
    "dinner": "Dinner",
    "condiments": "Condiments",
}


def normalize_meal_type(raw: Optional[str]) -> str:
    if raw is None:
        raise HTTPException(status_code=400, detail="BLD type is required")
    cleaned = raw.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="BLD type is required")
    return MEAL_NORMALIZATION_MAP.get(cleaned.lower(), cleaned)


def _row_value(row: Any, key: str, index: int = 0) -> Optional[int]:
    if row is None:
        return None
    if isinstance(row, dict):
        value = row.get(key)
    elif isinstance(row, (list, tuple)):
        value = row[index] if len(row) > index else None
    else:
        value = None
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def resolve_bld_id(cursor, bld_type: str) -> int:
    normalized = normalize_meal_type(bld_type)
    cursor.execute(
        "SELECT bld_id FROM bld WHERE LOWER(bld_type) = LOWER(%s) LIMIT 1",
        (normalized,),
    )
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="BLD type not found")
    bld_id = _row_value(row, "bld_id", 0)
    if bld_id is None:
        raise HTTPException(status_code=500, detail="Failed to resolve BLD identifier")
    return bld_id


def _normalize_int_list(values: Iterable[Any]) -> List[int]:
    normalized: List[int] = []
    for raw in values or []:
        if raw is None:
            continue
        try:
            parsed = int(raw)
        except (TypeError, ValueError):
            continue
        if parsed > 0:
            normalized.append(parsed)
    return normalized


def _validate_bld_ids(cursor, bld_ids: Iterable[Any]) -> List[int]:
    normalized = sorted(set(_normalize_int_list(bld_ids)))
    if not normalized:
        return []

    placeholders = ", ".join(["%s"] * len(normalized))
    cursor.execute(
        f"SELECT bld_id FROM bld WHERE bld_id IN ({placeholders})",
        tuple(normalized),
    )
    rows = cursor.fetchall() or []
    valid = {value for value in (_row_value(row, "bld_id", 0) for row in rows) if value is not None}

    invalid = [bid for bid in normalized if bid not in valid]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid bld_ids: {invalid}")

    return sorted(valid)


def get_item_blds(cursor, item_id: int) -> List[int]:
    cursor.execute(
        "SELECT bld_id FROM item_bld_map WHERE item_id = %s ORDER BY bld_id",
        (item_id,),
    )
    rows = cursor.fetchall() or []
    return [value for value in (_row_value(row, "bld_id", 0) for row in rows) if value is not None]


def set_item_blds(cursor, item_id: int, bld_ids: List[int]) -> None:
    cursor.execute("DELETE FROM item_bld_map WHERE item_id = %s", (item_id,))
    if not bld_ids:
        return
    values = [(item_id, bld_id) for bld_id in bld_ids]
    cursor.executemany(
        "INSERT INTO item_bld_map (item_id, bld_id) VALUES (%s, %s)",
        values,
    )


def attach_bld_ids(cursor, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not items:
        return items

    item_ids = sorted(
        {
            int(item_id)
            for item_id in (item.get("item_id") for item in items)
            if item_id is not None
        }
    )
    if not item_ids:
        for item in items:
            item["bld_ids"] = []
        return items

    placeholders = ", ".join(["%s"] * len(item_ids))
    cursor.execute(
        f"""
        SELECT item_id, bld_id
          FROM item_bld_map
         WHERE item_id IN ({placeholders})
         ORDER BY item_id, bld_id
        """,
        tuple(item_ids),
    )
    rows = cursor.fetchall() or []
    mapping: Dict[int, List[int]] = {}
    for row in rows:
        item_id = _row_value(row, "item_id", 0)
        bld_id = _row_value(row, "bld_id", 1)
        if item_id is None or bld_id is None:
            continue
        mapping.setdefault(item_id, []).append(bld_id)

    for item in items:
        raw_key = item.get("item_id")
        try:
            normalized_key = int(raw_key)
        except (TypeError, ValueError):
            normalized_key = None
        item["bld_ids"] = mapping.get(normalized_key, []) if normalized_key is not None else []
    return items


def filter_items_by_bld(items: List[Dict[str, Any]], bld_id: int) -> List[Dict[str, Any]]:
    target = int(bld_id)
    filtered: List[Dict[str, Any]] = []
    for item in items:
        ids = item.get("bld_ids") or []
        try:
            normalized_ids = {int(i) for i in ids}
        except (TypeError, ValueError):
            normalized_ids = set()
        if target in normalized_ids:
            filtered.append(item)
    return filtered

from .config import (
    SECRET_KEY, ALGORITHM,
    ACCESS_TOKEN_TTL_SEC, REFRESH_TOKEN_TTL_SEC,
    COOKIE_SECURE, COOKIE_SAMESITE, COOKIE_DOMAIN
)

def _create_jwt(payload: dict, ttl: int) -> str:
    now = int(time.time())
    body = dict(payload)
    body["iat"] = now
    body["exp"] = now + ttl
    return jwt.encode(body, SECRET_KEY, algorithm=ALGORITHM)

def create_access_token(sub: dict) -> str:
    return _create_jwt({"sub": sub, "type": "access"}, ACCESS_TOKEN_TTL_SEC)

def create_refresh_token(sub: dict, jti: str) -> str:
    return _create_jwt({"sub": sub, "type": "refresh", "jti": jti}, REFRESH_TOKEN_TTL_SEC)

def decode_token(token: str) -> dict:
    # Disable "sub must be string" validation
    return jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM],
        options={"verify_sub": False},
    )


def hash_password(plain: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain.encode(), salt).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def _user_has_role(user: Dict[str, Any], role_code: str) -> bool:
    role_codes = user.get("role_codes")
    if isinstance(role_codes, list):
        if role_code in role_codes:
            return True
    elif isinstance(role_codes, str):
        if role_codes == role_code:
            return True
    legacy_role = user.get("role")
    return legacy_role == role_code

CITY_NAME_TO_CODE = {
    "mysore": "MYS",
    "mysuru": "MYS",
    "blr": "BLR",
    "bangalore": "BLR",
    "bengaluru": "BLR",
}

CITY_CODE_TO_LABEL = {
    "MYS": "Mysore",
    "BLR": "Bangalore",
}

MENU_TYPE_ONE_DAY = "ONE_DAY"
MENU_TYPE_CONDIMENTS = "CONDIMENTS"

VALID_MENU_TYPES = {MENU_TYPE_ONE_DAY, MENU_TYPE_CONDIMENTS}
CONDIMENTS_BLD_TYPE = "Condiments"

ORDER_STATUS_PENDING = "Confirmed - Payment Due"
ORDER_STATUS_CONFIRMED = "Confirmed"
ORDER_STATUS_PREPARING = "Preparing"
ORDER_STATUS_ON_THE_WAY = "On the Way"
ORDER_STATUS_DELIVERED = "Delivered"
ORDER_STATUS_CANCELLED = "Cancelled"

_ORDER_STATUS_ALIASES = {
    "pending": ORDER_STATUS_PENDING,
    "payment due": ORDER_STATUS_PENDING,
    "awaiting payment": ORDER_STATUS_PENDING,
    "confirmed - payment due": ORDER_STATUS_PENDING,
    "confirmed but needs to pay": ORDER_STATUS_PENDING,
    "confirmed": ORDER_STATUS_CONFIRMED,
    "preparing": ORDER_STATUS_PREPARING,
    "in progress": ORDER_STATUS_PREPARING,
    "processing": ORDER_STATUS_PREPARING,
    "on the way": ORDER_STATUS_ON_THE_WAY,
    "out for delivery": ORDER_STATUS_ON_THE_WAY,
    "en route": ORDER_STATUS_ON_THE_WAY,
    "delivered": ORDER_STATUS_DELIVERED,
    "completed": ORDER_STATUS_DELIVERED,
    "complete": ORDER_STATUS_DELIVERED,
    "cancelled": ORDER_STATUS_CANCELLED,
    "canceled": ORDER_STATUS_CANCELLED,
}

ORDER_STATUS_ALLOWED = set(_ORDER_STATUS_ALIASES.values())
PENDING_ORDER_STATUS_NAMES = {
    ORDER_STATUS_PENDING.lower(),
    ORDER_STATUS_CONFIRMED.lower(),
    ORDER_STATUS_PREPARING.lower(),
    ORDER_STATUS_ON_THE_WAY.lower(),
    "pending",
    "in progress",
    "processing",
}


def get_food_meals_for_city(city_code: CityCode) -> List[str]:
    if not city_supports_food(city_code):
        return []
    return ["Breakfast", "Lunch", "Dinner"]


def get_supported_meals_for_city(city_code: CityCode) -> List[str]:
    meals = get_food_meals_for_city(city_code)
    if city_supports_condiments(city_code):
        meals.append("Condiments")
    return meals

_MENU_HAS_TYPE_COLUMN: Optional[bool] = None


def _ensure_menu_type_column(db) -> None:
    global _MENU_HAS_TYPE_COLUMN
    if _MENU_HAS_TYPE_COLUMN:
        return
    cursor = db.cursor()
    try:
        cursor.execute("SHOW COLUMNS FROM menu LIKE 'menu_type'")
        has_column = cursor.fetchone() is not None
        if not has_column:
            cursor.execute(
                "ALTER TABLE menu ADD COLUMN menu_type VARCHAR(20) NOT NULL DEFAULT 'ONE_DAY'"
            )
            db.commit()
        _MENU_HAS_TYPE_COLUMN = True
    finally:
        cursor.close()


def normalize_order_status(value: str) -> str:
    key = value.strip().lower()
    base = key.replace(" (payment due)", "")
    if not base:
        raise HTTPException(status_code=400, detail="Status is required")
    normalized = _ORDER_STATUS_ALIASES.get(base) or _ORDER_STATUS_ALIASES.get(key)
    if not normalized:
        raise HTTPException(status_code=400, detail=f"Unsupported status '{value}'")
    return normalized


def format_status_with_payment(status: Optional[str], paid: Optional[bool]) -> str:
    base = normalize_status_for_response(status)
    if paid:
        return base
    if "payment due" in base.lower():
        return base
    return f"{base} (Payment Due)"


def _bulk_update_order_status_for_date(
    cursor,
    target_date: str,
    city_code: CityCode,
    new_status: str,
    allowed_previous_statuses: Iterable[str],
) -> int:
    normalized_previous = sorted(
        {status.lower() for status in allowed_previous_statuses if status}
    )
    if not normalized_previous:
        return 0
    placeholders = ", ".join(["%s"] * len(normalized_previous))
    params = [new_status, new_status, target_date, city_code, *normalized_previous]
    status_compare_expr = "LOWER(REPLACE(COALESCE(o.status, ''), ' (Payment Due)', ''))"
    cursor.execute(
        f"""
        UPDATE orders o
        JOIN addresses a ON o.address_id = a.address_id
           SET o.status = CASE WHEN o.paid = 1 THEN %s ELSE CONCAT(%s, ' (Payment Due)') END
         WHERE DATE(o.created_at) = %s
           AND a.city_code = %s
           AND {status_compare_expr} IN ({placeholders})
        """,
        tuple(params),
    )
    return cursor.rowcount


def normalize_status_for_response(value: Optional[str]) -> str:
    try:
        return normalize_order_status(value or "")
    except HTTPException:
        return value or ORDER_STATUS_PENDING


def _resolve_city_code(label: Optional[str], code: Optional[str]) -> CityCode:
    if code:
        return normalize_city_code(code)
    if label:
        mapped = CITY_NAME_TO_CODE.get(label.strip().lower())
        if mapped:
            return normalize_city_code(mapped)
    return DEFAULT_CITY


def _normalize_city_label(label: Optional[str], city_code: CityCode) -> str:
    if label:
        stripped = label.strip()
        if stripped:
            return stripped
    return CITY_CODE_TO_LABEL.get(city_code, city_code)


def _customer_has_city(cursor, customer_id: int, city_code: CityCode) -> bool:
    cursor.execute(
        "SELECT 1 FROM addresses WHERE customer_id=%s AND city_code=%s LIMIT 1",
        (customer_id, city_code),
    )
    return cursor.fetchone() is not None


def _resolve_city_context(city_override: Optional[str], user: Optional[Dict[str, Any]]) -> CityCode:
    if city_override:
        return normalize_city_code(city_override)
    if user:
        code = user.get("city_code")
        if isinstance(code, str) and code.strip():
            return normalize_city_code(code)
    return DEFAULT_CITY


def normalize_menu_type(value: Optional[str]) -> str:
    if not value:
        return MENU_TYPE_ONE_DAY
    upper = value.strip().upper()
    if upper in VALID_MENU_TYPES:
        return upper
    raise HTTPException(status_code=400, detail="Invalid menu_type")


def ensure_menu_allowed(city_code: CityCode, menu_type: str):
    if menu_type == MENU_TYPE_ONE_DAY and not city_supports_food(city_code):
        raise HTTPException(status_code=400, detail="This city does not support food menus yet.")
    if menu_type == MENU_TYPE_CONDIMENTS and not city_supports_condiments(city_code):
        raise HTTPException(status_code=400, detail="This city does not support condiments menus yet.")


def get_admin_role_id(db) -> Optional[int]:
    cursor = db.cursor()
    try:
        return get_role_id(cursor, ADMIN_ROLE_CODE)
    finally:
        cursor.close()


def build_role_context(db, role_ids: Optional[List[int]] = None):
    cursor = db.cursor()
    try:
        ensure_default_roles(cursor)
        role_map = fetch_role_map(cursor, role_ids)
    finally:
        cursor.close()
    effective_roles = role_ids[:] if role_ids else list(role_map.keys())
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
    role_details = make_role_summary(effective_roles, role_map)
    return role_map, role_codes, role_details


def slugify_role_code(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower())
    return slug.strip("-")


def validate_role_ids(db, role_ids: List[int]) -> Dict[int, Dict[str, Any]]:
    normalised = sorted({int(rid) for rid in role_ids})
    if not normalised:
        return {}
    cursor = db.cursor()
    try:
        ensure_default_roles(cursor)
        role_map = fetch_role_map(cursor, normalised)
    finally:
        cursor.close()
    missing = [rid for rid in normalised if rid not in role_map]
    if missing:
        raise HTTPException(status_code=400, detail=f"Unknown role ids: {missing}")
    return role_map


def hydrate_team_members(db, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    parsed_roles: List[List[int]] = []
    role_ids: set[int] = set()
    for row in rows:
        roles = parse_role_ids(row.get("roles"))
        parsed_roles.append(roles)
        role_ids.update(roles)
    if not role_ids:
        return []
    role_map, _, _ = build_role_context(db, sorted(role_ids))
    members: List[Dict[str, Any]] = []
    for row, roles in zip(rows, parsed_roles):
        if not roles:
            continue
        role_details = make_role_summary(roles, role_map)
        role_codes = [
            detail.get("code") for detail in role_details if detail.get("code")
        ]
        members.append(
            {
                "customer_id": row["customer_id"],
                "name": row.get("name"),
                "phone": row.get("primary_mobile"),
                "email": row.get("email"),
                "roles": roles,
                "role_codes": role_codes,
                "role_details": role_details,
                "admin_is_active": bool(row.get("admin_is_active", True)),
                "has_admin_password": bool(row.get("admin_password_hash")),
                "created_at": row.get("created_at"),
            }
        )
    return members


def apply_team_member_update(
    db,
    customer_id: int,
    role_ids: Optional[List[int]],
    admin_password: Optional[str],
    admin_is_active: Optional[bool],
    *,
    require_role_ids: bool = False,
):
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT customer_id, roles, admin_is_active
            FROM customers
            WHERE customer_id=%s
            LIMIT 1
            """,
            (customer_id,),
        )
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Customer not found")

        updates: List[str] = []
        params: List[Any] = []

        if role_ids is not None:
            normalised_roles = sorted({int(rid) for rid in role_ids})
            if require_role_ids and not normalised_roles:
                raise HTTPException(status_code=400, detail="At least one role is required")
            validate_role_ids(db, normalised_roles)
            if normalised_roles:
                updates.append("roles=%s")
                params.append(roles_to_json(normalised_roles))
            else:
                updates.append("roles=NULL")
        elif require_role_ids:
            raise HTTPException(status_code=400, detail="Role ids are required")

        if admin_is_active is not None:
            updates.append("admin_is_active=%s")
            params.append(int(bool(admin_is_active)))

        if admin_password is not None:
            password = admin_password.strip()
            if password:
                if len(password) < 6:
                    raise HTTPException(
                        status_code=400,
                        detail="Admin password must be at least 6 characters",
                    )
                updates.append("admin_password_hash=%s")
                params.append(hash_password(password))
            else:
                updates.append("admin_password_hash=NULL")

        if updates:
            cursor.execute(
                f"UPDATE customers SET {', '.join(updates)} WHERE customer_id=%s",
                (*params, customer_id),
            )
            db.commit()

        cursor.execute(
            """
            SELECT customer_id, name, primary_mobile, email, roles, admin_is_active, admin_password_hash, created_at
            FROM customers
            WHERE customer_id=%s
            """,
            (customer_id,),
        )
        updated_row = cursor.fetchone()
    finally:
        cursor.close()

    if not updated_row:
        raise HTTPException(status_code=404, detail="Customer not found")

    members = hydrate_team_members(db, [updated_row])
    return members[0] if members else None


def role_usage_counts(db) -> Dict[int, int]:
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT roles FROM customers WHERE roles IS NOT NULL")
        counts: Dict[int, int] = {}
        for row in cursor.fetchall():
            for rid in parse_role_ids(row.get("roles")):
                counts[rid] = counts.get(rid, 0) + 1
        return counts
    finally:
        cursor.close()

def set_cookie(resp: Response, name: str, value: str, max_age: int):
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

def clear_cookie(resp: Response, name: str):
    resp.delete_cookie(key=name, domain=COOKIE_DOMAIN, path="/")

bearer = HTTPBearer(auto_error=False)

def _read_access_token(req: Request, creds: HTTPAuthorizationCredentials | None):
    if creds and creds.scheme.lower() == "bearer":
        return creds.credentials
    return req.cookies.get("access_token")

def get_current_user(request: Request, creds: HTTPAuthorizationCredentials | None = Depends(bearer)):
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

def get_optional_user(request: Request, creds: HTTPAuthorizationCredentials | None = Depends(bearer)):
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

def admin_required(user = Depends(get_current_user)):
    if not user or not _user_has_role(user, ADMIN_ROLE_CODE):
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def developer_required(user = Depends(get_current_user)):
    if not user or not _user_has_role(user, DEVELOPER_ROLE_CODE):
        raise HTTPException(status_code=403, detail="Developer only")
    return user

SCHEMA_NAME_PATTERN = re.compile(r"^[A-Za-z0-9_]+$")

# Get city by phone number
@app.get("/api/get-city")
def get_city(phone: str):
    db = get_db()
    cursor = db.cursor(dictionary=True, buffered=True)

    try:
        query = """
        SELECT 
            c.customer_id,
            a.city,
            a.city_code,
            c.roles
        FROM customers c
        INNER JOIN addresses a ON c.customer_id = a.customer_id
        WHERE c.primary_mobile = %s
          AND a.is_default = 1
        LIMIT 1;
        """
        cursor.execute(query, (phone,))
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="User does not exist. Please register.")

        roles = parse_role_ids(result.get("roles"))
        _, role_codes, role_details = build_role_context(db, roles)
        is_admin = ADMIN_ROLE_CODE in role_codes
        cursor.execute(
            "SELECT DISTINCT city_code FROM addresses WHERE customer_id=%s",
            (result["customer_id"],),
        )
        eligible_rows = cursor.fetchall() or []
        return {
            "city": result["city"],
            "city_code": result.get("city_code") or DEFAULT_CITY,
            "eligible_city_codes": [row.get("city_code") or DEFAULT_CITY for row in eligible_rows],
            "is_admin": bool(is_admin),
            "roles": roles,
            "role_codes": role_codes,
            "role_details": role_details,
        }

    finally:
        cursor.close()
        db.close()


# Get all available cities
@app.get("/api/get-cities")
def get_available_cities():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT DISTINCT city FROM addresses")
    result = cursor.fetchall()
    db.close()
    return {"cities": [row["city"] for row in result]}

# Pydantic model for user registration
class CustomerCreate(BaseModel):
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
    latitude: float
    longitude: float
    address_type: Optional[str] = None
    route_assignment: Optional[str] = None
    is_default: bool = False

# Register a user (customer + address)
@app.post("/api/register")
def register_user(user: CustomerCreate):
    db = get_db()
    cursor = db.cursor()

    try:
        normalized_city_code = _resolve_city_code(user.city, user.city_code)
        city_label = _normalize_city_label(user.city, normalized_city_code)
        # Insert into customers
        cursor.execute("""
            INSERT INTO customers (referred_by, primary_mobile, alternative_mobile, name, recipient_name, payment_frequency, email)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (user.referred_by, user.primary_mobile, user.alternative_mobile, user.name, user.recipient_name, user.payment_frequency, user.email))

        customer_id = cursor.lastrowid

        # Insert into addresses
        cursor.execute("""
            INSERT INTO addresses (customer_id, house_apartment_no, written_address, city, city_code, pin_code, latitude, longitude, address_type, route_assignment, is_default)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            customer_id,
            user.house_apartment_no,
            user.written_address,
            city_label,
            normalized_city_code,
            user.pin_code,
            user.latitude,
            user.longitude,
            user.address_type,
            user.route_assignment,
            user.is_default,
        ))

        db.commit()
        return {"success": True}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(err))
    finally:
        db.close()
class CustomerCreate(BaseModel):
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
    route_assignment: Optional[str] = None
    is_default: bool = False

# Register a new customer and store their address
@app.post("/api/register")
def register_customer(data: CustomerCreate):
    db = get_db()
    cursor = db.cursor()

    try:
        normalized_city_code = _resolve_city_code(data.city, data.city_code)
        city_label = _normalize_city_label(data.city, normalized_city_code)
        # Check if the mobile number already exists
        cursor.execute("SELECT id FROM customers WHERE primary_mobile = %s", (data.primary_mobile,))
        existing_customer = cursor.fetchone()
        
        if existing_customer:
            raise HTTPException(status_code=400, detail="Mobile number already exists! Please login instead.")

        # Insert customer details
        cursor.execute("""
            INSERT INTO customers (referred_by, primary_mobile, alternative_mobile, name, recipient_name, payment_frequency, email)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (data.referred_by, data.primary_mobile, data.alternative_mobile, data.name, data.recipient_name, data.payment_frequency, data.email))
        
        customer_id = cursor.lastrowid  # Get inserted customer ID

        # Insert address details with address_type from dropdown and is_default set to True
        cursor.execute("""
            INSERT INTO addresses (customer_id, house_apartment_no, written_address, city, city_code, pin_code, latitude, longitude, address_type, route_assignment, is_default)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            customer_id,
            data.house_apartment_no,
            data.written_address,
            city_label,
            normalized_city_code,
            data.pin_code,
            data.latitude,
            data.longitude,
            data.address_type,
            data.route_assignment,
            True,
        ))

        db.commit()
        return {"success": True, "customer_id": customer_id}
    
    except mysql.connector.IntegrityError as err:
        db.rollback()
        if err.errno == 1062:
            raise HTTPException(status_code=400, detail="Duplicate entry: Mobile number already registered")
        raise HTTPException(status_code=400, detail=str(err))
    
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    
    finally:
        db.close()


#Login
class LoginRequest(BaseModel):
    phone: str
    admin_password: Optional[str]
    city_code: Optional[str] = None


class RoleCreateRequest(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None


class RoleUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class TeamMemberCreateRequest(BaseModel):
    customer_id: int
    role_ids: List[int] = Field(default_factory=list)
    admin_password: Optional[str] = None
    admin_is_active: Optional[bool] = True


class TeamMemberUpdateRequest(BaseModel):
    role_ids: Optional[List[int]] = None
    admin_password: Optional[str] = None
    admin_is_active: Optional[bool] = None

# --- LOGIN: return tokens in JSON for localStorage ---
@app.post("/api/login")
def login(data: LoginRequest, response: Response):
    db = get_db()
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
        role_map, role_codes, role_details = build_role_context(db, roles)
        has_admin_role = ADMIN_ROLE_CODE in role_codes
        is_admin_account = has_admin_role and bool(result.get("admin_password_hash"))
        admin_password_provided = bool(data.admin_password)

        admin_login = False
        admin_is_active = bool(result.get("admin_is_active", True))
        if admin_password_provided:
            if not has_admin_role:
                raise HTTPException(status_code=403, detail="Admin access not enabled for this user.")
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
        if not admin_password_provided and not _customer_has_city(cursor, result["customer_id"], requested_city_code):
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
        refresh = create_refresh_token(base_payload, str(uuid.uuid4()))

        user_payload = dict(base_payload)
        user_payload["role_details"] = role_details

        return {
            "message": "Login successful",
            "is_admin": admin_login,
            "is_admin_account": is_admin_account,
            "user": user_payload,
            "access_token": access,
            "refresh_token": refresh,
            "role_codes": role_codes,
            "role_details": role_details,
        }
    finally:
        cursor.close()
        db.close()


# ─────────────────────────────────────────────────────────────────────────────
# RBAC MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────


@app.get("/api/rbac/roles")
def list_roles(user = Depends(admin_required)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        ensure_default_roles(cursor)
        cursor.execute(
            """
            SELECT role_id, code, name, description, is_system, created_at
            FROM roles
            ORDER BY name ASC
            """
        )
        roles = cursor.fetchall()
        usage = role_usage_counts(db)
        for role in roles:
            rid = int(role["role_id"])
            role["is_system"] = bool(role["is_system"])
            role["assigned_count"] = usage.get(rid, 0)
        return {"roles": roles}
    finally:
        cursor.close()
        db.close()


@app.post("/api/rbac/roles")
def create_role(payload: RoleCreateRequest, user = Depends(admin_required)):
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Role name is required")
    code_source = payload.code or name
    code = slugify_role_code(code_source)
    if not code:
        raise HTTPException(status_code=400, detail="Invalid role code")

    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        ensure_default_roles(cursor)
        cursor.execute("SELECT role_id FROM roles WHERE code=%s LIMIT 1", (code,))
        if cursor.fetchone():
            raise HTTPException(status_code=409, detail="Role code already exists")
        cursor.execute(
            """
            INSERT INTO roles (code, name, description, is_system)
            VALUES (%s, %s, %s, 0)
            """,
            (code, name, payload.description),
        )
        db.commit()
        role_id = cursor.lastrowid
        cursor.execute(
            """
            SELECT role_id, code, name, description, is_system, created_at
            FROM roles
            WHERE role_id=%s
            """,
            (role_id,),
        )
        role = cursor.fetchone()
        role["is_system"] = bool(role["is_system"])
        role["assigned_count"] = 0
        return {"role": role}
    finally:
        cursor.close()
        db.close()


@app.put("/api/rbac/roles/{role_id}")
def update_role(role_id: int, payload: RoleUpdateRequest, user = Depends(admin_required)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT role_id, code, name, description, is_system FROM roles WHERE role_id=%s",
            (role_id,),
        )
        role = cursor.fetchone()
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")

        updates: List[str] = []
        params: List[Any] = []

        if payload.name is not None:
            new_name = payload.name.strip()
            if not new_name:
                raise HTTPException(status_code=400, detail="Role name is required")
            if role["is_system"] and new_name != role["name"]:
                raise HTTPException(status_code=400, detail="System roles cannot be renamed")
            updates.append("name=%s")
            params.append(new_name)

        if payload.description is not None:
            updates.append("description=%s")
            params.append(payload.description)

        if updates:
            cursor.execute(
                f"UPDATE roles SET {', '.join(updates)} WHERE role_id=%s",
                (*params, role_id),
            )
            db.commit()

        cursor.execute(
            """
            SELECT role_id, code, name, description, is_system, created_at
            FROM roles
            WHERE role_id=%s
            """,
            (role_id,),
        )
        updated = cursor.fetchone()
        updated["is_system"] = bool(updated["is_system"])
        usage = role_usage_counts(db)
        updated["assigned_count"] = usage.get(role_id, 0)
        return {"role": updated}
    finally:
        cursor.close()
        db.close()


@app.delete("/api/rbac/roles/{role_id}")
def delete_role(role_id: int, user = Depends(admin_required)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT role_id, code, is_system FROM roles WHERE role_id=%s", (role_id,))
        role = cursor.fetchone()
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        if role["is_system"] or role["code"] in {ADMIN_ROLE_CODE, DEVELOPER_ROLE_CODE}:
            raise HTTPException(status_code=400, detail="Protected roles cannot be deleted")

        usage = role_usage_counts(db)
        if usage.get(role_id, 0) > 0:
            raise HTTPException(status_code=400, detail="Role is assigned to team members")

        cursor.execute("DELETE FROM roles WHERE role_id=%s", (role_id,))
        db.commit()
        return {"deleted": True}
    finally:
        cursor.close()
        db.close()


@app.get("/api/rbac/team-members")
def list_team_members(user = Depends(admin_required)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT customer_id, name, primary_mobile, email, roles, admin_is_active, admin_password_hash, created_at
            FROM customers
            WHERE roles IS NOT NULL
            ORDER BY name ASC
            """
        )
        rows = cursor.fetchall()
        members = hydrate_team_members(db, rows)
        return {"team_members": members}
    finally:
        cursor.close()
        db.close()


@app.post("/api/rbac/team-members")
def create_team_member(payload: TeamMemberCreateRequest, user = Depends(admin_required)):
    if payload.customer_id <= 0:
        raise HTTPException(status_code=400, detail="Valid customer_id is required")
    db = get_db()
    try:
        member = apply_team_member_update(
            db,
            payload.customer_id,
            payload.role_ids,
            payload.admin_password,
            payload.admin_is_active,
            require_role_ids=True,
        )
        return {"team_member": member}
    finally:
        db.close()


@app.put("/api/rbac/team-members/{customer_id}")
def update_team_member(
    customer_id: int,
    payload: TeamMemberUpdateRequest,
    user = Depends(admin_required),
):
    db = get_db()
    try:
        member = apply_team_member_update(
            db,
            customer_id,
            payload.role_ids,
            payload.admin_password,
            payload.admin_is_active,
        )
        return {"team_member": member}
    finally:
        db.close()


@app.post("/auth/refresh")
def refresh(request: Request, response: Response, creds: HTTPAuthorizationCredentials | None = Depends(bearer)):
    # Try Authorization: Bearer <refresh_token> first
    token = None
    if creds and creds.scheme.lower() == "bearer":
        token = creds.credentials

    # Fallback: JSON body with {"refresh_token": "..."}
    if not token:
        try:
            body = request.json() if hasattr(request, "json") else None
        except Exception:
            body = None
        if body and isinstance(body, dict):
            token = body.get("refresh_token")

    # Fallback: legacy cookie (if you still keep it set somewhere)
    if not token:
        token = request.cookies.get("refresh_token")

    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")

    try:
        payload = decode_token(token)  # your helper already configured
        if payload.get("type") != "refresh":
            raise ValueError("wrong token type")
        sub = payload["sub"] if "sub" in payload else payload.get("usr")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    new_access = create_access_token(sub)

    return {"access_token": new_access}

@app.post("/auth/logout")
def logout(response: Response):
    clear_cookie(response, "access_token")
    clear_cookie(response, "refresh_token")
    return {"ok": True}

@app.get("/auth/me")
def me(user = Depends(get_current_user)):
    return user



@app.post("/create-customer", response_model=dict)
def add_customer(customer: CustomerCreate, db=Depends(get_db)):
    return create_customer(db, customer)

@app.get("/get-customer/{customer_id}", response_model=dict)
def fetch_customer(customer_id: int, db=Depends(get_db)):
    return get_customer_by_id(db, customer_id)

@app.get("/get-all-customers", response_model=list)
def fetch_all_customers(
    city_code: Optional[str] = Query(None, description="Optional city filter"),
    db=Depends(get_db),
):
    return get_all_customers(db, city_code)


@app.get("/api/admin/customers", tags=["Admin"])
def fetch_admin_customers(
    city_code: Optional[str] = Query(None, description="Override city scope"),
    user: Dict[str, Any] = Depends(admin_required),
    db=Depends(get_db),
):
    resolved_city = _resolve_city_context(city_code, user)
    return get_all_customers(db, resolved_city)

@app.put("/update-customer/{customer_id}", response_model=dict)
def modify_customer(customer_id: int, customer: CustomerUpdate, db=Depends(get_db)):
    return update_customer(db, customer_id, customer)

@app.delete("/delete-customer/{customer_id}", response_model=dict)
def remove_customer(customer_id: int, db=Depends(get_db)):
    return delete_customer(db, customer_id)

# ---------------- Developer Tools ----------------
@app.get("/api/dev/db-schema", tags=["Developer"])
def get_dev_db_schema(
    include_views: bool = Query(True, alias="includeViews"),
    schema: Optional[str] = Query(None),
    user = Depends(developer_required),
):
    """
    Return read-only schema DDL metadata for developer tooling.
    """
    db = get_db()
    metadata_cursor = db.cursor()
    ddl_cursor = None
    try:
        try:
            db.start_transaction(readonly=True)
        except Exception:
            pass

        schema_name = (schema.strip() if schema else "kk_v1") or "kk_v1"
        if not SCHEMA_NAME_PATTERN.fullmatch(schema_name):
            raise HTTPException(status_code=400, detail="Invalid schema name")
        metadata_cursor.execute(f"USE `{schema_name}`")
        active_schema = schema_name

        try:
            metadata_cursor.execute("SET SESSION MAX_EXECUTION_TIME=5000")
        except mysql.connector.Error:
            pass

        targets: List[Tuple[str, str]] = []

        metadata_cursor.execute("SHOW FULL TABLES WHERE Table_type='BASE TABLE'")
        base_rows = metadata_cursor.fetchall()
        for row in base_rows:
            if not row:
                continue
            table_name = row[0]
            if table_name:
                targets.append((table_name, "TABLE"))

        if include_views:
            metadata_cursor.execute("SHOW FULL TABLES WHERE Table_type='VIEW'")
            view_rows = metadata_cursor.fetchall()
            for row in view_rows:
                if not row:
                    continue
                view_name = row[0]
                if view_name:
                    targets.append((view_name, "VIEW"))

        seen = set()
        ordered_targets: List[Tuple[str, str]] = []
        for name, kind in targets:
            if name in seen:
                continue
            seen.add(name)
            ordered_targets.append((name, kind))

        ordered_targets.sort(key=lambda item: item[0].lower())

        ddl_cursor = db.cursor()
        tables_payload: List[Dict[str, object]] = []
        for name, kind in ordered_targets:
            try:
                if kind == "VIEW":
                    ddl_cursor.execute(f"SHOW CREATE VIEW `{name}`")
                else:
                    ddl_cursor.execute(f"SHOW CREATE TABLE `{name}`")
                ddl_row = ddl_cursor.fetchone()
                if not ddl_row or len(ddl_row) < 2:
                    continue
                ddl_text = ddl_row[1]
                columns_list: List[Dict[str, object]] = []
                try:
                    ddl_cursor.execute(f"SHOW FULL COLUMNS FROM `{name}`")
                    column_rows = ddl_cursor.fetchall()
                    column_fields = [desc[0] for desc in ddl_cursor.description]
                    # Expected order: Field, Type, Collation, Null, Key, Default, Extra, Privileges, Comment
                    for col in column_rows:
                        record = dict(zip(column_fields, col))
                        columns_list.append(
                            {
                                "name": record.get("Field"),
                                "type": record.get("Type"),
                                "nullable": record.get("Null"),
                                "key": record.get("Key"),
                                "default": record.get("Default"),
                                "extra": record.get("Extra"),
                                "comment": record.get("Comment"),
                            }
                        )
                except mysql.connector.Error:
                    columns_list = []
                tables_payload.append(
                    {
                        "name": name,
                        "kind": kind,
                        "ddl": ddl_text,
                        "columns": columns_list,
                    }
                )
            except mysql.connector.Error:
                continue

        timestamp = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

        return {
            "schema": active_schema,
            "generated_at": timestamp,
            "tables": tables_payload,
        }
    except HTTPException:
        raise
    except mysql.connector.Error:
        raise HTTPException(status_code=500, detail="Failed to fetch schema metadata")
    finally:
        if ddl_cursor is not None:
            ddl_cursor.close()
        metadata_cursor.close()
        try:
            db.rollback()
        except Exception:
            pass
        db.close()

# ---------------- Product Management ----------------

class ItemUpdatePayload(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    alias: Optional[str] = None
    category_id: Optional[int] = None
    uom: Optional[str] = None
    weight_factor: Optional[float] = None
    weight_uom: Optional[str] = None
    item_type: Optional[str] = None
    hsn_code: Optional[str] = None
    factor: Optional[float] = None
    quantity_portion: Optional[int] = None
    buffer_percentage: Optional[float] = None
    max_qty_breakfast: Optional[int] = None
    max_qty_lunch: Optional[int] = None
    max_qty_dinner: Optional[int] = None
    picture_url: Optional[str] = None
    breakfast_price: Optional[float] = None
    lunch_price: Optional[float] = None
    dinner_price: Optional[float] = None
    condiments_price: Optional[float] = None
    festival_price: Optional[float] = None
    cgst: Optional[float] = None
    sgst: Optional[float] = None
    igst: Optional[float] = None
    net_price: Optional[float] = None
    is_combo: Optional[bool] = None
    bld_ids: Optional[List[int]] = None
    is_condiment: Optional[bool] = None
@app.get("/api/products/items", tags=["Products"])
def get_all_items(
    only_condiments: Optional[bool] = Query(
        None, description="When true, returns only condiment items", alias="only_condiments"
    ),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SHOW COLUMNS FROM items")
        available_columns = {row["Field"] for row in cursor.fetchall()}

        has_meal_specific_max = {
            "max_qty_breakfast",
            "max_qty_lunch",
            "max_qty_dinner",
        }.issubset(available_columns)
        has_legacy_max = "max_qty" in available_columns
        has_condiment_flag = "is_condiment" in available_columns

        max_columns_sql: List[str] = []
        if has_meal_specific_max:
            max_columns_sql.extend(
                [
                    "i.max_qty_breakfast",
                    "i.max_qty_lunch",
                    "i.max_qty_dinner",
                ]
            )
        elif has_legacy_max:
            max_columns_sql.extend(
                [
                    "i.max_qty AS max_qty_breakfast",
                    "i.max_qty AS max_qty_lunch",
                    "i.max_qty AS max_qty_dinner",
                ]
            )
        else:
            max_columns_sql.extend(
                [
                    "NULL AS max_qty_breakfast",
                    "NULL AS max_qty_lunch",
                    "NULL AS max_qty_dinner",
                ]
            )

        is_condiment_sql = "i.is_condiment" if has_condiment_flag else "0 AS is_condiment"

        select_columns = [
            "i.item_id",
            "i.name",
            "i.description",
            "i.alias",
            "i.category_id",
            "c.category_name",
            "i.uom",
            "i.weight_factor",
            "i.weight_uom",
            "i.item_type",
            "i.hsn_code",
            "i.factor",
            "i.quantity_portion",
            "i.buffer_percentage",
            *max_columns_sql,
            "i.picture_url",
            "i.breakfast_price",
            "i.lunch_price",
            "i.dinner_price",
            "i.condiments_price",
            "i.festival_price",
            "i.cgst",
            "i.sgst",
            "i.igst",
            "i.net_price",
            is_condiment_sql,
        ]

        select_sql = ",\n                    ".join(select_columns)
        cursor.execute(
            f"""
                SELECT 
                    {select_sql}
                FROM items i
                LEFT JOIN categories c ON i.category_id = c.category_id
            """
        )
        records = cursor.fetchall()

        attach_bld_ids(cursor, records)
        normalized_records = []
        for row in records:
            row["is_condiment"] = bool(row.get("is_condiment"))
            if only_condiments and not row["is_condiment"]:
                continue
            normalized_records.append(row)
        return normalized_records
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.put("/api/products/items/{item_id}", tags=["Products"])
def update_item(item_id: int, payload: ItemUpdatePayload, user: Dict[str, Any] = Depends(admin_required)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SHOW COLUMNS FROM items")
        available_columns = {row["Field"] for row in cursor.fetchall()}

        data = payload.model_dump(exclude_unset=True)
        raw_bld_ids = data.pop("bld_ids", [])
        normalized_bld_ids = _validate_bld_ids(cursor, raw_bld_ids)

        string_fields = {"name", "description", "alias", "uom", "weight_uom", "item_type", "hsn_code", "picture_url"}
        nullable_string_fields = {"description", "alias", "weight_uom", "item_type", "hsn_code", "picture_url"}
        int_fields = {"category_id", "quantity_portion", "max_qty_breakfast", "max_qty_lunch", "max_qty_dinner"}
        float_fields = {
            "weight_factor",
            "factor",
            "buffer_percentage",
            "breakfast_price",
            "lunch_price",
            "dinner_price",
            "condiments_price",
            "festival_price",
            "cgst",
            "sgst",
            "igst",
            "net_price",
        }
        bool_fields = {"is_combo", "is_condiment"}

        cleaned: Dict[str, Any] = {}
        for field, value in data.items():
            if field in string_fields and isinstance(value, str):
                value = value.strip()
                if not value and field in nullable_string_fields:
                    value = None
            if field in int_fields and value is not None:
                try:
                    value = int(value)
                except (TypeError, ValueError):
                    value = None
            if field in float_fields and value is not None:
                try:
                    value = float(value)
                except (TypeError, ValueError):
                    value = None
            if field in bool_fields and value is not None:
                value = 1 if value else 0
            cleaned[field] = value

        field_map = {
            "name": "name",
            "description": "description",
            "alias": "alias",
            "category_id": "category_id",
            "uom": "uom",
            "weight_factor": "weight_factor",
            "weight_uom": "weight_uom",
            "item_type": "item_type",
            "hsn_code": "hsn_code",
            "factor": "factor",
            "quantity_portion": "quantity_portion",
            "buffer_percentage": "buffer_percentage",
            "max_qty_breakfast": "max_qty_breakfast",
            "max_qty_lunch": "max_qty_lunch",
            "max_qty_dinner": "max_qty_dinner",
            "picture_url": "picture_url",
            "breakfast_price": "breakfast_price",
            "lunch_price": "lunch_price",
            "dinner_price": "dinner_price",
            "condiments_price": "condiments_price",
            "festival_price": "festival_price",
            "cgst": "cgst",
            "sgst": "sgst",
            "igst": "igst",
            "net_price": "net_price",
            "is_combo": "is_combo",
            "is_condiment": "is_condiment",
        }

        field_map = {field: column for field, column in field_map.items() if column in available_columns}

        set_clauses: List[str] = []
        values: List[Any] = []
        updated_fields: List[str] = []

        for field, column in field_map.items():
            if field not in cleaned:
                continue
            set_clauses.append(f"{column} = %s")
            values.append(cleaned[field])
            updated_fields.append(column)

        if set_clauses:
            values.append(item_id)
            update_query = f"UPDATE items SET {', '.join(set_clauses)} WHERE item_id = %s"
            cursor.execute(update_query, values)
            if cursor.rowcount == 0:
                cursor.execute("SELECT 1 FROM items WHERE item_id = %s", (item_id,))
                exists = cursor.fetchone()
                if not exists:
                    db.rollback()
                    raise HTTPException(status_code=404, detail="Item not found")
        else:
            cursor.execute("SELECT 1 FROM items WHERE item_id = %s", (item_id,))
            exists = cursor.fetchone()
            if not exists:
                db.rollback()
                raise HTTPException(status_code=404, detail="Item not found")

        set_item_blds(cursor, item_id, normalized_bld_ids)
        if "bld_ids" not in updated_fields:
            updated_fields.append("bld_ids")

        db.commit()

        updated_item = None
        try:
            cursor.execute(
                """
                SELECT 
                    i.item_id, i.name, i.description, i.alias, i.category_id, c.category_name,
                    i.uom, i.weight_factor, i.weight_uom, i.item_type, i.hsn_code, i.factor,
                    i.quantity_portion,
                    i.buffer_percentage,
                    i.max_qty_breakfast,
                    i.max_qty_lunch,
                    i.max_qty_dinner,
                    i.picture_url,
                    i.breakfast_price, i.lunch_price, i.dinner_price, i.condiments_price, i.festival_price,
                    i.cgst, i.sgst, i.igst, i.net_price,
                    i.is_combo,
                    i.is_condiment
                FROM items i
                LEFT JOIN categories c ON i.category_id = c.category_id
                WHERE i.item_id = %s
                """,
                (item_id,),
            )
            updated_item = cursor.fetchone()
        except mysql.connector.Error as err:
            if err.errno == errorcode.ER_BAD_FIELD_ERROR:
                cursor.execute(
                    """
                    SELECT 
                        i.item_id, i.name, i.description, i.alias, i.category_id, c.category_name,
                        i.uom, i.weight_factor, i.weight_uom, i.item_type, i.hsn_code, i.factor,
                        i.quantity_portion,
                        i.buffer_percentage,
                        i.max_qty_breakfast,
                        i.max_qty_lunch,
                        i.max_qty_dinner,
                        i.picture_url,
                        i.breakfast_price, i.lunch_price, i.dinner_price, i.condiments_price, i.festival_price,
                        i.cgst, i.sgst, i.igst, i.net_price,
                        0 AS is_combo,
                        0 AS is_condiment
                    FROM items i
                    LEFT JOIN categories c ON i.category_id = c.category_id
                    WHERE i.item_id = %s
                    """,
                    (item_id,),
                )
                updated_item = cursor.fetchone()
                if updated_item is not None:
                    updated_item["is_combo"] = False
            else:
                raise

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="UPDATE",
            entity_type="ITEM",
            entity_id=item_id,
            description=f"Updated item {item_id}: {', '.join(updated_fields)}",
        )

        if updated_item:
            updated_item["bld_ids"] = get_item_blds(cursor, item_id)
        else:
            return {"success": True, "item_id": item_id, "updated_fields": updated_fields}

        updated_item["is_combo"] = bool(updated_item.get("is_combo", False))
        updated_item["is_condiment"] = bool(updated_item.get("is_condiment", False))

        return {
            "success": True,
            "item": updated_item,
            "updated_fields": updated_fields,
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

@app.get("/api/products/combos", tags=["Products"])
def get_all_combos():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        # Step 1: Get all combos and their category
        cursor.execute("""
            SELECT 
                c.combo_id,
                c.combo_name,
                c.price,
                c.category_id,
                cat.category_name
            FROM combos c
            LEFT JOIN categories cat ON c.category_id = cat.category_id
        """)
        combos = cursor.fetchall()

        # Step 2: Get all items in each combo
        cursor.execute("""
            SELECT 
                ci.combo_id,
                ci.item_id,
                ci.quantity,
                i.name AS item_name
            FROM combo_items ci
            LEFT JOIN items i ON ci.item_id = i.item_id
        """)
        combo_items = cursor.fetchall()

        # Step 3: Map combo_id → list of items
        combo_item_map = {}
        for item in combo_items:
            combo_id = item["combo_id"]
            if combo_id not in combo_item_map:
                combo_item_map[combo_id] = []
            combo_item_map[combo_id].append({
                "itemId": item["item_id"],
                "name": item["item_name"],
                "quantity": item["quantity"]
            })

        # Step 4: Attach includedItems to each combo
        for combo in combos:
            combo_id = combo["combo_id"]
            combo["includedItems"] = combo_item_map.get(combo_id, [])

        return combos

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

@app.get("/api/products/addons", tags=["Products"])
def get_all_addons():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                ia.add_on_id,
                main_item.name AS main_item_name,
                add_on_item.name AS add_on_item_name,
                ia.is_mandatory,
                ia.max_quantity
            FROM item_add_ons ia
            LEFT JOIN items main_item ON ia.main_item_id = main_item.item_id
            LEFT JOIN items add_on_item ON ia.add_on_item_id = add_on_item.item_id
        """)
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

@app.get("/api/products/categories", tags=["Products"])
def get_all_categories():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT category_id, category_name FROM categories")
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

# 1. Fetch available items for a given meal (BLD)
@app.get("/api/menu/available-items", tags=["Daily Menu"])
def get_available_items(bld_type: str = Query(..., description="BLD type: Breakfast, Lunch, Dinner, Condiments")):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        bld_id = resolve_bld_id(cursor, bld_type)

        canonical_meal = normalize_meal_type(bld_type)
        require_condiments_only = canonical_meal == CONDIMENTS_BLD_TYPE
        query = """
            SELECT 
                i.item_id,
                i.name,
                i.description,
                i.alias,
                i.category_id,
                i.uom,
                i.weight_factor,
                i.weight_uom,
                i.item_type,
                i.hsn_code,
                i.factor,
                i.quantity_portion,
                i.buffer_percentage,
                i.max_qty_breakfast,
                i.max_qty_lunch,
                i.max_qty_dinner,
                i.picture_url,
                i.breakfast_price,
                i.lunch_price,
                i.dinner_price,
                i.condiments_price,
                i.festival_price,
                i.cgst,
                i.sgst,
                i.igst,
                i.net_price
            FROM items i
            WHERE EXISTS (
                SELECT 1 
                  FROM item_bld_map map
                 WHERE map.item_id = i.item_id
                   AND map.bld_id = %s
            )
        """
        if require_condiments_only:
            query += " AND i.is_condiment = 1"
        legacy_mode = False
        try:
            cursor.execute(query, (bld_id,))
            items = cursor.fetchall()
        except mysql.connector.Error as err:
            if err.errno == errorcode.ER_BAD_FIELD_ERROR:
                legacy_mode = True
                legacy_query = """
                    SELECT
                        i.item_id,
                        i.name,
                        i.description,
                        i.alias,
                        i.category_id,
                        i.uom,
                        i.weight_factor,
                        i.weight_uom,
                        i.item_type,
                        i.hsn_code,
                        i.factor,
                        i.quantity_portion,
                        i.buffer_percentage,
                        i.max_qty,
                        i.picture_url,
                        i.breakfast_price,
                        i.lunch_price,
                        i.dinner_price,
                        i.condiments_price,
                        i.festival_price,
                        i.cgst,
                        i.sgst,
                        i.igst,
                        i.net_price
                    FROM items i
                    WHERE EXISTS (
                        SELECT 1 
                          FROM item_bld_map map
                         WHERE map.item_id = i.item_id
                           AND map.bld_id = %s
                    )
                """
                if require_condiments_only:
                    legacy_query += " AND i.is_condiment = 1"
                cursor.execute(legacy_query, (bld_id,))
                items = cursor.fetchall()
            else:
                raise

        if legacy_mode:
            for item in items:
                legacy_value = item.pop("max_qty", None)
                item["max_qty_breakfast"] = legacy_value
                item["max_qty_lunch"] = legacy_value
                item["max_qty_dinner"] = legacy_value

        attach_bld_ids(cursor, items)
        return filter_items_by_bld(items, bld_id)

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()



# 2. Fetch existing menu by date and BLD
def _get_daily_menu_internal(
    date: Optional[str],
    bld_type: str,
    period_type: Optional[str],
    city_code: CityCode,
    menu_type: str,
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        _ensure_menu_type_column(db)
        resolved_menu_type = normalize_menu_type(menu_type)
        ensure_menu_allowed(city_code, resolved_menu_type)
        canonical_bld_type = normalize_meal_type(bld_type)
        bld_id = resolve_bld_id(cursor, canonical_bld_type)

        where_clauses = [
            "menu_type = %s",
            "city_code = %s",
            "bld_id = %s",
        ]
        params: List[Any] = [resolved_menu_type, city_code, bld_id]
        if resolved_menu_type == MENU_TYPE_ONE_DAY:
            if not date:
                raise HTTPException(status_code=400, detail="date is required for ONE_DAY menus")
            where_clauses.append("date = %s")
            params.append(date)
            param_period = None if period_type == "festivals" else period_type
            where_clauses.append("((period_type IS NULL AND %s IS NULL) OR (period_type = %s))")
            params.extend([param_period, param_period])
        else:
            where_clauses.append("date IS NULL")

        menu_query = f"""
            SELECT
                menu_id,
                date,
                is_festival,
                is_released,
                is_production_generated,
                period_type,
                bld_id,
                menu_type
            FROM menu
            WHERE {' AND '.join(where_clauses)}
            LIMIT 1
        """
        cursor.execute(menu_query, params)
        menu_row = cursor.fetchone()
        if not menu_row:
            raise HTTPException(status_code=404, detail="Menu not found")

        menu_id = menu_row["menu_id"]

        # Fetch associated menu_items
        items_query = """
            SELECT
                mi.menu_item_id,
                mi.item_id,
                i.name AS item_name,
                i.uom,
                i.buffer_percentage,
                mi.category_id,
                mi.max_qty,
                mi.available_qty,
                mi.buffer_qty,
                mi.final_qty,
                mi.rate,
                mi.is_default,
                mi.sort_order,
                i.max_qty_breakfast,
                i.max_qty_lunch,
                i.max_qty_dinner
            FROM menu_items mi
            JOIN items i ON mi.item_id = i.item_id
            WHERE mi.menu_id = %s
            ORDER BY mi.sort_order ASC
        """
        legacy_items_mode = False
        try:
            cursor.execute(items_query, (menu_id,))
            menu_items = cursor.fetchall()
        except mysql.connector.Error as err:
            if err.errno == errorcode.ER_BAD_FIELD_ERROR:
                legacy_items_mode = True
                legacy_items_query = """
                    SELECT
                        mi.menu_item_id,
                        mi.item_id,
                        i.name AS item_name,
                        i.uom,
                        i.buffer_percentage,
                        mi.category_id,
                        mi.max_qty,
                        mi.available_qty,
                        mi.buffer_qty,
                        mi.final_qty,
                        mi.rate,
                        mi.is_default,
                        mi.sort_order,
                        i.max_qty AS legacy_item_max_qty
                    FROM menu_items mi
                    JOIN items i ON mi.item_id = i.item_id
                    WHERE mi.menu_id = %s
                    ORDER BY mi.sort_order ASC
                """
                cursor.execute(legacy_items_query, (menu_id,))
                menu_items = cursor.fetchall()
            else:
                raise

        meal_column = {
            "Breakfast": "max_qty_breakfast",
            "Lunch": "max_qty_lunch",
            "Dinner": "max_qty_dinner",
            "Condiments": "max_qty_dinner",  # fallback; condiments typically align with dinner defaults
        }.get(canonical_bld_type, "max_qty_breakfast")

        return {
            "menu_id": menu_id,
            "date": menu_row["date"],
            "is_festival": bool(menu_row["is_festival"]),
            "is_released": bool(menu_row["is_released"]),
            "is_production_generated": bool(menu_row["is_production_generated"]),
            "period_type": menu_row["period_type"],
            "bld_id": menu_row["bld_id"],
            "bld_type": canonical_bld_type,
            "city_code": city_code,
            "menu_type": resolved_menu_type,
            "items": [
                {
                    "menu_item_id": it["menu_item_id"],
                    "item_id": it["item_id"],
                    "item_name": it["item_name"],
                    "uom": it.get("uom"),
                    "buffer_percentage": float(it["buffer_percentage"] or 0),
                    "category_id": it["category_id"],
                    "max_qty": it["max_qty"],
                    "available_qty": it["available_qty"],
                    "buffer_qty": float(it["buffer_qty"] or 0),
                    "final_qty": float(it["final_qty"] or 0),
                    "rate": float(it["rate"]),
                    "is_default": bool(it["is_default"]),
                    "sort_order": it["sort_order"],
                    "item_max_qty": (
                        it.get("legacy_item_max_qty")
                        if legacy_items_mode
                        else it.get(meal_column)
                    ),
                }
                for it in menu_items
            ]
        }
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


# 3. Create or update (upsert) a daily menu using BLD
class MenuItemPayload(BaseModel):
    item_id: int
    category_id: Optional[int] = None
    max_qty: Optional[int] = None
    available_qty: Optional[int] = None
    rate: float
    is_default: bool = False
    sort_order: Optional[int] = None

class DailyMenuPayload(BaseModel):
    date: Optional[str] = None
    bld_type: str
    is_festival: bool = False
    period_type: Optional[str] = None
    items: List[MenuItemPayload]
    city_code: Optional[str] = None
    menu_type: Optional[str] = None


class AutoMenuRequest(BaseModel):
    date: Optional[str] = None
    city_code: Optional[str] = None


MEAL_TYPES = ["Breakfast", "Lunch", "Dinner"]

@app.post("/api/menu", tags=["Daily Menu"])
def upsert_daily_menu(payload: DailyMenuPayload):
    db = get_db()
    cursor = db.cursor()
    try:
        _ensure_menu_type_column(db)
        canonical_bld_type = normalize_meal_type(payload.bld_type)
        bld_id = resolve_bld_id(cursor, canonical_bld_type)
        city_code = normalize_city_code(payload.city_code or DEFAULT_CITY)

        # Check if a menu exists for date + bld_id + city
        resolved_menu_type = normalize_menu_type(payload.menu_type)
        ensure_menu_allowed(city_code, resolved_menu_type)
        menu_date = payload.date if resolved_menu_type == MENU_TYPE_ONE_DAY else None

        find_conditions = ["menu_type = %s", "bld_id = %s", "city_code = %s"]
        params: List[Any] = [resolved_menu_type, bld_id, city_code]
        if resolved_menu_type == MENU_TYPE_ONE_DAY:
            if not menu_date:
                raise HTTPException(status_code=400, detail="date is required for ONE_DAY menus")
            find_conditions.append("date = %s")
            params.append(menu_date)
        else:
            find_conditions.append("date IS NULL")

        find_query = f"SELECT menu_id FROM menu WHERE {' AND '.join(find_conditions)}"
        cursor.execute(find_query, tuple(params))
        existing = cursor.fetchone()

        if existing:
            menu_id = existing[0]
            # Update existing menu row
            update_query = """
                UPDATE menu
                   SET is_festival = %s,
                       period_type = %s,
                       date = %s
                 WHERE menu_id = %s
            """
            cursor.execute(
                update_query,
                (
                    int(payload.is_festival),
                    payload.period_type,
                    menu_date,
                    menu_id,
                ),
            )
        else:
            # Insert new menu row
            insert_query = """
                INSERT INTO menu (date, is_festival, is_released, period_type, bld_id, city_code, menu_type)
                VALUES (%s, %s, 0, %s, %s, %s, %s)
            """
            cursor.execute(
                insert_query,
                (
                    menu_date,
                    int(payload.is_festival),
                    payload.period_type,
                    bld_id,
                    city_code,
                    resolved_menu_type,
                ),
            )
            menu_id = cursor.lastrowid

        # Delete existing menu_items for this menu
        delete_items_query = "DELETE FROM menu_items WHERE menu_id = %s"
        cursor.execute(delete_items_query, (menu_id,))

        # Insert each item from payload
        for idx, mi in enumerate(payload.items, start=1):
            max_qty_value = mi.max_qty if mi.max_qty is not None else None
            available_qty_value = (
                mi.available_qty
                if mi.available_qty is not None
                else max_qty_value
            )
            insert_item_query = """
                INSERT INTO menu_items
                    (menu_id, item_id, category_id, max_qty, available_qty, rate, is_default, sort_order)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(
                insert_item_query,
                (
                    menu_id,
                    mi.item_id,
                    mi.category_id,
                    max_qty_value,
                    available_qty_value,
                    mi.rate,
                    int(mi.is_default),
                    mi.sort_order or idx,
                )
            )

        db.commit()
        action = "ADD" if existing is None else "UPDATE"
        log_admin_action(
            db,
            admin_id=1,
            action_type=action,
            entity_type="ITEM",
            entity_id=menu_id,
            description=f"Upserted {resolved_menu_type} menu for {payload.date or city_code} {city_code} ({canonical_bld_type}) with {len(payload.items)} items",
        )
        return _get_daily_menu_internal(
            date=menu_date,
            bld_type=canonical_bld_type,
            period_type=payload.period_type,
            city_code=city_code,
            menu_type=resolved_menu_type,
        )
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


# 4. Release a menu by menu_id
@app.patch("/api/menu/{menu_id}/release", tags=["Daily Menu"])
def release_menu(menu_id: int):
    db = get_db()
    cursor = db.cursor()
    try:
        # Verify that menu exists
        cursor.execute("SELECT menu_id FROM menu WHERE menu_id = %s", (menu_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Menu not found")

        # Mark is_released = TRUE
        update_query = "UPDATE menu SET is_released = 1 WHERE menu_id = %s"
        cursor.execute(update_query, (menu_id,))
        db.commit()
        log_admin_action(
            db,
            admin_id=1,
            action_type="UPDATE",
            entity_type="ITEM",
            entity_id=menu_id,
            description="Menu released",
        )
        return {"status": "released", "menu_id": menu_id}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.post("/api/dev/daily-menu/auto", tags=["Developer Tools"])
def auto_generate_daily_menu(payload: AutoMenuRequest, _: Dict[str, Any] = Depends(developer_required)):
    target_date = _normalize_menu_date(payload.date)
    target_city = normalize_city_code(payload.city_code or DEFAULT_CITY)
    summary: Dict[str, Any] = {}

    for meal in MEAL_TYPES:
        items = _fetch_items_for_meal(meal)
        limited_items = items[:8]  # keep menus lightweight (≈5-10 items)
        if not items:
            summary[meal] = {
                "status": "skipped",
                "reason": "No items configured for this meal.",
            }
            continue

        meal_field = {
            "Breakfast": "max_qty_breakfast",
            "Lunch": "max_qty_lunch",
            "Dinner": "max_qty_dinner",
            "Condiments": "max_qty_dinner",
        }.get(meal, "max_qty_breakfast")

        allow_default = meal != "Dinner"
        menu_items: List[MenuItemPayload] = []
        for index, item in enumerate(limited_items, start=1):
            item_max_qty = item.get(meal_field)
            try:
                resolved_max_qty = int(item_max_qty) if item_max_qty is not None else 0
            except (TypeError, ValueError):
                resolved_max_qty = 0

            menu_items.append(
                MenuItemPayload(
                    item_id=item["item_id"],
                    category_id=item.get("category_id"),
                    max_qty=resolved_max_qty,
                    available_qty=resolved_max_qty,
                    rate=_resolve_item_rate(meal, item),
                    is_default=bool(allow_default and index == 1),
                    sort_order=index,
                )
            )

        menu_payload = DailyMenuPayload(
            date=target_date,
            bld_type=meal,
            is_festival=False,
            period_type="one_day",
            items=menu_items,
            city_code=target_city,
        )

        menu_data = upsert_daily_menu(menu_payload)
        menu_id = menu_data["menu_id"]
        released = False

        if meal in ("Breakfast", "Lunch"):
            release_menu(menu_id)
            released = True

        summary[meal] = {
            "status": "created",
            "menu_id": menu_id,
            "items": len(menu_items),
            "released": released,
        }

    return {
        "date": target_date,
        "results": summary,
    }


@app.post("/api/dev/daily-menu/clear", tags=["Developer Tools"])
def clear_daily_menu(payload: AutoMenuRequest, _: Dict[str, Any] = Depends(developer_required)):
    target_date = _normalize_menu_date(payload.date)
    target_city = normalize_city_code(payload.city_code or DEFAULT_CITY)
    summary: Dict[str, Any] = {}

    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        for meal in MEAL_TYPES:
            try:
                bld_id = resolve_bld_id(cursor, meal)
            except HTTPException as exc:
                if exc.status_code == 404:
                    summary[meal] = {
                        "status": "skipped",
                        "reason": "BLD configuration missing.",
                    }
                    continue
                raise
            cursor.execute(
                "SELECT menu_id FROM menu WHERE date = %s AND bld_id = %s AND city_code = %s LIMIT 1",
                (target_date, bld_id, target_city),
            )
            menu_row = cursor.fetchone()
            if not menu_row:
                summary[meal] = {"status": "absent"}
                continue

            menu_id = menu_row["menu_id"]
            cursor.execute("DELETE FROM menu_items WHERE menu_id = %s", (menu_id,))
            cursor.execute("DELETE FROM menu WHERE menu_id = %s", (menu_id,))
            summary[meal] = {
                "status": "deleted",
                "menu_id": menu_id,
            }

        db.commit()
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

    return {
        "date": target_date,
        "results": summary,
    }


# 5. Un-Release a menu by menu_id
@app.patch("/api/menu/{menu_id}/unrelease", tags=["Daily Menu"])
def unrelease_menu(menu_id: int):
    db = get_db()
    cursor = db.cursor()
    try:
        # Verify that menu exists
        cursor.execute("SELECT menu_id FROM menu WHERE menu_id = %s", (menu_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Menu not found")

        # Mark is_released = FALSE
        update_query = "UPDATE menu SET is_released = 0 WHERE menu_id = %s"
        cursor.execute(update_query, (menu_id,))
        db.commit()
        log_admin_action(
            db,
            admin_id=1,
            action_type="UPDATE",
            entity_type="ITEM",
            entity_id=menu_id,
            description="Menu unreleased",
        )
        return {"status": "unreleased", "menu_id": menu_id}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


def _normalize_menu_date(raw: Optional[str]) -> str:
    if raw:
        try:
            return datetime.strptime(raw, "%Y-%m-%d").date().isoformat()
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.") from exc
    return date.today().isoformat()


def _fetch_items_for_meal(bld_type: str) -> List[Dict[str, Any]]:
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        bld_id = resolve_bld_id(cursor, bld_type)
        cursor.execute(
            """
            SELECT
                i.item_id,
                i.category_id,
                i.max_qty_breakfast,
                i.max_qty_lunch,
                i.max_qty_dinner,
                i.breakfast_price,
                i.lunch_price,
                i.dinner_price,
                i.condiments_price,
                i.net_price,
                i.name
            FROM items i
            WHERE EXISTS (
                SELECT 1
                  FROM item_bld_map map
                 WHERE map.item_id = i.item_id
                   AND map.bld_id = %s
            )
            ORDER BY i.name
            """,
            (bld_id,),
        )
        items = cursor.fetchall()
        attach_bld_ids(cursor, items)
        return filter_items_by_bld(items, bld_id)
    finally:
        cursor.close()
        db.close()


def _resolve_item_rate(meal: str, item: Dict[str, Any]) -> float:
    meal_key = {
        "Breakfast": "breakfast_price",
        "Lunch": "lunch_price",
        "Dinner": "dinner_price",
        "Condiments": "condiments_price",
    }.get(meal)
    candidates = []
    if meal_key:
        candidates.append(item.get(meal_key))
    candidates.append(item.get("net_price"))
    for value in candidates:
        if value is not None:
            try:
                return float(value)
            except (TypeError, ValueError):
                continue
    return 0.0


@app.get("/api/dashboard/metrics")
def get_dashboard_metrics(
    city_code: Optional[str] = Query(None, alias="city_code"),
    user: Dict[str, Any] = Depends(admin_required),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        today = date.today()
        today_str = today.isoformat()
        target_city = _resolve_city_context(city_code, user)
        pending_status_values = tuple(
            sorted({status.lower() for status in PENDING_ORDER_STATUS_NAMES if status})
        )
        pending_placeholders = ", ".join(["%s"] * len(pending_status_values)) or "'pending'"
        status_compare_expr = "LOWER(REPLACE(COALESCE(o.status, ''), ' (Payment Due)', ''))"

        total_customers = get_customer_count(db, target_city)

        cursor.execute(
            """
            SELECT COUNT(*) AS total_orders
              FROM orders o
              JOIN addresses a ON o.address_id = a.address_id
             WHERE a.city_code = %s
            """,
            (target_city,),
        )
        total_orders_record = cursor.fetchone() or {"total_orders": 0}
        total_orders = int(total_orders_record.get("total_orders") or 0)

        cursor.execute(
            f"""
            SELECT COUNT(*) AS pending_orders
              FROM orders o
              JOIN addresses a ON o.address_id = a.address_id
             WHERE {status_compare_expr} IN ({pending_placeholders})
               AND a.city_code = %s
            """,
            (*pending_status_values, target_city),
        )
        pending_record = cursor.fetchone() or {"pending_orders": 0}
        pending_orders = int(pending_record.get("pending_orders") or 0)
        completed_orders = max(total_orders - pending_orders, 0)

        meal_targets = get_supported_meals_for_city(target_city)
        total_blds = len(meal_targets)

        cursor.execute(
            """
            SELECT 
                COUNT(*) AS menu_count,
                SUM(CASE WHEN m.is_released = 1 THEN 1 ELSE 0 END) AS released_count,
                SUM(CASE WHEN m.is_production_generated = 1 THEN 1 ELSE 0 END) AS production_count
            FROM menu m
            WHERE m.date = %s
              AND m.city_code = %s
            """,
            (today_str, target_city),
        )
        menu_stats = cursor.fetchone() or {
            "menu_count": 0,
            "released_count": 0,
            "production_count": 0,
        }
        menu_count = int(menu_stats.get("menu_count") or 0)
        released_count = int(menu_stats.get("released_count") or 0)
        production_count = int(menu_stats.get("production_count") or 0)

        cursor.execute(
            """
            SELECT COUNT(*) AS menu_items_count
              FROM menu_items mi
              JOIN menu m ON mi.menu_id = m.menu_id
             WHERE m.date = %s
               AND m.city_code = %s
            """,
            (today_str, target_city),
        )
        menu_items_record = cursor.fetchone() or {"menu_items_count": 0}
        menu_items_count = int(menu_items_record.get("menu_items_count") or 0)

        cursor.execute(
            f"""
            SELECT 
                COUNT(*) AS total_today,
                SUM(
                    CASE 
                        WHEN LOWER(COALESCE(o.status, '')) IN ('delivered', 'completed') 
                        THEN 1 ELSE 0 
                    END
                ) AS delivered_today,
                SUM(
                    CASE 
                        WHEN {status_compare_expr} IN ({pending_placeholders})
                        THEN 1 ELSE 0 
                    END
                ) AS pending_today
            FROM orders o
            JOIN addresses a ON o.address_id = a.address_id
            WHERE DATE(o.created_at) = %s
              AND a.city_code = %s
            """,
            (*pending_status_values, today_str, target_city),
        )
        daily_orders_record = cursor.fetchone() or {
            "total_today": 0,
            "delivered_today": 0,
            "pending_today": 0,
        }
        daily_orders_total = int(daily_orders_record.get("total_today") or 0)
        daily_orders_pending = int(daily_orders_record.get("pending_today") or 0)
        daily_orders_delivered = int(daily_orders_record.get("delivered_today") or 0)

        daily_menu_completed = (
            total_blds > 0 and menu_count >= total_blds and menu_items_count > 0
        )
        release_completed = total_blds > 0 and released_count >= total_blds
        production_completed = total_blds > 0 and production_count >= total_blds
        deliveries_completed = (
            daily_orders_total > 0 and daily_orders_pending == 0
        )

        deliveries_status = "Done" if deliveries_completed else (
            "In Progress" if daily_orders_delivered > 0 else "Pending"
        )

        daily_menu_status = "Done" if daily_menu_completed else (
            "In Progress" if total_blds > 0 and menu_count > 0 else "Pending"
        )
        menu_release_status = "Done" if release_completed else (
            "In Progress" if total_blds > 0 and released_count > 0 else "Pending"
        )
        production_status = "Done" if production_completed else (
            "In Progress" if total_blds > 0 and production_count > 0 else "Pending"
        )

        checklist = [
            {
                "key": "daily_menu",
                "label": "Daily Menu Creation",
                "completed": daily_menu_completed,
                "status": daily_menu_status,
                "detail": f"{menu_count}/{total_blds} menus ready" if total_blds else None,
            },
            {
                "key": "menu_release",
                "label": "Menu Release",
                "completed": release_completed,
                "status": menu_release_status,
                "detail": f"{released_count}/{total_blds} released" if total_blds else None,
            },
            {
                "key": "production_plan",
                "label": "Kitchen Production Planning",
                "completed": production_completed,
                "status": production_status,
                "detail": f"{production_count}/{total_blds} planned" if total_blds else None,
            },
            {
                "key": "trip_sheet",
                "label": "Trip Sheet Generation",
                "completed": False,
                "status": "Pending",
                "detail": None,
            },
            {
                "key": "deliveries",
                "label": "Deliveries Completed",
                "completed": deliveries_completed,
                "status": deliveries_status,
                "detail": (
                    f"{daily_orders_delivered}/{daily_orders_total} delivered"
                    if daily_orders_total
                    else "No orders yet"
                ),
            },
        ]

        cursor.execute(
            """
            SELECT 
                o.order_id,
                o.created_at,
                o.total_price,
                o.status,
                o.paid,
                c.name AS customer_name,
                COALESCE(SUM(oi.quantity), 0) AS item_count
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            JOIN addresses a ON o.address_id = a.address_id
            WHERE a.city_code = %s
            GROUP BY o.order_id, o.created_at, o.total_price, o.status, c.name
            ORDER BY o.created_at DESC, o.order_id DESC
            LIMIT 5
            """,
            (target_city,),
        )
        recent_rows = cursor.fetchall() or []
        recent_orders = []
        for row in recent_rows:
            order_id = int(row.get("order_id") or 0)
            created_at = row.get("created_at")
            paid_flag = bool(row.get("paid"))
            status_formatted = format_status_with_payment(row.get("status"), paid_flag)
            recent_orders.append(
                {
                    "id": f"ORD-{order_id:05d}" if order_id else str(row.get("order_id") or ""),
                    "orderId": order_id,
                    "customer": row.get("customer_name") or "Unknown Customer",
                    "items": int(row.get("item_count") or 0),
                    "total": float(row.get("total_price") or 0),
                    "status": status_formatted,
                    "createdAt": created_at.isoformat() if created_at else None,
                    "paid": paid_flag,
                }
            )

        cursor.execute(
            """
            SELECT COALESCE(SUM(o.total_price), 0) AS todays_revenue
              FROM orders o
              JOIN addresses a ON o.address_id = a.address_id
             WHERE DATE(o.created_at) = %s
               AND a.city_code = %s
            """,
            (today_str, target_city),
        )
        todays_revenue = float((cursor.fetchone() or {}).get("todays_revenue") or 0.0)

        month_start = today.replace(day=1)
        if month_start.month == 12:
            next_month_start = month_start.replace(year=month_start.year + 1, month=1)
        else:
            next_month_start = month_start.replace(month=month_start.month + 1)
        month_start_dt = datetime.combine(month_start, datetime.min.time())
        next_month_dt = datetime.combine(next_month_start, datetime.min.time())

        cursor.execute(
            """
            SELECT COALESCE(SUM(o.total_price), 0) AS monthly_revenue
              FROM orders o
              JOIN addresses a ON o.address_id = a.address_id
             WHERE o.created_at >= %s
               AND o.created_at < %s
               AND a.city_code = %s
            """,
            (month_start_dt, next_month_dt, target_city),
        )
        monthly_revenue = float((cursor.fetchone() or {}).get("monthly_revenue") or 0.0)

        return {
            "city_code": target_city,
            "totalCustomers": total_customers,
            "totalOrders": total_orders,
            "ordersCompleted": completed_orders,
            "pendingOrders": pending_orders,
            "todaysRevenue": todays_revenue,
            "monthlyRevenue": monthly_revenue,
            "recentOrders": recent_orders,
            "checklist": checklist,
            "activeSubscriptions": 0,
        }
    finally:
        cursor.close()
        db.close()


def _apply_order_filters(
    base_where: List[str],
    params: List,
    status: Optional[str],
    customer: Optional[str],
    product: Optional[str],
) -> None:
    if status:
        normalized = status.strip().lower()
        if normalized and normalized != "all":
            base_where.append("LOWER(REPLACE(COALESCE(o.status, ''), ' (Payment Due)', '')) = %s")
            params.append(normalized)
    if customer:
        term = f"%{customer.strip()}%"
        base_where.append("(c.name LIKE %s OR c.primary_mobile LIKE %s)")
        params.extend([term, term])
    if product:
        term = f"%{product.strip()}%"
        base_where.append("i.name LIKE %s")
        params.append(term)


@app.get("/api/admin/orders/history")
def admin_order_history(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    customer: Optional[str] = None,
    product: Optional[str] = None,
    city_code: Optional[str] = Query(None, alias="city_code"),
    limit: int = Query(10, ge=1, le=200),
    offset: int = Query(0, ge=0),
    export: Optional[str] = None,
    user: Dict[str, Any] = Depends(admin_required),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        resolved_city = _resolve_city_context(city_code, user)
        where_clauses: List[str] = []
        params: List = []

        start_date_obj = _parse_optional_date(start_date)
        end_date_obj = _parse_optional_date(end_date)
        if start_date_obj and end_date_obj and start_date_obj > end_date_obj:
            start_date_obj, end_date_obj = end_date_obj, start_date_obj

        if start_date_obj:
            where_clauses.append("o.created_at >= %s")
            params.append(datetime.combine(start_date_obj, datetime.min.time()))
        if end_date_obj:
            where_clauses.append("o.created_at <= %s")
            params.append(datetime.combine(end_date_obj, datetime.max.time()))

        where_clauses.append("a.city_code = %s")
        params.append(resolved_city)
        _apply_order_filters(where_clauses, params, status, customer, product)
        where_sql = " AND ".join(where_clauses)
        where_fragment = f"WHERE {where_sql}" if where_sql else ""

        count_query = f"""
            SELECT COUNT(DISTINCT o.order_id) AS total
              FROM orders o
              JOIN customers c ON o.customer_id = c.customer_id
              LEFT JOIN addresses a ON o.address_id = a.address_id
              LEFT JOIN order_items oi ON o.order_id = oi.order_id
              LEFT JOIN items i ON oi.item_id = i.item_id
             {where_fragment}
        """
        cursor.execute(count_query, tuple(params))
        total_row = cursor.fetchone() or {"total": 0}
        total_orders = int(total_row.get("total") or 0)

        data_query = f"""
            SELECT 
                o.order_id,
                o.created_at,
                o.total_price,
                o.status,
                o.paid,
                o.payment_method,
                o.customer_id,
                c.name AS customer_name,
                c.primary_mobile,
                c.email,
                o.address_id,
                a.written_address,
                a.city,
                a.pin_code,
                COALESCE(SUM(oi.quantity), 0) AS item_count
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN addresses a ON o.address_id = a.address_id
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            LEFT JOIN items i ON oi.item_id = i.item_id
            {where_fragment}
            GROUP BY
                o.order_id,
                o.created_at,
                o.total_price,
                o.status,
                o.paid,
                o.payment_method,
                o.customer_id,
                c.name,
                c.primary_mobile,
                c.email,
                o.address_id,
                a.written_address,
                a.city,
                a.pin_code
            ORDER BY o.created_at DESC, o.order_id DESC
        """

        data_params = list(params)
        if export != "csv":
            data_query += " LIMIT %s OFFSET %s"
            data_params.extend([limit, offset])

        cursor.execute(data_query, tuple(data_params))
        orders = cursor.fetchall() or []

        order_ids = [row["order_id"] for row in orders]
        items_by_order: Dict[int, List[Dict[str, object]]] = {}
        if order_ids:
            placeholders = ",".join(["%s"] * len(order_ids))
            cursor.execute(
                f"""
                SELECT 
                    oi.order_id,
                    oi.quantity,
                    oi.price,
                    i.name AS item_name
                FROM order_items oi
                JOIN items i ON oi.item_id = i.item_id
                WHERE oi.order_id IN ({placeholders})
                ORDER BY oi.order_id ASC, i.name ASC
                """,
                tuple(order_ids),
            )
            for row in cursor.fetchall():
                order_id = row["order_id"]
                items_by_order.setdefault(order_id, []).append(
                    {
                        "name": row.get("item_name") or "Item",
                        "quantity": int(row.get("quantity") or 0),
                        "price": float(row.get("price") or 0),
                        "line_total": float(row.get("quantity") or 0) * float(row.get("price") or 0),
                    }
                )

        if export == "csv":
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(
                [
                    "Order ID",
                    "Placed At",
                    "Customer",
                    "Phone",
                    "Status",
                    "Payment Method",
                    "Payment Status",
                    "Item",
                    "Quantity",
                    "Price",
                    "Line Total",
                    "Order Total",
                ]
            )

            for record in orders:
                paid_flag = bool(record.get("paid"))
                normalized_status = format_status_with_payment(record.get("status"), paid_flag)
                payment_label = "Paid" if paid_flag else "Payment Due"
                order_items = items_by_order.get(record["order_id"], []) or [
                    {"name": "", "quantity": 0, "price": 0.0, "line_total": 0.0}
                ]
                for item in order_items:
                    writer.writerow(
                        [
                            record["order_id"],
                            record["created_at"].strftime("%Y-%m-%d %H:%M:%S") if record.get("created_at") else "",
                            record.get("customer_name") or "",
                            record.get("primary_mobile") or "",
                            normalized_status,
                            record.get("payment_method") or "",
                            payment_label,
                            item["name"],
                            item["quantity"],
                            item["price"],
                            item["line_total"],
                            float(record.get("total_price") or 0),
                        ]
                    )

            output.seek(0)
            response = Response(
                content=output.getvalue(),
                media_type="text/csv",
                headers={
                    "Content-Disposition": "attachment; filename=order-history.csv",
                },
            )
            return response

        result = []
        for record in orders:
            paid_flag = bool(record.get("paid"))
            normalized_status = format_status_with_payment(record.get("status"), paid_flag)
            order_id = record["order_id"]
            result.append(
                {
                    "order_id": order_id,
                    "created_at": _format_datetime(record.get("created_at")),
                    "status": normalized_status,
                    "payment_method": record.get("payment_method") or "Unknown",
                     "paid": paid_flag,
                    "total_price": float(record.get("total_price") or 0),
                    "customer_id": int(record.get("customer_id") or 0),
                    "customer_name": record.get("customer_name") or "Customer",
                    "customer_phone": record.get("primary_mobile"),
                    "customer_email": record.get("email"),
                    "address": {
                        "address_id": record.get("address_id"),
                        "line1": record.get("written_address"),
                        "city": record.get("city"),
                        "pin_code": record.get("pin_code"),
                    },
                    "item_count": int(record.get("item_count") or 0),
                    "items": items_by_order.get(order_id, []),
                }
            )

        return {"orders": result, "total": total_orders}
    finally:
        cursor.close()
        db.close()


@app.post("/api/admin/orders/{order_id}/status")
def admin_update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    user: Dict[str, Any] = Depends(admin_required),
):
    db = get_db()
    cursor = db.cursor()
    try:
        target_city = _resolve_city_context(None, user)
        cursor.execute(
            """
            SELECT o.paid
              FROM orders o
              JOIN addresses a ON o.address_id = a.address_id
             WHERE o.order_id = %s
               AND a.city_code = %s
            """,
            (order_id, target_city),
        )
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Order not found")
        current_paid = bool(row["paid"]) if isinstance(row, dict) else bool(row[0])

        new_status = normalize_order_status(payload.status)
        paid_after = current_paid or new_status == ORDER_STATUS_DELIVERED
        stored_status = new_status if paid_after else f"{new_status} (Payment Due)"
        cursor.execute(
            "UPDATE orders SET status = %s, paid = %s WHERE order_id = %s",
            (
                stored_status,
                int(paid_after),
                order_id,
            ),
        )
        if cursor.rowcount == 0:
            db.rollback()
            raise HTTPException(status_code=404, detail="Order not found")
        db.commit()
        return {"order_id": order_id, "status": new_status}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to update order status: {err.msg}"
        )
    finally:
        cursor.close()
        db.close()


@app.get("/api/admin/orders/{order_id}/invoice")
def admin_order_invoice(
    order_id: int,
    city_code: Optional[str] = Query(None, alias="city_code"),
    user: Dict[str, Any] = Depends(admin_required),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        target_city = _resolve_city_context(city_code, user)
        cursor.execute(
            """
            SELECT 
                o.order_id,
                o.created_at,
                o.total_price,
                o.status,
                o.payment_method,
                c.customer_id,
                c.name AS customer_name,
                c.primary_mobile,
                c.email,
                a.address_id,
                a.written_address,
                a.city,
                a.pin_code,
                a.city_code
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN addresses a ON o.address_id = a.address_id
            WHERE o.order_id = %s
              AND (a.city_code = %s OR a.city_code IS NULL)
            """,
            (order_id, target_city),
        )
        order_row = cursor.fetchone()
        if not order_row:
            raise HTTPException(status_code=404, detail="Order not found")

        cursor.execute(
            """
            SELECT 
                oi.quantity,
                oi.price,
                i.name AS item_name
            FROM order_items oi
            JOIN items i ON oi.item_id = i.item_id
            WHERE oi.order_id = %s
            ORDER BY i.name ASC
            """,
            (order_id,),
        )
        item_rows = cursor.fetchall() or []

        items: List[Dict[str, object]] = []
        subtotal = 0.0
        for row in item_rows:
            quantity = int(row.get("quantity") or 0)
            price = float(row.get("price") or 0)
            line_total = quantity * price
            subtotal += line_total
            items.append(
                {
                    "name": row.get("item_name") or "Item",
                    "quantity": quantity,
                    "price": price,
                    "line_total": line_total,
                }
            )

        invoice_response = {
            "invoice_number": f"INV-{order_id:05d}",
            "issued_at": _format_datetime(datetime.now()),
            "due_date": None,
            "order": {
                "order_id": order_id,
                "created_at": _format_datetime(order_row.get("created_at")),
                "status": order_row.get("status") or "Pending",
                "total_price": float(order_row.get("total_price") or 0),
                "payment_method": order_row.get("payment_method") or "Unknown",
            },
            "customer": {
                "customer_id": int(order_row.get("customer_id") or 0),
                "name": order_row.get("customer_name") or "Customer",
                "phone": order_row.get("primary_mobile"),
                "email": order_row.get("email"),
            },
            "address": {
                "address_id": order_row.get("address_id"),
                "line1": order_row.get("written_address"),
                "city": order_row.get("city"),
                "pin_code": order_row.get("pin_code"),
            },
            "items": items,
            "subtotal": subtotal,
            "total": float(order_row.get("total_price") or subtotal),
        }

        return invoice_response
    finally:
        cursor.close()
        db.close()


class ProductionPlanItem(BaseModel):
    item_name: str
    buffer_quantity: float
    final_quantity: float

class ProductionPlanRequest(BaseModel):
    date: str
    menu_type: str
    plans: List[ProductionPlanItem]
    city_code: Optional[str] = None

class ProductionPlanResetRequest(BaseModel):
    date: str
    menu_type: str
    city_code: Optional[str] = None

class MaxQtyUpdate(BaseModel):
    item_name: str
    additional_qty: float = Field(..., gt=0)

class UpdateMaxQtyRequest(BaseModel):
    date: str
    menu_type: str
    updates: List[MaxQtyUpdate]
    city_code: Optional[str] = None


class TripSheetRequest(BaseModel):
    date: str
    city_code: Optional[str] = None


class DevOrderSeedRequest(BaseModel):
    date: Optional[str] = None
    city_code: Optional[str] = None
    count: int = Field(default=10, ge=0, le=200)
    clear_existing: bool = False


def _purge_all_orders_impl():
    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM orders")
        total_orders = int((cursor.fetchone() or [0])[0] or 0)
        cursor.execute("DELETE FROM order_items")
        cursor.execute("DELETE FROM orders")
        db.commit()
        return {"deleted_orders": total_orders}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to purge orders: {err.msg}")
    finally:
        cursor.close()
        db.close()


@app.delete("/api/dev/orders", tags=["Developer"])
def purge_all_orders(user: Dict[str, Any] = Depends(developer_required)):
    return _purge_all_orders_impl()


@app.post("/api/dev/orders/purge", tags=["Developer"])
def purge_all_orders_post(user: Dict[str, Any] = Depends(developer_required)):
    return _purge_all_orders_impl()

class OrderItemPayload(BaseModel):
    item_id: int
    quantity: int
    price: float
    menu_item_id: Optional[int] = None
    meal_type: Optional[str] = None

class CreateOrderPayload(BaseModel):
    customer_id: int
    address_id: Optional[int] = None
    payment_method: str
    items: List[OrderItemPayload]
    order_date: Optional[str] = None
    order_type: Optional[str] = None


class AddressPayload(BaseModel):
    address_type: Optional[str] = None
    house_apartment_no: Optional[str] = None
    written_address: str
    city: str
    city_code: Optional[str] = None
    pin_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    route_assignment: Optional[str] = None
    is_default: bool = False

@app.get("/api/customers/{customer_id}/addresses", tags=["Customers"])
def get_customer_addresses(customer_id: int):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT
                address_id,
                address_type,
                house_apartment_no,
                written_address,
                city,
                city_code,
                pin_code,
                is_default,
                latitude,
                longitude,
                route_assignment
            FROM addresses
            WHERE customer_id = %s
            ORDER BY is_default DESC, address_id ASC
            """,
            (customer_id,),
        )
        rows = cursor.fetchall()
        return [
            {
                "address_id": row["address_id"],
                "address_type": row.get("address_type") or "Address",
                "house_apartment_no": row.get("house_apartment_no"),
                "written_address": row.get("written_address") or "",
                "city": row.get("city") or "",
                "city_code": row.get("city_code") or DEFAULT_CITY,
                "pin_code": row.get("pin_code") or "",
                "is_default": bool(row.get("is_default")),
                "latitude": float(row["latitude"]) if row.get("latitude") is not None else None,
                "longitude": float(row["longitude"]) if row.get("longitude") is not None else None,
                "route_assignment": row.get("route_assignment"),
            }
            for row in rows
        ]
    finally:
        cursor.close()
        db.close()


def _resolve_coordinates(cursor, customer_id: int, latitude: Optional[float], longitude: Optional[float]) -> Tuple[float, float]:
    lat = latitude
    lng = longitude
    if lat is not None and lng is not None:
        return float(lat), float(lng)

    cursor.execute(
        """
        SELECT latitude, longitude
          FROM addresses
         WHERE customer_id=%s AND is_default=1
         LIMIT 1
        """,
        (customer_id,),
    )
    fallback = cursor.fetchone()
    if fallback:
        fallback_lat = fallback.get("latitude")
        fallback_lng = fallback.get("longitude")
        return (
            float(fallback_lat) if fallback_lat is not None else 0.0,
            float(fallback_lng) if fallback_lng is not None else 0.0,
        )
    return float(lat or 0.0), float(lng or 0.0)


@app.post("/api/customers/{customer_id}/addresses", tags=["Customers"])
def create_customer_address(customer_id: int, payload: AddressPayload):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT customer_id FROM customers WHERE customer_id=%s LIMIT 1", (customer_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Customer not found")

        normalized_city_code = _resolve_city_code(payload.city, payload.city_code)
        city_label = _normalize_city_label(payload.city, normalized_city_code)
        lat, lng = _resolve_coordinates(cursor, customer_id, payload.latitude, payload.longitude)

        if payload.is_default:
            cursor.execute("UPDATE addresses SET is_default=0 WHERE customer_id=%s", (customer_id,))

        cursor.execute(
            """
            INSERT INTO addresses (
                customer_id,
                house_apartment_no,
                written_address,
                city,
                city_code,
                pin_code,
                latitude,
                longitude,
                address_type,
                route_assignment,
                is_default
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                customer_id,
                payload.house_apartment_no,
                payload.written_address.strip(),
                city_label,
                normalized_city_code,
                payload.pin_code.strip(),
                lat,
                lng,
                payload.address_type.strip() if payload.address_type else "Address",
                payload.route_assignment,
                1 if payload.is_default else 0,
            ),
        )
        address_id = cursor.lastrowid
        db.commit()

        return {"address_id": address_id, "message": "Address added successfully"}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        cursor.close()
        db.close()


@app.put("/api/customers/{customer_id}/addresses/{address_id}", tags=["Customers"])
def update_customer_address(customer_id: int, address_id: int, payload: AddressPayload):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT latitude, longitude FROM addresses WHERE address_id=%s AND customer_id=%s LIMIT 1",
            (address_id, customer_id),
        )
        existing = cursor.fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Address not found")

        normalized_city_code = _resolve_city_code(payload.city, payload.city_code)
        city_label = _normalize_city_label(payload.city, normalized_city_code)
        lat_input = payload.latitude if payload.latitude is not None else existing.get("latitude")
        lng_input = payload.longitude if payload.longitude is not None else existing.get("longitude")
        lat, lng = _resolve_coordinates(cursor, customer_id, lat_input, lng_input)

        if payload.is_default:
            cursor.execute(
                "UPDATE addresses SET is_default=0 WHERE customer_id=%s AND address_id<>%s",
                (customer_id, address_id),
            )

        cursor.execute(
            """
            UPDATE addresses
               SET house_apartment_no=%s,
                   written_address=%s,
                   city=%s,
                   city_code=%s,
                   pin_code=%s,
                   latitude=%s,
                   longitude=%s,
                   address_type=%s,
                   route_assignment=%s,
                   is_default=%s
             WHERE address_id=%s AND customer_id=%s
            """,
            (
                payload.house_apartment_no,
                payload.written_address.strip(),
                city_label,
                normalized_city_code,
                payload.pin_code.strip(),
                lat,
                lng,
                payload.address_type.strip() if payload.address_type else "Address",
                payload.route_assignment,
                1 if payload.is_default else 0,
                address_id,
                customer_id,
            ),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Address not found")

        db.commit()
        return {"message": "Address updated successfully"}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        cursor.close()
        db.close()


@app.post("/api/customers/{customer_id}/addresses/{address_id}/default", tags=["Customers"])
def set_default_customer_address(customer_id: int, address_id: int):
    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute(
            "SELECT address_id FROM addresses WHERE address_id=%s AND customer_id=%s LIMIT 1",
            (address_id, customer_id),
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Address not found")

        cursor.execute("UPDATE addresses SET is_default=0 WHERE customer_id=%s", (customer_id,))
        cursor.execute(
            "UPDATE addresses SET is_default=1 WHERE address_id=%s AND customer_id=%s",
            (address_id, customer_id),
        )
        db.commit()
        return {"message": "Default address updated"}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        cursor.close()
        db.close()

@app.post("/api/production/generate", tags=["Production"])
def generate_production_plan(payload: ProductionPlanRequest):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    updated = 0
    try:
        canonical_menu_type = normalize_meal_type(payload.menu_type)
        bld_id = resolve_bld_id(cursor, canonical_menu_type)
        target_city = normalize_city_code(payload.city_code or DEFAULT_CITY)

        # Find menu_id for that date + bld_id
        cursor.execute(
            "SELECT menu_id FROM menu WHERE date=%s AND bld_id=%s AND city_code=%s LIMIT 1",
            (payload.date, bld_id, target_city)
        )
        menu = cursor.fetchone()
        if not menu:
            raise HTTPException(status_code=404, detail="Menu not found for that date/type")
        menu_id = menu["menu_id"]

        # Update buffer and final quantities for each menu item
        for plan in payload.plans:
            buffer_input = plan.buffer_quantity if plan.buffer_quantity is not None else 0
            final_input = plan.final_quantity if plan.final_quantity is not None else 0
            buffer_value = max(int(round(buffer_input)), 0)
            final_value = max(float(final_input), 0.0)
            cursor.execute(
                """
                UPDATE menu_items mi
                JOIN items i ON mi.item_id = i.item_id
                SET mi.buffer_qty = %s,
                    mi.max_qty = %s,
                    mi.final_qty = %s
                WHERE mi.menu_id = %s
                AND LOWER(i.name) = LOWER(%s)
                """,
                (buffer_value, final_value, final_value, menu_id, plan.item_name)
            )
            updated += cursor.rowcount


        # Keep plan marked as in-progress
        cursor.execute(
            "UPDATE menu SET is_production_generated = 0 WHERE menu_id=%s",
            (menu_id,),
        )
        db.commit()

        log_admin_action(
            db,
            admin_id=None,
            action_type="UPDATE",
            entity_type="ITEM",
            entity_id=menu_id,
            description=f"Saved production plan for {payload.date} {target_city} ({canonical_menu_type})",
        )

        return {
            "success": True,
            "updated_items": updated,
            "menu_type": canonical_menu_type,
            "message": "Production plan saved successfully",
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

@app.post("/api/production/reopen", tags=["Production"])
def reopen_production_plan(payload: ProductionPlanResetRequest):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        canonical_menu_type = normalize_meal_type(payload.menu_type)
        bld_id = resolve_bld_id(cursor, canonical_menu_type)
        target_city = normalize_city_code(payload.city_code or DEFAULT_CITY)

        cursor.execute(
            "SELECT menu_id FROM menu WHERE date=%s AND bld_id=%s AND city_code=%s LIMIT 1",
            (payload.date, bld_id, target_city),
        )
        menu_row = cursor.fetchone()
        if not menu_row:
            raise HTTPException(status_code=404, detail="Menu not found for that date/type")

        menu_id = int(menu_row["menu_id"])

        cursor.execute(
            "UPDATE menu SET is_production_generated = 0 WHERE menu_id = %s",
            (menu_id,),
        )

        reverted_orders = _bulk_update_order_status_for_date(
            cursor,
            payload.date,
            target_city,
            ORDER_STATUS_CONFIRMED,
            [ORDER_STATUS_PREPARING],
        )

        db.commit()

        log_admin_action(
            db,
            admin_id=None,
            action_type="UPDATE",
            entity_type="ITEM",
            entity_id=menu_id,
            description=f"Reopened production plan for {payload.date} {target_city} ({canonical_menu_type})",
        )

        return {
            "success": True,
            "menu_type": canonical_menu_type,
            "orders_reverted": reverted_orders,
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

@app.post("/api/production/finalize", tags=["Production"])
def finalize_production_plan(payload: ProductionPlanResetRequest):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        canonical_menu_type = normalize_meal_type(payload.menu_type)
        bld_id = resolve_bld_id(cursor, canonical_menu_type)
        target_city = normalize_city_code(payload.city_code or DEFAULT_CITY)

        cursor.execute(
            "SELECT menu_id FROM menu WHERE date=%s AND bld_id=%s AND city_code=%s LIMIT 1",
            (payload.date, bld_id, target_city),
        )
        menu_row = cursor.fetchone()
        if not menu_row:
            raise HTTPException(status_code=404, detail="Menu not found for that date/type")

        menu_id = int(menu_row["menu_id"])

        cursor.execute(
            "SELECT COUNT(1) AS item_count FROM menu_items WHERE menu_id=%s",
            (menu_id,),
        )
        item_row = cursor.fetchone() or {"item_count": 0}
        if int(item_row.get("item_count") or 0) == 0:
            raise HTTPException(status_code=400, detail="No items available to export for this menu")

        cursor.execute(
            "UPDATE menu SET is_production_generated = 1 WHERE menu_id = %s",
            (menu_id,),
        )

        _bulk_update_order_status_for_date(
            cursor,
            payload.date,
            target_city,
            ORDER_STATUS_PREPARING,
            [ORDER_STATUS_PENDING, ORDER_STATUS_CONFIRMED],
        )

        db.commit()

        log_admin_action(
            db,
            admin_id=None,
            action_type="UPDATE",
            entity_type="ITEM",
            entity_id=menu_id,
            description=f"Finalized production plan for {payload.date} {target_city} ({canonical_menu_type})",
        )

        return {
            "success": True,
            "menu_type": canonical_menu_type,
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

@app.patch("/api/production/update-planned", tags=["Production"])
def update_max_quantities(payload: UpdateMaxQtyRequest):
    if not payload.updates:
        raise HTTPException(status_code=400, detail="No updates provided")

    db = get_db()
    cursor = db.cursor(dictionary=True)
    updated_items: List[Dict[str, float]] = []

    try:
        canonical_menu_type = normalize_meal_type(payload.menu_type)
        bld_id = resolve_bld_id(cursor, canonical_menu_type)
        target_city = normalize_city_code(payload.city_code or DEFAULT_CITY)

        cursor.execute(
            "SELECT menu_id FROM menu WHERE date=%s AND bld_id=%s AND city_code=%s LIMIT 1",
            (payload.date, bld_id, target_city),
        )
        menu_row = cursor.fetchone()
        if not menu_row:
            raise HTTPException(status_code=404, detail="Menu not found for that date/type")
        menu_id = menu_row["menu_id"]

        for adjustment in payload.updates:
            cursor.execute(
                """
                UPDATE menu_items mi
                JOIN items i ON mi.item_id = i.item_id
                   SET mi.max_qty = COALESCE(mi.max_qty, 0) + %s,
                       mi.final_qty = COALESCE(mi.final_qty, 0) + %s
                 WHERE mi.menu_id = %s
                   AND LOWER(i.name) = LOWER(%s)
                """,
                (adjustment.additional_qty, adjustment.additional_qty, menu_id, adjustment.item_name),
            )
            if cursor.rowcount == 0:
                continue

            cursor.execute(
                """
                SELECT mi.max_qty
                  FROM menu_items mi
                  JOIN items i ON mi.item_id = i.item_id
                 WHERE mi.menu_id = %s
                   AND LOWER(i.name) = LOWER(%s)
                 LIMIT 1
                """,
                (menu_id, adjustment.item_name),
            )
            planned_row = cursor.fetchone()
            if planned_row:
                updated_items.append(
                    {
                        "item_name": adjustment.item_name,
                        "new_max_qty": float(planned_row["max_qty"]),
                    }
                )

        if not updated_items:
            raise HTTPException(status_code=404, detail="No matching menu items were updated")

        db.commit()

        log_admin_action(
            db,
            admin_id=None,
            action_type="UPDATE",
            entity_type="ITEM",
            entity_id=menu_id,
            description=f"Adjusted max quantities for {payload.date} {target_city} ({canonical_menu_type})",
        )

        return {
            "success": True,
            "message": "Planned quantities updated successfully",
            "updated_items": updated_items,
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.post("/api/dev/orders/seed", tags=["Developer"])
def seed_orders_for_testing(
    payload: DevOrderSeedRequest,
    user: Dict[str, Any] = Depends(developer_required),
):
    target_date = _parse_optional_date(payload.date) or date.today()
    target_city = _resolve_city_context(payload.city_code, user)

    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        deleted_orders = 0
        if payload.clear_existing:
            cursor.execute(
                """
                SELECT o.order_id
                  FROM orders o
                  JOIN addresses a ON o.address_id = a.address_id
                 WHERE DATE(o.created_at) = %s
                   AND a.city_code = %s
                """,
                (target_date, target_city),
            )
            rows = cursor.fetchall() or []
            order_ids = [row["order_id"] for row in rows]
            if order_ids:
                placeholders = ", ".join(["%s"] * len(order_ids))
                cursor.execute(
                    f"DELETE FROM order_items WHERE order_id IN ({placeholders})",
                    tuple(order_ids),
                )
                cursor.execute(
                    f"DELETE FROM orders WHERE order_id IN ({placeholders})",
                    tuple(order_ids),
                )
                deleted_orders = len(order_ids)

        if payload.count == 0:
            db.commit()
            return {
                "date": target_date.isoformat(),
                "city_code": target_city,
                "cleared_orders": deleted_orders,
                "created_orders": 0,
                "sample_order_ids": [],
            }

        cursor.execute(
            """
            SELECT DISTINCT c.customer_id,
                            c.name,
                            a.address_id
              FROM customers c
              JOIN addresses a ON c.customer_id = a.customer_id
             WHERE a.city_code = %s
            """,
            (target_city,),
        )
        candidates = cursor.fetchall() or []
        if not candidates:
            raise HTTPException(status_code=400, detail="No customers found for target city")

        cursor.execute(
            """
            SELECT 
                mi.menu_item_id,
                mi.item_id,
                mi.available_qty,
                COALESCE(
                    mi.rate,
                    i.net_price,
                    i.breakfast_price,
                    i.lunch_price,
                    i.dinner_price,
                    i.condiments_price,
                    0
                ) AS price,
                b.bld_type
              FROM menu m
              JOIN bld b ON m.bld_id = b.bld_id
              JOIN menu_items mi ON m.menu_id = mi.menu_id
              JOIN items i ON mi.item_id = i.item_id
             WHERE m.date = %s
               AND m.city_code = %s
               AND COALESCE(m.is_released, 0) = 1
            """,
            (target_date, target_city),
        )
        released_rows = cursor.fetchall() or []
        released_items = [
            row
            for row in released_rows
            if row.get("price") is not None and float(row.get("price") or 0) > 0
        ]
        if not released_items:
            raise HTTPException(
                status_code=400,
                detail="No released menus found for the selected date. Generate and release menus first.",
            )

        created_ids: List[int] = []
        payment_methods = ["Cash", "UPI", "Card"]

        for _ in range(payload.count):
            customer = random.choice(candidates)
            payment_method = random.choice(payment_methods)

            item_count = random.randint(1, min(3, len(released_items)))
            if item_count == 0:
                break
            selected_items = random.sample(released_items, item_count)
            payload_items: List[OrderItemPayload] = []
            for item in selected_items:
                available_qty = item.get("available_qty")
                max_allowed = 3
                if isinstance(available_qty, (int, float)) and available_qty is not None:
                    if available_qty <= 0:
                        continue
                    max_allowed = max(1, min(3, int(available_qty)))
                qty = random.randint(1, max_allowed)
                payload_items.append(
                    OrderItemPayload(
                        item_id=item["item_id"],
                        quantity=qty,
                        price=float(item["price"]),
                        menu_item_id=item["menu_item_id"],
                        meal_type=item["bld_type"].lower(),
                    )
                )

            if not payload_items:
                continue

            order_payload = CreateOrderPayload(
                customer_id=customer["customer_id"],
                address_id=customer["address_id"],
                payment_method=payment_method,
                items=payload_items,
                order_type="one_time",
            )
            result = create_order(order_payload)
            order_id = result["order_id"]
            created_time = datetime.combine(
                target_date,
                datetime.min.time(),
            ) + timedelta(hours=random.randint(6, 12), minutes=random.randint(0, 59))
            cursor.execute(
                "UPDATE orders SET created_at = %s WHERE order_id = %s",
                (created_time, order_id),
            )
            created_ids.append(order_id)

        db.commit()
        return {
            "date": target_date.isoformat(),
            "city_code": target_city,
            "cleared_orders": deleted_orders,
            "created_orders": len(created_ids),
            "sample_order_ids": created_ids[:5],
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to seed orders: {err.msg}")
    finally:
        cursor.close()
        db.close()


@app.post("/api/logistics/trip-sheet", tags=["Logistics"])
def generate_trip_sheet_report(
    payload: TripSheetRequest,
    user: Dict[str, Any] = Depends(admin_required),
):
    parsed_date = _parse_optional_date(payload.date)
    if not parsed_date:
        raise HTTPException(status_code=400, detail="Valid date required (YYYY-MM-DD)")
    target_city = _resolve_city_context(payload.city_code, user)
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        meals_requiring_production = get_food_meals_for_city(target_city)
        if meals_requiring_production:
            meal_placeholders = ", ".join(["%s"] * len(meals_requiring_production))
            cursor.execute(
                f"""
                SELECT 
                    b.bld_type,
                    MAX(COALESCE(m.is_released, 0)) AS is_released,
                    MAX(COALESCE(m.is_production_generated, 0)) AS is_generated
                  FROM bld b
                  LEFT JOIN menu m
                    ON m.bld_id = b.bld_id
                   AND m.date = %s
                   AND m.city_code = %s
                 WHERE b.bld_type IN ({meal_placeholders})
                 GROUP BY b.bld_type
                """,
                (parsed_date, target_city, *meals_requiring_production),
            )
            rows = cursor.fetchall() or []
            missing = []
            for row in rows:
                meal = row["bld_type"]
                released = bool(row.get("is_released"))
                generated = bool(row.get("is_generated"))
                if released and not generated:
                    missing.append(meal)
            if missing:
                missing_label = ", ".join(missing)
                raise HTTPException(
                    status_code=400,
                    detail=f"Generate kitchen production for {missing_label} before creating the trip sheet.",
                )
        cursor.execute(
            """
            SELECT 
                o.order_id,
                o.created_at,
                o.total_price,
                o.status,
                o.payment_method,
                o.paid,
                c.customer_id,
                c.name AS customer_name,
                c.primary_mobile,
                c.email,
                a.address_id,
                a.address_type,
                a.house_apartment_no,
                a.written_address,
                a.city,
                a.pin_code,
                a.route_assignment
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN addresses a ON o.address_id = a.address_id
           WHERE DATE(o.created_at) = %s
             AND a.city_code = %s
           ORDER BY COALESCE(a.route_assignment, ''), c.name
            """,
            (parsed_date, target_city),
        )
        rows = cursor.fetchall() or []

        route_groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        updatable_statuses = {
            ORDER_STATUS_PENDING.lower(),
            ORDER_STATUS_CONFIRMED.lower(),
            ORDER_STATUS_PREPARING.lower(),
        }

        for row in rows:
            route_label = row.get("route_assignment") or "Unassigned"
            normalized_display = normalize_status_for_response(row.get("status"))
            if normalized_display.lower() in updatable_statuses:
                display_status = ORDER_STATUS_ON_THE_WAY
            else:
                display_status = normalized_display
            display_status = format_status_with_payment(display_status, row.get("paid"))
            route_groups[route_label].append(
                {
                    "order_id": row["order_id"],
                    "customer_id": row["customer_id"],
                    "customer_name": row.get("customer_name"),
                    "phone": row.get("primary_mobile"),
                    "email": row.get("email"),
                    "total_price": float(row.get("total_price") or 0),
                    "payment_method": row.get("payment_method"),
                    "paid": bool(row.get("paid")),
                    "status": display_status,
                    "address": {
                        "address_id": row.get("address_id"),
                        "label": row.get("address_type"),
                        "house_apartment_no": row.get("house_apartment_no"),
                        "written_address": row.get("written_address"),
                        "city": row.get("city"),
                        "pin_code": row.get("pin_code"),
                    },
                }
            )

        updated_rows = _bulk_update_order_status_for_date(
            cursor,
            parsed_date.isoformat(),
            target_city,
            ORDER_STATUS_ON_THE_WAY,
            updatable_statuses,
        )
        db.commit()

        routes_payload = []
        for route, orders in route_groups.items():
            total_amount = sum(order["total_price"] for order in orders)
            routes_payload.append(
                {
                    "route": route,
                    "total_orders": len(orders),
                    "total_amount": total_amount,
                    "orders": orders,
                }
            )

        return {
            "date": parsed_date.isoformat(),
            "city_code": target_city,
            "routes": routes_payload,
            "status_updates": updated_rows,
            "generated_at": datetime.utcnow().isoformat() + "Z",
        }
    finally:
        cursor.close()
        db.close()


@app.get("/api/production/orders-summary", tags=["Production"])
def get_production_orders_summary(
    date: str,
    menu_type: Optional[str] = Query(None, description="BLD type to filter (Breakfast/Lunch/Dinner/Condiments)"),
    period_type: Optional[str] = Query("one_day", description="Menu period to filter, e.g., one_day or subscription"),
    city_code: Optional[str] = Query(None, alias="city_code"),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        normalized_period = None if period_type == "festivals" else period_type
        resolved_city = _resolve_city_context(city_code, user)

        where_clauses = [
            "m.date = %s",
            "((m.period_type IS NULL AND %s IS NULL) OR m.period_type = %s)",
            "m.city_code = %s",
        ]
        clause_params: List[Any] = [date, normalized_period, normalized_period, resolved_city]

        if menu_type:
            where_clauses.append("LOWER(b.bld_type) = LOWER(%s)")
            clause_params.append(menu_type)

        query = f"""
            WITH order_totals AS (
                SELECT
                    oi.item_id,
                    SUM(oi.quantity) AS quantity
                FROM orders o
                JOIN order_items oi ON oi.order_id = o.order_id
                JOIN addresses a ON o.address_id = a.address_id
                WHERE DATE(o.created_at) = %s
                  AND a.city_code = %s
                  AND LOWER(REPLACE(COALESCE(o.status, ''), ' (Payment Due)', '')) NOT IN (
                    'cancelled',
                    'cancelled by customer',
                    'cancelled by admin'
                  )
                GROUP BY oi.item_id
            )
            SELECT
                b.bld_type AS menu_type,
                i.item_id,
                i.name AS item_name,
                COALESCE(ot.quantity, 0) AS order_quantity
            FROM menu m
            JOIN bld b ON m.bld_id = b.bld_id
            JOIN menu_items mi ON m.menu_id = mi.menu_id
            JOIN items i ON mi.item_id = i.item_id
            LEFT JOIN order_totals ot ON ot.item_id = mi.item_id
            WHERE {" AND ".join(where_clauses)}
            ORDER BY b.bld_type, i.name
        """

        summary_params = [date, resolved_city, *clause_params]
        cursor.execute(query, summary_params)
        rows = cursor.fetchall() or []

        return {
            "date": date,
            "menu_type": menu_type,
            "period_type": period_type,
            "orders": [
                {
                    "menu_type": row.get("menu_type"),
                    "item_id": row.get("item_id"),
                    "item_name": row.get("item_name"),
                    "order_quantity": float(row.get("order_quantity") or 0),
                }
                for row in rows
            ],
        }
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.get("/api/menu", tags=["Daily Menu"])
def get_daily_menu(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD"),
    bld_type: Optional[str] = Query(None, description="BLD type: Breakfast, Lunch, Dinner, Condiments"),
    period_type: Optional[str] = Query(
        None, description="Period type: one_day, subscription, all_days, or null for festivals"
    ),
    city_code: Optional[str] = Query(None, alias="city_code"),
    menu_type: Optional[str] = Query(MENU_TYPE_ONE_DAY, alias="menu_type"),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
):
    resolved_city = _resolve_city_context(city_code, user)
    resolved_menu_type = normalize_menu_type(menu_type)
    target_bld_type = bld_type or CONDIMENTS_BLD_TYPE
    if resolved_menu_type == MENU_TYPE_ONE_DAY and not date:
        raise HTTPException(status_code=400, detail="date is required for ONE_DAY menus")
    if resolved_menu_type == MENU_TYPE_CONDIMENTS and not bld_type:
        target_bld_type = CONDIMENTS_BLD_TYPE
    ensure_menu_allowed(resolved_city, resolved_menu_type)
    return _get_daily_menu_internal(date, target_bld_type, period_type, resolved_city, resolved_menu_type)

@app.post("/api/orders/create", tags=["Orders"])
def create_order(payload: CreateOrderPayload):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must include at least one item")

    db = get_db()
    cursor = db.cursor()
    try:
        address_id = payload.address_id if payload.address_id is not None else 0
        cursor.execute(
            "SELECT address_id FROM addresses WHERE address_id=%s AND customer_id=%s LIMIT 1",
            (address_id, payload.customer_id),
        )
        if cursor.fetchone() is None:
            cursor.execute(
                "SELECT address_id FROM addresses WHERE customer_id=%s AND is_default=1 LIMIT 1",
                (payload.customer_id,),
            )
            fallback = cursor.fetchone()
            if fallback is None:
                raise HTTPException(status_code=400, detail="No valid address found for customer")
            address_id = fallback[0]

        total_price = sum(item.price * item.quantity for item in payload.items)

        normalized_method = (payload.payment_method or "").strip()
        paid_flag = 1 if normalized_method.lower() in {"upi", "card", "online"} else 0
        initial_status = ORDER_STATUS_CONFIRMED if paid_flag else ORDER_STATUS_PENDING
        stored_status = initial_status if paid_flag else f"{initial_status} (Payment Due)"

        cursor.execute(
            """
            INSERT INTO orders (customer_id, address_id, total_price, payment_method, status, order_type, paid)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                payload.customer_id,
                address_id,
                float(total_price),
                payload.payment_method,
                stored_status,
                payload.order_type or "one_time",
                paid_flag,
            ),
        )
        order_id = cursor.lastrowid

        cursor.executemany(
            """
            INSERT INTO order_items (order_id, item_id, quantity, price)
            VALUES (%s, %s, %s, %s)
            """,
            [
            (order_id, item.item_id, item.quantity, float(item.price))
            for item in payload.items
        ],
        )

        for item in payload.items:
            if item.menu_item_id is not None:
                cursor.execute(
                    "UPDATE menu_items SET available_qty = GREATEST(available_qty - %s, 0) WHERE menu_item_id = %s",
                    (item.quantity, item.menu_item_id),
                )

        db.commit()

        return {
            "message": "Order placed successfully",
            "order_id": order_id,
            "total_price": float(total_price),
            "status": initial_status,
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.get("/api/customers/{customer_id}/orders", tags=["Customers"])
def list_customer_orders(customer_id: int, limit: int = Query(50, ge=1, le=200)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        try:
            cursor.execute(
                """
                SELECT o.order_id,
                       o.created_at,
                       o.total_price,
                       o.status,
                       o.paid,
                       o.payment_method,
                       o.order_type,
                       a.address_type,
                       a.written_address,
                       a.city,
                       a.pin_code
                  FROM orders o
                  JOIN addresses a ON o.address_id = a.address_id
                 WHERE o.customer_id = %s
                 ORDER BY o.created_at DESC, o.order_id DESC
                 LIMIT %s
                """,
                (customer_id, limit),
            )
        except mysql.connector.Error as err:
            if err.errno == errorcode.ER_BAD_FIELD_ERROR:
                cursor.execute(
                    """
                    SELECT o.order_id,
                           o.created_at,
                           o.total_price,
                           o.status,
                           o.paid,
                           o.payment_method,
                           NULL AS order_type,
                           a.address_type,
                           a.written_address,
                           a.city,
                           a.pin_code
                      FROM orders o
                      JOIN addresses a ON o.address_id = a.address_id
                     WHERE o.customer_id = %s
                     ORDER BY o.created_at DESC, o.order_id DESC
                     LIMIT %s
                    """,
                    (customer_id, limit),
                )
            else:
                raise
        orders = cursor.fetchall()
        if not orders:
            return []

        order_ids = [row["order_id"] for row in orders]
        placeholders = ",".join(["%s"] * len(order_ids))

        cursor.execute(
            f"""
            SELECT oi.order_id,
                   oi.quantity,
                   oi.price,
                   i.name AS item_name
              FROM order_items oi
              JOIN items i ON oi.item_id = i.item_id
             WHERE oi.order_id IN ({placeholders})
             ORDER BY oi.order_id ASC, oi.order_item_id ASC
            """,
            order_ids,
        )
        item_rows = cursor.fetchall()
        items_by_order: Dict[int, List[Dict[str, object]]] = {}
        for row in item_rows:
            order_id = row["order_id"]
            items_by_order.setdefault(order_id, []).append(
                {
                    "item_name": row.get("item_name") or "Item",
                    "quantity": int(row.get("quantity") or 0),
                    "price": float(row.get("price") or 0),
                }
            )

        result = []
        for order in orders:
            order_id = order["order_id"]
            created = order.get("created_at")
            paid_flag = bool(order.get("paid"))
            result.append(
                {
                    "order_id": order_id,
                    "created_at": created.isoformat() if created else None,
                    "total_price": float(order.get("total_price") or 0),
                    "status": format_status_with_payment(order.get("status"), paid_flag),
                    "payment_method": order.get("payment_method") or "Cash",
                    "paid": paid_flag,
                    "address": {
                        "label": order.get("address_type") or "Address",
                        "line": order.get("written_address") or "",
                        "city": order.get("city") or "",
                        "pin_code": order.get("pin_code") or "",
                    },
                    "items": items_by_order.get(order_id, []),
                    "order_type": order.get("order_type") or "one_time",
                }
            )

        return result
    finally:
        cursor.close()
        db.close()

@app.get("/api/production/status", tags=["Production"])
def get_production_plan_status(date: str):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT m.bld_id, b.bld_type,
                   MAX(mi.is_production_generated) AS is_generated
              FROM menu m
              JOIN menu_items mi ON m.menu_id = mi.menu_id
              JOIN bld b ON m.bld_id = b.bld_id
             WHERE m.date = %s
          GROUP BY m.bld_id, b.bld_type
            """,
            (date,),
        )
        rows = cursor.fetchall()
        return {
            "date": date,
            "status": [
                {"bld_id": r["bld_id"], "menu_type": r["bld_type"], "is_generated": bool(r["is_generated"])}
                for r in rows
            ],
        }
    finally:
        cursor.close()
        db.close()
