from calendar import month
from datetime import date, datetime, timedelta
import re
import mysql.connector
from mysql.connector import errorcode
from fastapi import FastAPI, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import Any, Dict, Iterable, List, Optional, Tuple, Set
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
    get_customer_count,  # Add this line
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
from .utils.combos import (
    ensure_category_exists,
    ensure_item_ids_exist,
    fetch_combo_detail,
    fetch_combos_with_items,
    normalize_combo_items,
)
from .utils.plated_items import (
    expand_plated_quantities,
    fetch_plated_item_detail,
    fetch_plated_items_with_components,
    normalize_plated_components,
)
from .city_config import (
    DEFAULT_CITY,
    CityCode,
    normalize_city_code,
    city_supports_food,
    city_supports_condiments,
)

# Guard against mysql-connector native C-extension segfaults seen on macOS.
_mysql_connect_original = mysql.connector.connect


def _mysql_connect_force_pure(*args, **kwargs):
    kwargs.setdefault("use_pure", True)
    return _mysql_connect_original(*args, **kwargs)


mysql.connector.connect = _mysql_connect_force_pure


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
        database="kk_v1",
        # Avoid native mysql-connector C-extension segfaults on some macOS setups.
        use_pure=True,
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
        {int(item_id) for item_id in (item.get("item_id") for item in items) if item_id is not None}
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


def get_combo_blds(cursor, combo_id: int) -> List[int]:
    cursor.execute(
        "SELECT bld_id FROM combo_bld_map WHERE combo_id = %s ORDER BY bld_id",
        (combo_id,),
    )
    rows = cursor.fetchall() or []
    return [value for value in (_row_value(row, "bld_id", 0) for row in rows) if value is not None]


def set_combo_blds(cursor, combo_id: int, bld_ids: List[int]) -> None:
    cursor.execute("DELETE FROM combo_bld_map WHERE combo_id = %s", (combo_id,))
    if not bld_ids:
        return
    values = [(combo_id, bld_id) for bld_id in bld_ids]
    cursor.executemany(
        "INSERT INTO combo_bld_map (combo_id, bld_id) VALUES (%s, %s)",
        values,
    )


def attach_combo_bld_ids(cursor, combos: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not combos:
        return combos

    combo_ids = sorted(
        {
            int(combo_id)
            for combo_id in (combo.get("combo_id") for combo in combos)
            if combo_id is not None
        }
    )
    if not combo_ids:
        for combo in combos:
            combo["bld_ids"] = []
        return combos

    placeholders = ", ".join(["%s"] * len(combo_ids))
    cursor.execute(
        f"""
        SELECT combo_id, bld_id
          FROM combo_bld_map
         WHERE combo_id IN ({placeholders})
         ORDER BY combo_id, bld_id
        """,
        tuple(combo_ids),
    )
    rows = cursor.fetchall() or []
    mapping: Dict[int, List[int]] = {}
    for row in rows:
        combo_id = _row_value(row, "combo_id", 0)
        bld_id = _row_value(row, "bld_id", 1)
        if combo_id is None or bld_id is None:
            continue
        mapping.setdefault(combo_id, []).append(bld_id)

    for combo in combos:
        raw_key = combo.get("combo_id")
        try:
            normalized_key = int(raw_key)
        except (TypeError, ValueError):
            normalized_key = None
        combo["bld_ids"] = mapping.get(normalized_key, []) if normalized_key is not None else []
    return combos


def _is_condiment_from_blds(bld_ids: Iterable[Any], condiments_bld_id: Optional[int]) -> bool:
    if condiments_bld_id is None:
        return False
    try:
        normalized = {int(bid) for bid in bld_ids or []}
    except (TypeError, ValueError):
        return False
    return condiments_bld_id in normalized


def _ensure_valid_meal_combination(
    bld_ids: Iterable[int], condiments_bld_id: Optional[int]
) -> None:
    if condiments_bld_id is None:
        return
    normalized = [int(bid) for bid in bld_ids or []]
    if not normalized:
        return
    has_condiments = condiments_bld_id in normalized
    has_other = any(bid != condiments_bld_id for bid in normalized)
    if has_condiments and has_other:
        raise HTTPException(
            status_code=400,
            detail="Condiment items cannot be assigned to breakfast/lunch/dinner meals",
        )


def _resolve_category_id_by_name(cursor, category_name: str) -> Optional[int]:
    cursor.execute(
        """
        SELECT category_id
          FROM categories
         WHERE LOWER(category_name) = LOWER(%s)
         LIMIT 1
        """,
        (category_name,),
    )
    row = cursor.fetchone()
    return _row_value(row, "category_id", 0) if row else None


def ensure_component_type_ids_exist(cursor, component_type_ids: Iterable[Any]) -> None:
    normalized = sorted(set(_normalize_int_list(component_type_ids)))
    if not normalized:
        return
    placeholders = ", ".join(["%s"] * len(normalized))
    cursor.execute(
        f"""
        SELECT component_type_id
          FROM component_types
         WHERE component_type_id IN ({placeholders})
        """,
        tuple(normalized),
    )
    rows = cursor.fetchall() or []
    existing = {
        value
        for value in (_row_value(row, "component_type_id", 0) for row in rows)
        if value is not None
    }
    missing = [
        component_type_id for component_type_id in normalized if component_type_id not in existing
    ]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown component_type_id values: {missing}",
        )


def _ensure_component_type_required_for_item(
    *,
    is_condiment_item: bool,
    component_type_id: Optional[int],
) -> None:
    if is_condiment_item:
        return
    if component_type_id is None:
        raise HTTPException(
            status_code=400,
            detail="component_type_id is required for non-condiment items",
        )


def _build_item_detail_columns(available_columns: Set[str]) -> List[str]:
    def col(field: str, alias: Optional[str] = None, default: str = "NULL") -> str:
        target = alias or field
        return f"i.{field}" if field in available_columns else f"{default} AS {target}"

    columns = [
        "i.item_id",
        "i.name",
        col("description"),
        col("alias"),
        col("category_id"),
        "c.category_name",
        col("component_type_id"),
        "ct.name AS component_type_name",
        col("uom_customer"),
        col("uom_customer", alias="uom"),
        col("unit_packing"),
        col("uom_packing"),
        col("hsn_code"),
        col("uom_production"),
        col("packing_to_production_rate"),
        col("buffer_percentage"),
    ]

    has_meal_specific_max = {
        "max_qty_breakfast",
        "max_qty_lunch",
        "max_qty_dinner",
    }.issubset(available_columns)
    has_legacy_max = "max_qty" in available_columns

    if has_meal_specific_max:
        columns.extend(
            [
                "i.max_qty_breakfast",
                "i.max_qty_lunch",
                "i.max_qty_dinner",
            ]
        )
    elif has_legacy_max:
        columns.extend(
            [
                "i.max_qty AS max_qty_breakfast",
                "i.max_qty AS max_qty_lunch",
                "i.max_qty AS max_qty_dinner",
            ]
        )
    else:
        columns.extend(
            [
                "NULL AS max_qty_breakfast",
                "NULL AS max_qty_lunch",
                "NULL AS max_qty_dinner",
            ]
        )

    if "max_qty_condiments" in available_columns:
        columns.append("i.max_qty_condiments")
    elif has_meal_specific_max:
        columns.append("i.max_qty_dinner AS max_qty_condiments")
    elif has_legacy_max:
        columns.append("i.max_qty AS max_qty_condiments")
    else:
        columns.append("NULL AS max_qty_condiments")

    columns.extend(
        [
            col("picture_url"),
            col("breakfast_price"),
            col("lunch_price"),
            col("dinner_price"),
            col("condiments_price"),
            col("festival_price"),
            col("cgst"),
            col("sgst"),
            col("igst"),
            col("net_price"),
        ]
    )

    columns.append(col("is_combo", default="0"))
    return columns


def _fetch_item_detail(
    cursor, item_id: int, available_columns: Set[str]
) -> Optional[Dict[str, Any]]:
    select_columns = _build_item_detail_columns(available_columns)
    select_sql = ",\n                ".join(select_columns)
    cursor.execute(
        f"""
        SELECT
            {select_sql}
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.category_id
        LEFT JOIN component_types ct ON i.component_type_id = ct.component_type_id
        WHERE i.item_id = %s
        """,
        (item_id,),
    )
    return cursor.fetchone()


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


def attach_plated_flags(cursor, items: List[Dict[str, Any]]) -> None:
    item_ids = [int(item.get("item_id")) for item in items if item.get("item_id") is not None]
    if not item_ids:
        return
    placeholders = ", ".join(["%s"] * len(item_ids))
    cursor.execute(
        f"SELECT item_id FROM plated_items WHERE item_id IN ({placeholders})",
        tuple(item_ids),
    )
    plated_ids = {
        int(row["item_id"]) for row in (cursor.fetchall() or []) if row.get("item_id") is not None
    }
    for item in items:
        item_id = item.get("item_id")
        item["is_plated"] = bool(item_id in plated_ids if item_id is not None else False)


from .config import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_TTL_SEC,
    REFRESH_TOKEN_TTL_SEC,
    COOKIE_SECURE,
    COOKIE_SAMESITE,
    COOKIE_DOMAIN,
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

        # Ensure date is nullable
        cursor.execute("SHOW COLUMNS FROM menu LIKE 'date'")
        row = cursor.fetchone()
        # row format: (Field, Type, Null, Key, Default, Extra)
        if row and row[2] == "NO":
            cursor.execute("ALTER TABLE menu MODIFY date DATE NULL")
            db.commit()

        _MENU_HAS_TYPE_COLUMN = True
    finally:
        cursor.close()


def default_delivers_by_for_meal(canonical_bld_type: str) -> Optional[str]:
    if canonical_bld_type == "Breakfast":
        return "8:30 AM"
    if canonical_bld_type == "Lunch":
        return "1:00 PM"
    if canonical_bld_type == "Dinner":
        return "8:30 PM"
    return None


def resolve_delivers_by_value(
    canonical_bld_type: str, override_value: Optional[str]
) -> Optional[str]:
    if override_value is not None:
        value = override_value.strip()
        return value or None
    return default_delivers_by_for_meal(canonical_bld_type)


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
    normalized_previous = sorted({status.lower() for status in allowed_previous_statuses if status})
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
        raise HTTPException(
            status_code=400, detail="This city does not support condiments menus yet."
        )


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
        role_codes = [detail.get("code") for detail in role_details if detail.get("code")]
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
                if len(password) < 8:
                    raise HTTPException(
                        status_code=400,
                        detail="Admin password must be at least 8 characters",
                    )
                has_letter = any(c.isalpha() for c in password)
                has_digit = any(c.isdigit() for c in password)
                if not has_letter or not has_digit:
                    raise HTTPException(
                        status_code=400,
                        detail="Admin password must contain at least one letter and one number",
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


def get_current_user(
    request: Request, creds: HTTPAuthorizationCredentials | None = Depends(bearer)
):
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
    request: Request, creds: HTTPAuthorizationCredentials | None = Depends(bearer)
):
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


def admin_required(user=Depends(get_current_user)):
    if not user or not _user_has_role(user, ADMIN_ROLE_CODE):
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def developer_required(user=Depends(get_current_user)):
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
        cursor.execute(
            """
            INSERT INTO customers (referred_by, primary_mobile, alternative_mobile, name, recipient_name, payment_frequency, email)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
            (
                user.referred_by,
                user.primary_mobile,
                user.alternative_mobile,
                user.name,
                user.recipient_name,
                user.payment_frequency,
                user.email,
            ),
        )

        customer_id = cursor.lastrowid

        # Insert into addresses
        cursor.execute(
            """
            INSERT INTO addresses (customer_id, house_apartment_no, written_address, city, city_code, pin_code, latitude, longitude, address_type, route_assignment, is_default)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
            (
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
            ),
        )

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
            raise HTTPException(
                status_code=400,
                detail="Mobile number already exists! Please login instead.",
            )

        # Insert customer details
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

        customer_id = cursor.lastrowid  # Get inserted customer ID

        # Insert address details with address_type from dropdown and is_default set to True
        cursor.execute(
            """
            INSERT INTO addresses (customer_id, house_apartment_no, written_address, city, city_code, pin_code, latitude, longitude, address_type, route_assignment, is_default)
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
                data.route_assignment,
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
        db.close()


# Login
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


# --- LOGIN: set HTTP-only cookies + return tokens in JSON body ---
@app.post("/api/login")
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

        # Set HTTP-only cookies so Next.js middleware and SSR requests can
        # authenticate without accessing JavaScript-visible storage.
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


# ─────────────────────────────────────────────────────────────────────────────
# RBAC MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────


@app.get("/api/rbac/roles")
def list_roles(user=Depends(admin_required)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        ensure_default_roles(cursor)
        cursor.execute("""
            SELECT role_id, code, name, description, is_system, created_at
            FROM roles
            ORDER BY name ASC
            """)
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
def create_role(payload: RoleCreateRequest, user=Depends(admin_required)):
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
def update_role(role_id: int, payload: RoleUpdateRequest, user=Depends(admin_required)):
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
def delete_role(role_id: int, user=Depends(admin_required)):
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
def list_team_members(user=Depends(admin_required)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT customer_id, name, primary_mobile, email, roles, admin_is_active, admin_password_hash, created_at
            FROM customers
            WHERE roles IS NOT NULL
            ORDER BY name ASC
            """)
        rows = cursor.fetchall()
        members = hydrate_team_members(db, rows)
        return {"team_members": members}
    finally:
        cursor.close()
        db.close()


@app.post("/api/rbac/team-members")
def create_team_member(payload: TeamMemberCreateRequest, user=Depends(admin_required)):
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
    user=Depends(admin_required),
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
async def refresh(
    request: Request,
    response: Response,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
):
    """Issue a new access token (and rotate the refresh token) given a valid refresh token.

    Token lookup order:
    1. HTTP-only ``refresh_token`` cookie (preferred — set by login endpoint).
    2. ``Authorization: Bearer <token>`` header (client-side fallback).
    3. JSON body ``{"refresh_token": "..."}`` (legacy fallback).

    On success, sets a fresh access-token cookie and rotates the refresh-token
    cookie so each refresh window is single-use from the browser's perspective.
    The new tokens are also returned in the JSON body for localStorage consumers.

    Args:
        request: FastAPI request object.
        response: FastAPI response object used to set cookies.
        creds: Optional Bearer credentials from the Authorization header.

    Returns:
        JSON with new ``access_token`` and ``refresh_token``.
    """
    # Prefer the HTTP-only cookie set by the login endpoint.
    token = request.cookies.get("refresh_token")

    # Fallback: Authorization: Bearer <refresh_token>
    if not token and creds and creds.scheme.lower() == "bearer":
        token = creds.credentials

    # Fallback: JSON body {"refresh_token": "..."}
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
    # Rotate the refresh token so each refresh window issues a fresh token.
    new_refresh = create_refresh_token(sub, str(uuid.uuid4()))

    set_cookie(response, "access_token", new_access, ACCESS_TOKEN_TTL_SEC)
    set_cookie(response, "refresh_token", new_refresh, REFRESH_TOKEN_TTL_SEC)

    return {"access_token": new_access, "refresh_token": new_refresh}


@app.post("/auth/logout")
def logout(response: Response):
    clear_cookie(response, "access_token")
    clear_cookie(response, "refresh_token")
    return {"ok": True}


@app.get("/auth/me")
def me(user=Depends(get_current_user)):
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
    user=Depends(developer_required),
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
    component_type_id: Optional[int] = None
    uom_customer: Optional[str] = None
    unit_packing: Optional[float] = None
    uom_packing: Optional[str] = None
    hsn_code: Optional[str] = None
    uom_production: Optional[str] = None
    packing_to_production_rate: Optional[float] = None
    buffer_percentage: Optional[float] = None
    max_qty_breakfast: Optional[int] = None
    max_qty_lunch: Optional[int] = None
    max_qty_dinner: Optional[int] = None
    max_qty_condiments: Optional[int] = None
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


class ItemCreatePayload(BaseModel):
    name: str
    uom_customer: str
    bld_ids: List[int]
    description: Optional[str] = None
    alias: Optional[str] = None
    category_id: Optional[int] = None
    component_type_id: Optional[int] = None
    unit_packing: Optional[float] = None
    uom_packing: Optional[str] = None
    hsn_code: Optional[str] = None
    uom_production: Optional[str] = None
    packing_to_production_rate: Optional[float] = None
    buffer_percentage: Optional[float] = None
    max_qty_breakfast: Optional[int] = None
    max_qty_lunch: Optional[int] = None
    max_qty_dinner: Optional[int] = None
    max_qty_condiments: Optional[int] = None
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


class ComboItemPayload(BaseModel):
    item_id: Optional[int] = None
    component_type_id: Optional[int] = None
    quantity: int = Field(1, ge=1)


class ComboCreatePayload(BaseModel):
    combo_name: str
    price: float = Field(ge=0)
    category_id: int
    bld_ids: List[int] = Field(default_factory=list)
    items: List[ComboItemPayload] = Field(default_factory=list)


class ComboUpdatePayload(BaseModel):
    combo_name: Optional[str] = None
    price: Optional[float] = Field(default=None, ge=0)
    category_id: Optional[int] = None
    bld_ids: Optional[List[int]] = None
    items: Optional[List[ComboItemPayload]] = None


class PlatedItemComponentPayload(BaseModel):
    item_id: Optional[int] = None
    component_type_id: Optional[int] = None
    quantity: float = Field(1, gt=0)


class PlatedItemCreatePayload(BaseModel):
    name: str
    uom_customer: str
    bld_ids: List[int]
    components: List[PlatedItemComponentPayload] = Field(default_factory=list)
    description: Optional[str] = None
    alias: Optional[str] = None
    category_id: Optional[int] = None
    unit_packing: Optional[float] = None
    uom_packing: Optional[str] = None
    hsn_code: Optional[str] = None
    uom_production: Optional[str] = None
    packing_to_production_rate: Optional[float] = None
    buffer_percentage: Optional[float] = None
    max_qty_breakfast: Optional[int] = None
    max_qty_lunch: Optional[int] = None
    max_qty_dinner: Optional[int] = None
    max_qty_condiments: Optional[int] = None
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


class PlatedItemUpdatePayload(BaseModel):
    name: Optional[str] = None
    uom_customer: Optional[str] = None
    bld_ids: Optional[List[int]] = None
    components: Optional[List[PlatedItemComponentPayload]] = None
    description: Optional[str] = None
    alias: Optional[str] = None
    category_id: Optional[int] = None
    unit_packing: Optional[float] = None
    uom_packing: Optional[str] = None
    hsn_code: Optional[str] = None
    uom_production: Optional[str] = None
    packing_to_production_rate: Optional[float] = None
    buffer_percentage: Optional[float] = None
    max_qty_breakfast: Optional[int] = None
    max_qty_lunch: Optional[int] = None
    max_qty_dinner: Optional[int] = None
    max_qty_condiments: Optional[int] = None
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


class PlatedExpansionLineItemPayload(BaseModel):
    item_id: int
    quantity: float = Field(1, gt=0)


class PlatedExpansionPreviewPayload(BaseModel):
    items: List[PlatedExpansionLineItemPayload] = Field(default_factory=list)


class CategoryCreatePayload(BaseModel):
    category_name: str = Field(..., min_length=1, max_length=100)


class CategoryUpdatePayload(BaseModel):
    category_name: str = Field(..., min_length=1, max_length=100)


class ComponentTypeCreatePayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class ComponentTypeUpdatePayload(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


def _normalize_item_payload_data(
    data: Dict[str, Any],
) -> Dict[str, Any]:
    string_fields = {
        "name",
        "description",
        "alias",
        "uom_customer",
        "uom_packing",
        "hsn_code",
        "uom_production",
        "picture_url",
    }
    nullable_string_fields = {
        "description",
        "alias",
        "uom_packing",
        "hsn_code",
        "uom_production",
        "picture_url",
    }
    int_fields = {
        "category_id",
        "component_type_id",
        "max_qty_breakfast",
        "max_qty_lunch",
        "max_qty_dinner",
        "max_qty_condiments",
    }
    float_fields = {
        "unit_packing",
        "packing_to_production_rate",
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
    bool_fields = {"is_combo"}

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
    return cleaned


def _item_column_field_map(available_columns: Set[str]) -> Dict[str, str]:
    field_map = {
        "name": "name",
        "description": "description",
        "alias": "alias",
        "category_id": "category_id",
        "component_type_id": "component_type_id",
        "uom_customer": "uom_customer",
        "unit_packing": "unit_packing",
        "uom_packing": "uom_packing",
        "hsn_code": "hsn_code",
        "uom_production": "uom_production",
        "packing_to_production_rate": "packing_to_production_rate",
        "buffer_percentage": "buffer_percentage",
        "max_qty_breakfast": "max_qty_breakfast",
        "max_qty_lunch": "max_qty_lunch",
        "max_qty_dinner": "max_qty_dinner",
        "max_qty_condiments": "max_qty_condiments",
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
    }
    return {field: column for field, column in field_map.items() if column in available_columns}


@app.get("/api/products/items", tags=["Products"])
def get_all_items(
    only_condiments: Optional[bool] = Query(
        None,
        description="When true, returns only condiment items",
        alias="only_condiments",
    ),
    include_plated: Optional[bool] = Query(
        False,
        description="When true, includes plated items in the items response",
        alias="include_plated",
    ),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SHOW COLUMNS FROM items")
        available_columns = {row["Field"] for row in cursor.fetchall()}
        try:
            condiments_bld_id = resolve_bld_id(cursor, CONDIMENTS_BLD_TYPE)
        except HTTPException:
            condiments_bld_id = None
        try:
            condiments_bld_id = resolve_bld_id(cursor, CONDIMENTS_BLD_TYPE)
        except HTTPException:
            condiments_bld_id = None

        has_meal_specific_max = {
            "max_qty_breakfast",
            "max_qty_lunch",
            "max_qty_dinner",
        }.issubset(available_columns)
        has_legacy_max = "max_qty" in available_columns
        has_condiment_max = "max_qty_condiments" in available_columns

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

        if has_condiment_max:
            max_columns_sql.append("i.max_qty_condiments")
        elif has_meal_specific_max:
            max_columns_sql.append("i.max_qty_dinner AS max_qty_condiments")
        elif has_legacy_max:
            max_columns_sql.append("i.max_qty AS max_qty_condiments")
        else:
            max_columns_sql.append("NULL AS max_qty_condiments")

        select_columns = [
            "i.item_id",
            "i.name",
            "i.description",
            "i.alias",
            "i.category_id",
            "c.category_name",
            "i.component_type_id",
            "ct.name AS component_type_name",
            "i.uom_customer",
            "i.uom_customer AS uom",
            "i.unit_packing",
            "i.uom_packing",
            "i.hsn_code",
            "i.uom_production",
            "i.packing_to_production_rate",
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
        ]

        select_sql = ",\n                    ".join(select_columns)
        cursor.execute(f"""
                SELECT 
                    {select_sql}
                FROM items i
                LEFT JOIN categories c ON i.category_id = c.category_id
                LEFT JOIN component_types ct ON i.component_type_id = ct.component_type_id
            """)
        records = cursor.fetchall()

        attach_bld_ids(cursor, records)
        attach_plated_flags(cursor, records)
        normalized_records = []
        try:
            condiments_bld_id = resolve_bld_id(cursor, CONDIMENTS_BLD_TYPE)
        except HTTPException:
            condiments_bld_id = None
        for row in records:
            row["is_condiment"] = _is_condiment_from_blds(row.get("bld_ids"), condiments_bld_id)
            if row.get("is_plated") and not include_plated:
                continue
            if only_condiments and not row["is_condiment"]:
                continue
            normalized_records.append(row)
        return normalized_records
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.post("/api/products/items", tags=["Products"])
def create_item(payload: ItemCreatePayload, user: Dict[str, Any] = Depends(admin_required)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SHOW COLUMNS FROM items")
        available_columns = {row["Field"] for row in cursor.fetchall()}

        data = payload.model_dump()
        raw_bld_ids = data.pop("bld_ids", [])
        normalized_bld_ids = _validate_bld_ids(cursor, raw_bld_ids)

        string_fields = {
            "name",
            "description",
            "alias",
            "uom_customer",
            "uom_packing",
            "hsn_code",
            "uom_production",
            "picture_url",
        }
        nullable_string_fields = {
            "description",
            "alias",
            "uom_packing",
            "hsn_code",
            "uom_production",
            "picture_url",
        }
        int_fields = {
            "category_id",
            "component_type_id",
            "max_qty_breakfast",
            "max_qty_lunch",
            "max_qty_dinner",
            "max_qty_condiments",
        }
        float_fields = {
            "unit_packing",
            "packing_to_production_rate",
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
        bool_fields = {"is_combo"}

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

        if not cleaned.get("name"):
            raise HTTPException(status_code=400, detail="name is required")
        if not cleaned.get("uom_customer"):
            raise HTTPException(status_code=400, detail="uom_customer is required")

        try:
            condiments_bld_id = resolve_bld_id(cursor, CONDIMENTS_BLD_TYPE)
        except HTTPException:
            condiments_bld_id = None
        is_condiment_item = _is_condiment_from_blds(normalized_bld_ids, condiments_bld_id)
        _ensure_valid_meal_combination(normalized_bld_ids, condiments_bld_id)

        _ensure_valid_meal_combination(normalized_bld_ids, condiments_bld_id)

        if is_condiment_item and not cleaned.get("category_id"):
            snacks_category_id = _resolve_category_id_by_name(cursor, "Snacks")
            if snacks_category_id is not None:
                cleaned["category_id"] = snacks_category_id

        _ensure_component_type_required_for_item(
            is_condiment_item=is_condiment_item,
            component_type_id=cleaned.get("component_type_id"),
        )

        if cleaned.get("component_type_id") is not None:
            ensure_component_type_ids_exist(cursor, [cleaned.get("component_type_id")])

        if not normalized_bld_ids:
            raise HTTPException(status_code=400, detail="At least one meal assignment is required")

        field_map = {
            "name": "name",
            "description": "description",
            "alias": "alias",
            "category_id": "category_id",
            "component_type_id": "component_type_id",
            "uom_customer": "uom_customer",
            "unit_packing": "unit_packing",
            "uom_packing": "uom_packing",
            "hsn_code": "hsn_code",
            "uom_production": "uom_production",
            "packing_to_production_rate": "packing_to_production_rate",
            "buffer_percentage": "buffer_percentage",
            "max_qty_breakfast": "max_qty_breakfast",
            "max_qty_lunch": "max_qty_lunch",
            "max_qty_dinner": "max_qty_dinner",
            "max_qty_condiments": "max_qty_condiments",
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
        }

        field_map = {
            field: column for field, column in field_map.items() if column in available_columns
        }

        columns: List[str] = []
        placeholders: List[str] = []
        values: List[Any] = []

        for field, column in field_map.items():
            if field not in cleaned:
                continue
            columns.append(column)
            placeholders.append("%s")
            values.append(cleaned[field])

        insert_query = (
            f"INSERT INTO items ({', '.join(columns)}) VALUES ({', '.join(placeholders)})"
        )
        cursor.execute(insert_query, values)
        item_id = cursor.lastrowid

        set_item_blds(cursor, item_id, normalized_bld_ids)

        created_item = _fetch_item_detail(cursor, item_id, available_columns)
        if created_item:
            created_item["bld_ids"] = get_item_blds(cursor, item_id)
            created_item["is_combo"] = bool(created_item.get("is_combo", False))
            created_item["is_condiment"] = _is_condiment_from_blds(
                created_item.get("bld_ids"), condiments_bld_id
            )

        db.commit()
        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="ADD",
            entity_type="ITEM",
            entity_id=item_id,
            description=f"Created item {item_id}",
        )

        return {
            "success": True,
            "item_id": item_id,
            "item": created_item,
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.put("/api/products/items/{item_id}", tags=["Products"])
def update_item(
    item_id: int,
    payload: ItemUpdatePayload,
    user: Dict[str, Any] = Depends(admin_required),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SHOW COLUMNS FROM items")
        available_columns = {row["Field"] for row in cursor.fetchall()}

        cursor.execute(
            "SELECT item_id, component_type_id FROM items WHERE item_id = %s", (item_id,)
        )
        existing_item = cursor.fetchone()
        if not existing_item:
            raise HTTPException(status_code=404, detail="Item not found")

        data = payload.model_dump(exclude_unset=True)
        raw_bld_ids = data.pop("bld_ids", [])
        normalized_bld_ids = _validate_bld_ids(cursor, raw_bld_ids)

        string_fields = {
            "name",
            "description",
            "alias",
            "uom_customer",
            "uom_packing",
            "hsn_code",
            "uom_production",
            "picture_url",
        }
        nullable_string_fields = {
            "description",
            "alias",
            "uom_packing",
            "hsn_code",
            "uom_production",
            "picture_url",
        }
        int_fields = {
            "category_id",
            "component_type_id",
            "max_qty_breakfast",
            "max_qty_lunch",
            "max_qty_dinner",
            "max_qty_condiments",
        }
        float_fields = {
            "unit_packing",
            "packing_to_production_rate",
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
        bool_fields = {"is_combo"}

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

        is_condiment_item = _is_condiment_from_blds(
            (
                normalized_bld_ids
                if "bld_ids" in payload.model_fields_set
                else get_item_blds(cursor, item_id)
            ),
            condiments_bld_id,
        )
        if is_condiment_item and not cleaned.get("category_id"):
            snacks_category_id = _resolve_category_id_by_name(cursor, "Snacks")
            if snacks_category_id is not None:
                cleaned["category_id"] = snacks_category_id

        effective_component_type_id = (
            cleaned.get("component_type_id")
            if "component_type_id" in cleaned
            else existing_item.get("component_type_id")
        )
        _ensure_component_type_required_for_item(
            is_condiment_item=is_condiment_item,
            component_type_id=effective_component_type_id,
        )

        if cleaned.get("component_type_id") is not None:
            ensure_component_type_ids_exist(cursor, [cleaned.get("component_type_id")])

        field_map = {
            "name": "name",
            "description": "description",
            "alias": "alias",
            "category_id": "category_id",
            "component_type_id": "component_type_id",
            "uom_customer": "uom_customer",
            "unit_packing": "unit_packing",
            "uom_packing": "uom_packing",
            "hsn_code": "hsn_code",
            "uom_production": "uom_production",
            "packing_to_production_rate": "packing_to_production_rate",
            "buffer_percentage": "buffer_percentage",
            "max_qty_breakfast": "max_qty_breakfast",
            "max_qty_lunch": "max_qty_lunch",
            "max_qty_dinner": "max_qty_dinner",
            "max_qty_condiments": "max_qty_condiments",
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
        }

        field_map = {
            field: column for field, column in field_map.items() if column in available_columns
        }

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

        updated_item = _fetch_item_detail(cursor, item_id, available_columns)

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
            return {
                "success": True,
                "item_id": item_id,
                "updated_fields": updated_fields,
            }

        updated_item["is_combo"] = bool(updated_item.get("is_combo", False))
        updated_item["is_condiment"] = _is_condiment_from_blds(
            updated_item.get("bld_ids"), condiments_bld_id
        )

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
        combos = fetch_combos_with_items(cursor)
        attach_combo_bld_ids(cursor, combos)
        return combos
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.post("/api/products/combos", tags=["Products"])
def create_combo(payload: ComboCreatePayload, user: Dict[str, Any] = Depends(admin_required)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        normalized_name = payload.combo_name.strip()
        if not normalized_name:
            raise HTTPException(status_code=400, detail="combo_name is required")
        normalized_bld_ids = _validate_bld_ids(cursor, payload.bld_ids)
        if not normalized_bld_ids:
            raise HTTPException(status_code=400, detail="At least one meal assignment is required")
        try:
            condiments_bld_id = resolve_bld_id(cursor, CONDIMENTS_BLD_TYPE)
        except HTTPException:
            condiments_bld_id = None
        _ensure_valid_meal_combination(normalized_bld_ids, condiments_bld_id)
        ensure_category_exists(cursor, payload.category_id)
        normalized_items = normalize_combo_items(payload.items)
        ensure_item_ids_exist(
            cursor,
            (item["item_id"] for item in normalized_items if item.get("item_id") is not None),
        )
        ensure_component_type_ids_exist(
            cursor,
            (
                item["component_type_id"]
                for item in normalized_items
                if item.get("component_type_id") is not None
            ),
        )

        cursor.execute(
            "INSERT INTO combos (combo_name, price, category_id) VALUES (%s, %s, %s)",
            (normalized_name, float(payload.price), payload.category_id),
        )
        combo_id = cursor.lastrowid

        if normalized_items:
            values = [
                (combo_id, entry.get("item_id"), entry.get("component_type_id"), entry["quantity"])
                for entry in normalized_items
            ]
            cursor.executemany(
                "INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity) VALUES (%s, %s, %s, %s)",
                values,
            )

        set_combo_blds(cursor, combo_id, normalized_bld_ids)

        db.commit()

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="ADD",
            entity_type="COMBO",
            entity_id=combo_id,
            description=f"Created combo {combo_id}",
        )

        combo = fetch_combo_detail(cursor, combo_id)
        if combo:
            combo["bld_ids"] = get_combo_blds(cursor, combo_id)
        return combo or {"combo_id": combo_id}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.put("/api/products/combos/{combo_id}", tags=["Products"])
def update_combo(
    combo_id: int,
    payload: ComboUpdatePayload,
    user: Dict[str, Any] = Depends(admin_required),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT 1 FROM combos WHERE combo_id = %s", (combo_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Combo not found")

        fields: List[str] = []
        values: List[Any] = []

        if payload.combo_name is not None:
            normalized_name = payload.combo_name.strip()
            if not normalized_name:
                raise HTTPException(status_code=400, detail="combo_name cannot be empty")
            fields.append("combo_name = %s")
            values.append(normalized_name)
        if payload.price is not None:
            fields.append("price = %s")
            values.append(float(payload.price))
        if payload.category_id is not None:
            ensure_category_exists(cursor, payload.category_id)
            fields.append("category_id = %s")
            values.append(payload.category_id)

        normalized_bld_ids = None
        if payload.bld_ids is not None:
            normalized_bld_ids = _validate_bld_ids(cursor, payload.bld_ids)
            if not normalized_bld_ids:
                raise HTTPException(
                    status_code=400, detail="At least one meal assignment is required"
                )
            try:
                condiments_bld_id = resolve_bld_id(cursor, CONDIMENTS_BLD_TYPE)
            except HTTPException:
                condiments_bld_id = None
            _ensure_valid_meal_combination(normalized_bld_ids, condiments_bld_id)

        if fields:
            values.append(combo_id)
            cursor.execute(
                f"UPDATE combos SET {', '.join(fields)} WHERE combo_id = %s",
                values,
            )

        if payload.items is not None:
            normalized_items = normalize_combo_items(payload.items)
            ensure_item_ids_exist(
                cursor,
                (item["item_id"] for item in normalized_items if item.get("item_id") is not None),
            )
            ensure_component_type_ids_exist(
                cursor,
                (
                    item["component_type_id"]
                    for item in normalized_items
                    if item.get("component_type_id") is not None
                ),
            )
            cursor.execute("DELETE FROM combo_items WHERE combo_id = %s", (combo_id,))
            values = [
                (combo_id, entry.get("item_id"), entry.get("component_type_id"), entry["quantity"])
                for entry in normalized_items
            ]
            cursor.executemany(
                "INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity) VALUES (%s, %s, %s, %s)",
                values,
            )

        if normalized_bld_ids is not None:
            set_combo_blds(cursor, combo_id, normalized_bld_ids)

        db.commit()

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="UPDATE",
            entity_type="COMBO",
            entity_id=combo_id,
            description=f"Updated combo {combo_id}",
        )

        combo = fetch_combo_detail(cursor, combo_id)
        if combo:
            combo["bld_ids"] = get_combo_blds(cursor, combo_id)
        return combo or {"combo_id": combo_id}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.delete("/api/products/combos/{combo_id}", tags=["Products"])
def delete_combo(combo_id: int, user: Dict[str, Any] = Depends(admin_required)):
    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute("SELECT 1 FROM combos WHERE combo_id = %s", (combo_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Combo not found")

        cursor.execute("DELETE FROM combos WHERE combo_id = %s", (combo_id,))
        db.commit()

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="DELETE",
            entity_type="COMBO",
            entity_id=combo_id,
            description=f"Deleted combo {combo_id}",
        )

        return {"status": "deleted", "combo_id": combo_id}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.get("/api/products/plated-items", tags=["Products"])
def get_all_plated_items():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        records = fetch_plated_items_with_components(cursor)
        attach_bld_ids(cursor, records)
        try:
            condiments_bld_id = resolve_bld_id(cursor, CONDIMENTS_BLD_TYPE)
        except HTTPException:
            condiments_bld_id = None
        for row in records:
            row["is_condiment"] = _is_condiment_from_blds(row.get("bld_ids"), condiments_bld_id)
        return records
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.post("/api/products/plated-items", tags=["Products"])
def create_plated_item(
    payload: PlatedItemCreatePayload,
    user: Dict[str, Any] = Depends(admin_required),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SHOW COLUMNS FROM items")
        available_columns = {row["Field"] for row in cursor.fetchall()}

        data = payload.model_dump()
        raw_bld_ids = data.pop("bld_ids", [])
        raw_components = data.pop("components", [])
        normalized_bld_ids = _validate_bld_ids(cursor, raw_bld_ids)
        normalized_components = normalize_plated_components(raw_components)
        ensure_item_ids_exist(
            cursor,
            (item["item_id"] for item in normalized_components if item.get("item_id") is not None),
        )
        ensure_component_type_ids_exist(
            cursor,
            (
                item["component_type_id"]
                for item in normalized_components
                if item.get("component_type_id") is not None
            ),
        )

        cleaned = _normalize_item_payload_data(data)
        cleaned["is_combo"] = 0

        if not cleaned.get("name"):
            raise HTTPException(status_code=400, detail="name is required")
        if not cleaned.get("uom_customer"):
            raise HTTPException(status_code=400, detail="uom_customer is required")
        if not normalized_bld_ids:
            raise HTTPException(status_code=400, detail="At least one meal assignment is required")

        try:
            condiments_bld_id = resolve_bld_id(cursor, CONDIMENTS_BLD_TYPE)
        except HTTPException:
            condiments_bld_id = None
        _ensure_valid_meal_combination(normalized_bld_ids, condiments_bld_id)

        field_map = _item_column_field_map(available_columns)
        columns: List[str] = []
        placeholders: List[str] = []
        values: List[Any] = []
        for field, column in field_map.items():
            if field not in cleaned:
                continue
            columns.append(column)
            placeholders.append("%s")
            values.append(cleaned[field])

        cursor.execute(
            f"INSERT INTO items ({', '.join(columns)}) VALUES ({', '.join(placeholders)})",
            values,
        )
        item_id = cursor.lastrowid
        set_item_blds(cursor, item_id, normalized_bld_ids)

        cursor.execute(
            "INSERT INTO plated_items (item_id) VALUES (%s)",
            (item_id,),
        )
        plated_item_id = cursor.lastrowid

        cursor.executemany(
            """
            INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity)
            VALUES (%s, %s, %s, %s)
            """,
            [
                (
                    plated_item_id,
                    component.get("item_id"),
                    component.get("component_type_id"),
                    component["quantity"],
                )
                for component in normalized_components
            ],
        )

        db.commit()

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="ADD",
            entity_type="ITEM",
            entity_id=item_id,
            description=f"Created plated item {item_id}",
        )

        plated_item = fetch_plated_item_detail(cursor, item_id)
        if plated_item:
            plated_item["bld_ids"] = get_item_blds(cursor, item_id)
            plated_item["is_condiment"] = _is_condiment_from_blds(
                plated_item.get("bld_ids"), condiments_bld_id
            )

        return {
            "success": True,
            "item_id": item_id,
            "item": plated_item,
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.put("/api/products/plated-items/{item_id}", tags=["Products"])
def update_plated_item(
    item_id: int,
    payload: PlatedItemUpdatePayload,
    user: Dict[str, Any] = Depends(admin_required),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SHOW COLUMNS FROM items")
        available_columns = {row["Field"] for row in cursor.fetchall()}
        cursor.execute(
            "SELECT plated_item_id FROM plated_items WHERE item_id = %s LIMIT 1",
            (item_id,),
        )
        plated_row = cursor.fetchone()
        if not plated_row:
            raise HTTPException(status_code=404, detail="Plated item not found")

        data = payload.model_dump(exclude_unset=True)
        raw_bld_ids = data.pop("bld_ids", None)
        raw_components = data.pop("components", None)
        normalized_bld_ids = (
            _validate_bld_ids(cursor, raw_bld_ids) if raw_bld_ids is not None else None
        )
        normalized_components = (
            normalize_plated_components(raw_components) if raw_components is not None else None
        )
        if normalized_components is not None:
            ensure_item_ids_exist(
                cursor,
                (
                    item["item_id"]
                    for item in normalized_components
                    if item.get("item_id") is not None
                ),
            )
            ensure_component_type_ids_exist(
                cursor,
                (
                    item["component_type_id"]
                    for item in normalized_components
                    if item.get("component_type_id") is not None
                ),
            )

        cleaned = _normalize_item_payload_data(data)
        field_map = _item_column_field_map(available_columns)

        assignments: List[str] = []
        values: List[Any] = []
        updated_fields: List[str] = []
        for field, column in field_map.items():
            if field not in cleaned:
                continue
            assignments.append(f"{column} = %s")
            values.append(cleaned[field])
            updated_fields.append(column)

        if assignments:
            values.append(item_id)
            cursor.execute(
                f"UPDATE items SET {', '.join(assignments)} WHERE item_id = %s",
                values,
            )

        try:
            condiments_bld_id = resolve_bld_id(cursor, CONDIMENTS_BLD_TYPE)
        except HTTPException:
            condiments_bld_id = None
        if normalized_bld_ids is not None:
            _ensure_valid_meal_combination(normalized_bld_ids, condiments_bld_id)
            set_item_blds(cursor, item_id, normalized_bld_ids)
            updated_fields.append("bld_ids")

        if normalized_components is not None:
            cursor.execute(
                "DELETE FROM plated_item_components WHERE plated_item_id = %s",
                (plated_row["plated_item_id"],),
            )
            cursor.executemany(
                """
                INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity)
                VALUES (%s, %s, %s, %s)
                """,
                [
                    (
                        plated_row["plated_item_id"],
                        component.get("item_id"),
                        component.get("component_type_id"),
                        component["quantity"],
                    )
                    for component in normalized_components
                ],
            )
            updated_fields.append("components")

        db.commit()

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="UPDATE",
            entity_type="ITEM",
            entity_id=item_id,
            description=f"Updated plated item {item_id}: {', '.join(updated_fields) if updated_fields else 'no fields'}",
        )

        plated_item = fetch_plated_item_detail(cursor, item_id)
        if plated_item:
            plated_item["bld_ids"] = get_item_blds(cursor, item_id)
            plated_item["is_condiment"] = _is_condiment_from_blds(
                plated_item.get("bld_ids"), condiments_bld_id
            )

        return {
            "success": True,
            "item": plated_item,
            "updated_fields": updated_fields,
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.delete("/api/products/plated-items/{item_id}", tags=["Products"])
def delete_plated_item(item_id: int, user: Dict[str, Any] = Depends(admin_required)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT plated_item_id FROM plated_items WHERE item_id = %s LIMIT 1",
            (item_id,),
        )
        plated_row = cursor.fetchone()
        if not plated_row:
            raise HTTPException(status_code=404, detail="Plated item not found")

        cursor.execute(
            "DELETE FROM plated_items WHERE plated_item_id = %s",
            (plated_row["plated_item_id"],),
        )
        cursor.execute("DELETE FROM items WHERE item_id = %s", (item_id,))

        db.commit()

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="DELETE",
            entity_type="ITEM",
            entity_id=item_id,
            description=f"Deleted plated item {item_id}",
        )

        return {"status": "deleted", "item_id": item_id}
    except mysql.connector.Error as err:
        db.rollback()
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


@app.post("/api/products/categories", tags=["Products"])
def create_category(payload: CategoryCreatePayload, user: Dict[str, Any] = Depends(admin_required)):
    db = get_db()
    cursor = db.cursor()
    try:
        normalized_name = payload.category_name.strip()
        if not normalized_name:
            raise HTTPException(status_code=400, detail="category_name is required")

        cursor.execute(
            "INSERT INTO categories (category_name) VALUES (%s)",
            (normalized_name,),
        )
        category_id = cursor.lastrowid
        db.commit()

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="ADD",
            entity_type="CATEGORY",
            entity_id=category_id,
            description=f"Created category {category_id}",
        )

        return {"category_id": category_id, "category_name": normalized_name}
    except mysql.connector.Error as err:
        db.rollback()
        if err.errno == errorcode.ER_DUP_ENTRY:
            raise HTTPException(status_code=400, detail="Category already exists")
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.put("/api/products/categories/{category_id}", tags=["Products"])
def update_category(
    category_id: int,
    payload: CategoryUpdatePayload,
    user: Dict[str, Any] = Depends(admin_required),
):
    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute("SELECT 1 FROM categories WHERE category_id = %s", (category_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Category not found")

        normalized_name = payload.category_name.strip()
        if not normalized_name:
            raise HTTPException(status_code=400, detail="category_name is required")

        cursor.execute(
            "UPDATE categories SET category_name = %s WHERE category_id = %s",
            (normalized_name, category_id),
        )
        db.commit()

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="UPDATE",
            entity_type="CATEGORY",
            entity_id=category_id,
            description=f"Updated category {category_id}",
        )

        return {"category_id": category_id, "category_name": normalized_name}
    except mysql.connector.Error as err:
        db.rollback()
        if err.errno == errorcode.ER_DUP_ENTRY:
            raise HTTPException(status_code=400, detail="Category already exists")
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.delete("/api/products/categories/{category_id}", tags=["Products"])
def delete_category(category_id: int, user: Dict[str, Any] = Depends(admin_required)):
    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute("SELECT 1 FROM categories WHERE category_id = %s", (category_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Category not found")

        cursor.execute("DELETE FROM categories WHERE category_id = %s", (category_id,))
        db.commit()

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="DELETE",
            entity_type="CATEGORY",
            entity_id=category_id,
            description=f"Deleted category {category_id}",
        )

        return {"status": "deleted", "category_id": category_id}
    except mysql.connector.Error as err:
        db.rollback()
        if (
            err.errno == errorcode.ER_ROW_IS_REFERENCED
            or err.errno == errorcode.ER_ROW_IS_REFERENCED_2
        ):
            raise HTTPException(status_code=400, detail="Category is in use and cannot be deleted")
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


# 1. Fetch available items for a given meal (BLD)
@app.get("/api/menu/available-items", tags=["Daily Menu"])
def get_available_items(
    bld_type: str = Query(..., description="BLD type: Breakfast, Lunch, Dinner, Condiments"),
    include_combos: bool = Query(
        False,
        description="When true, includes combo products mapped to the selected meal",
    ),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        bld_id = resolve_bld_id(cursor, bld_type)

        canonical_meal = normalize_meal_type(bld_type)
        query = """
            SELECT 
                i.item_id,
                i.name,
                i.description,
                i.alias,
                i.category_id,
                i.component_type_id,
                ct.name AS component_type_name,
                i.uom_customer,
                i.uom_customer AS uom,
                i.unit_packing,
                i.uom_packing,
                i.hsn_code,
                i.uom_production,
                i.packing_to_production_rate,
                i.buffer_percentage,
                i.max_qty_breakfast,
                i.max_qty_lunch,
                i.max_qty_dinner,
                i.max_qty_condiments,
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
            LEFT JOIN component_types ct ON i.component_type_id = ct.component_type_id
            WHERE EXISTS (
                SELECT 1 
                  FROM item_bld_map map
                 WHERE map.item_id = i.item_id
                   AND map.bld_id = %s
            )
        """
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
                        i.component_type_id,
                        ct.name AS component_type_name,
                        i.uom_customer,
                        i.uom_customer AS uom,
                        i.unit_packing,
                        i.uom_packing,
                        i.hsn_code,
                        i.uom_production,
                        i.packing_to_production_rate,
                        i.buffer_percentage,
                        i.max_qty,
                        i.max_qty AS max_qty_condiments,
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
                    LEFT JOIN component_types ct ON i.component_type_id = ct.component_type_id
                    WHERE EXISTS (
                        SELECT 1 
                          FROM item_bld_map map
                         WHERE map.item_id = i.item_id
                           AND map.bld_id = %s
                    )
                """
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
                item["max_qty_condiments"] = item.get("max_qty_condiments", legacy_value)

        attach_bld_ids(cursor, items)
        attach_plated_flags(cursor, items)
        filtered_items = filter_items_by_bld(items, bld_id)

        if not include_combos:
            return filtered_items

        cursor.execute(
            """
            SELECT
                c.combo_id,
                c.combo_name AS name,
                NULL AS description,
                NULL AS alias,
                c.category_id,
                NULL AS component_type_id,
                NULL AS component_type_name,
                'combo' AS uom_customer,
                'combo' AS uom,
                1 AS unit_packing,
                'combo' AS uom_packing,
                NULL AS hsn_code,
                'combo' AS uom_production,
                1 AS packing_to_production_rate,
                NULL AS buffer_percentage,
                NULL AS max_qty_breakfast,
                NULL AS max_qty_lunch,
                NULL AS max_qty_dinner,
                NULL AS max_qty_condiments,
                NULL AS picture_url,
                c.price AS breakfast_price,
                c.price AS lunch_price,
                c.price AS dinner_price,
                NULL AS condiments_price,
                c.price AS festival_price,
                NULL AS cgst,
                NULL AS sgst,
                NULL AS igst,
                c.price AS net_price,
                1 AS is_combo
            FROM combos c
            WHERE EXISTS (
                SELECT 1
                  FROM combo_bld_map cbm
                 WHERE cbm.combo_id = c.combo_id
                   AND cbm.bld_id = %s
            )
            ORDER BY c.combo_name ASC
            """,
            (bld_id,),
        )
        combos = cursor.fetchall() or []
        attach_combo_bld_ids(cursor, combos)
        for combo in combos:
            combo["item_id"] = None
            combo["is_plated"] = False
            combo["is_condiment"] = False

        return [*filtered_items, *combos]

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
    include_combos: bool = False,
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
                menu_type,
                delivers_by
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
                mi.combo_id,
                COALESCE(i.name, c.combo_name) AS item_name,
                i.component_type_id,
                ct.name AS component_type_name,
                COALESCE(i.uom_customer, 'combo') AS uom,
                CASE
                    WHEN mi.combo_id IS NOT NULL THEN 1
                    ELSE 0
                END AS is_combo,
                CASE
                    WHEN mi.item_id IS NOT NULL AND EXISTS (
                        SELECT 1
                        FROM plated_items p
                        WHERE p.item_id = mi.item_id
                    ) THEN 1
                    ELSE 0
                END AS is_plated,
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
                i.max_qty_dinner,
                i.max_qty_condiments
            FROM menu_items mi
            LEFT JOIN items i ON mi.item_id = i.item_id
            LEFT JOIN combos c ON mi.combo_id = c.combo_id
            LEFT JOIN component_types ct ON i.component_type_id = ct.component_type_id
            WHERE mi.menu_id = %s
              AND (%s = 1 OR mi.combo_id IS NULL)
            ORDER BY mi.sort_order ASC
        """
        legacy_items_mode = False
        try:
            cursor.execute(items_query, (menu_id, 1 if include_combos else 0))
            menu_items = cursor.fetchall()
        except mysql.connector.Error as err:
            if err.errno == errorcode.ER_BAD_FIELD_ERROR:
                legacy_items_mode = True
                legacy_items_query = """
                    SELECT
                        mi.menu_item_id,
                        mi.item_id,
                        NULL AS combo_id,
                        i.name AS item_name,
                        i.component_type_id,
                        ct.name AS component_type_name,
                        i.uom_customer AS uom,
                        0 AS is_combo,
                        0 AS is_plated,
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
                        i.max_qty_dinner,
                        i.max_qty_condiments
                    FROM menu_items mi
                    JOIN items i ON mi.item_id = i.item_id
                    LEFT JOIN component_types ct ON i.component_type_id = ct.component_type_id
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
            "Condiments": "max_qty_condiments",
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
            "delivers_by": resolve_delivers_by_value(
                canonical_bld_type, menu_row.get("delivers_by")
            ),
            "items": [
                {
                    "menu_item_id": it["menu_item_id"],
                    "item_id": it["item_id"],
                    "combo_id": it.get("combo_id"),
                    "item_name": it["item_name"],
                    "component_type_id": it.get("component_type_id"),
                    "component_type_name": it.get("component_type_name"),
                    "is_combo": bool(it.get("is_combo")),
                    "is_plated": bool(it.get("is_plated")),
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
                    "item_max_qty": it.get(meal_column),
                }
                for it in menu_items
            ],
        }
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


# 3. Create or update (upsert) a daily menu using BLD
class MenuItemPayload(BaseModel):
    item_id: Optional[int] = None
    combo_id: Optional[int] = None
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
    delivers_by: Optional[str] = None


class AutoMenuRequest(BaseModel):
    date: Optional[str] = None
    city_code: Optional[str] = None


MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Condiments"]


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
        resolved_delivers_by = resolve_delivers_by_value(canonical_bld_type, payload.delivers_by)

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
                       date = %s,
                       delivers_by = %s
                 WHERE menu_id = %s
            """
            cursor.execute(
                update_query,
                (
                    int(payload.is_festival),
                    payload.period_type,
                    menu_date,
                    resolved_delivers_by,
                    menu_id,
                ),
            )
        else:
            # Insert new menu row
            insert_query = """
                INSERT INTO menu (date, is_festival, is_released, period_type, bld_id, city_code, menu_type, delivers_by)
                VALUES (%s, %s, 0, %s, %s, %s, %s, %s)
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
                    resolved_delivers_by,
                ),
            )
            menu_id = cursor.lastrowid

        normalized_menu_items: List[Dict[str, Any]] = []
        seen_payload_keys: set[Tuple[str, int]] = set()
        for idx, mi in enumerate(payload.items, start=1):
            has_item = mi.item_id is not None
            has_combo = mi.combo_id is not None
            if has_item == has_combo:
                raise HTTPException(
                    status_code=400,
                    detail=f"items[{idx - 1}] must include exactly one of item_id or combo_id",
                )
            payload_key = ("item", int(mi.item_id)) if has_item else ("combo", int(mi.combo_id))
            if payload_key in seen_payload_keys:
                raise HTTPException(
                    status_code=400,
                    detail=f"Duplicate menu entry in payload: {payload_key[0]} {payload_key[1]}",
                )
            seen_payload_keys.add(payload_key)
            if has_item:
                cursor.execute(
                    "SELECT category_id FROM items WHERE item_id = %s LIMIT 1",
                    (mi.item_id,),
                )
                row = cursor.fetchone()
                if row is None:
                    raise HTTPException(status_code=400, detail=f"Unknown item_id: {mi.item_id}")
                resolved_category_id = mi.category_id if mi.category_id is not None else row[0]
            else:
                cursor.execute(
                    "SELECT category_id FROM combos WHERE combo_id = %s LIMIT 1",
                    (mi.combo_id,),
                )
                row = cursor.fetchone()
                if row is None:
                    raise HTTPException(status_code=400, detail=f"Unknown combo_id: {mi.combo_id}")
                resolved_category_id = mi.category_id if mi.category_id is not None else row[0]

            normalized_menu_items.append(
                {
                    "item_id": mi.item_id,
                    "combo_id": mi.combo_id,
                    "category_id": resolved_category_id,
                    "max_qty": mi.max_qty if mi.max_qty is not None else None,
                    "available_qty": mi.available_qty if mi.available_qty is not None else None,
                    "rate": float(mi.rate),
                    "is_default": bool(mi.is_default),
                    "sort_order": mi.sort_order or idx,
                    "key": payload_key,
                }
            )

        cursor.execute(
            """
            SELECT menu_item_id, item_id, combo_id
            FROM menu_items
            WHERE menu_id = %s
            ORDER BY menu_item_id ASC
            """,
            (menu_id,),
        )
        existing_menu_items = cursor.fetchall() or []
        existing_by_key: Dict[Tuple[str, int], Dict[str, Any]] = {}
        stale_menu_item_ids: List[int] = []
        for row in existing_menu_items:
            existing_item_id = row[1]
            existing_combo_id = row[2]
            if existing_item_id is not None:
                row_key = ("item", int(existing_item_id))
            elif existing_combo_id is not None:
                row_key = ("combo", int(existing_combo_id))
            else:
                stale_menu_item_ids.append(int(row[0]))
                continue
            if row_key in existing_by_key:
                stale_menu_item_ids.append(int(row[0]))
                continue
            existing_by_key[row_key] = {
                "menu_item_id": int(row[0]),
                "item_id": existing_item_id,
                "combo_id": existing_combo_id,
            }

        retained_menu_item_ids: set[int] = set()
        for entry in normalized_menu_items:
            item_id = entry["item_id"]
            combo_id = entry["combo_id"]
            category_id = entry["category_id"]
            max_qty_value = entry["max_qty"]
            available_qty_value = entry["available_qty"]
            rate_value = entry["rate"]
            is_default = entry["is_default"]
            sort_order = entry["sort_order"]
            payload_key = entry["key"]
            effective_available_qty = (
                available_qty_value if available_qty_value is not None else max_qty_value
            )

            existing_row = existing_by_key.get(payload_key)
            if existing_row:
                retained_menu_item_ids.add(existing_row["menu_item_id"])
                cursor.execute(
                    """
                    UPDATE menu_items
                    SET category_id = %s,
                        max_qty = %s,
                        available_qty = %s,
                        rate = %s,
                        is_default = %s,
                        sort_order = %s
                    WHERE menu_item_id = %s
                    """,
                    (
                        category_id,
                        max_qty_value,
                        effective_available_qty,
                        rate_value,
                        int(is_default),
                        sort_order,
                        existing_row["menu_item_id"],
                    ),
                )
                continue

            cursor.execute(
                """
                INSERT INTO menu_items
                    (menu_id, item_id, combo_id, category_id, max_qty, available_qty, rate, is_default, sort_order)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    menu_id,
                    item_id,
                    combo_id,
                    category_id,
                    max_qty_value,
                    effective_available_qty,
                    rate_value,
                    int(is_default),
                    sort_order,
                ),
            )
            retained_menu_item_ids.add(int(cursor.lastrowid))

        for existing_row in existing_menu_items:
            existing_menu_item_id = int(existing_row[0])
            if existing_menu_item_id not in retained_menu_item_ids:
                stale_menu_item_ids.append(existing_menu_item_id)

        if stale_menu_item_ids:
            unique_stale_ids = sorted(set(stale_menu_item_ids))
            placeholders = ", ".join(["%s"] * len(unique_stale_ids))
            cursor.execute(
                f"DELETE FROM menu_items WHERE menu_item_id IN ({placeholders})",
                tuple(unique_stale_ids),
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
            include_combos=True,
        )
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.get("/api/products/component-types", tags=["Products"])
def get_all_component_types():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT component_type_id, name, description, is_active
              FROM component_types
             WHERE is_active = 1
             ORDER BY name ASC
            """)
        rows = cursor.fetchall() or []
        for row in rows:
            row["is_active"] = bool(row.get("is_active", True))
        return rows
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.post("/api/products/component-types", tags=["Products"])
def create_component_type(
    payload: ComponentTypeCreatePayload,
    user: Dict[str, Any] = Depends(admin_required),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        name = (payload.name or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="name is required")
        description = (payload.description or "").strip() or None
        cursor.execute(
            """
            INSERT INTO component_types (name, description, is_active)
            VALUES (%s, %s, 1)
            """,
            (name, description),
        )
        component_type_id = cursor.lastrowid
        db.commit()
        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="ADD",
            entity_type="COMPONENT_TYPE",
            entity_id=component_type_id,
            description=f"Created component type {component_type_id}",
        )
        return {
            "component_type_id": component_type_id,
            "name": name,
            "description": description,
            "is_active": True,
        }
    except mysql.connector.Error as err:
        db.rollback()
        if err.errno == errorcode.ER_DUP_ENTRY:
            raise HTTPException(status_code=400, detail="Component type already exists")
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.put("/api/products/component-types/{component_type_id}", tags=["Products"])
def update_component_type(
    component_type_id: int,
    payload: ComponentTypeUpdatePayload,
    user: Dict[str, Any] = Depends(admin_required),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT 1 FROM component_types WHERE component_type_id = %s",
            (component_type_id,),
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Component type not found")

        updates: List[str] = []
        values: List[Any] = []
        if payload.name is not None:
            name = payload.name.strip()
            if not name:
                raise HTTPException(status_code=400, detail="name is required")
            updates.append("name = %s")
            values.append(name)
        if payload.description is not None:
            updates.append("description = %s")
            values.append((payload.description or "").strip() or None)
        if payload.is_active is not None:
            updates.append("is_active = %s")
            values.append(1 if payload.is_active else 0)
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        values.append(component_type_id)
        cursor.execute(
            f"UPDATE component_types SET {', '.join(updates)} WHERE component_type_id = %s",
            values,
        )
        db.commit()
        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="UPDATE",
            entity_type="COMPONENT_TYPE",
            entity_id=component_type_id,
            description=f"Updated component type {component_type_id}",
        )
        cursor.execute(
            """
            SELECT component_type_id, name, description, is_active
              FROM component_types
             WHERE component_type_id = %s
            """,
            (component_type_id,),
        )
        row = cursor.fetchone()
        if row:
            row["is_active"] = bool(row.get("is_active", True))
        return row or {"component_type_id": component_type_id}
    except mysql.connector.Error as err:
        db.rollback()
        if err.errno == errorcode.ER_DUP_ENTRY:
            raise HTTPException(status_code=400, detail="Component type already exists")
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.delete("/api/products/component-types/{component_type_id}", tags=["Products"])
def delete_component_type(
    component_type_id: int,
    user: Dict[str, Any] = Depends(admin_required),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT 1 FROM component_types WHERE component_type_id = %s",
            (component_type_id,),
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Component type not found")
        cursor.execute(
            "SELECT 1 FROM items WHERE component_type_id = %s LIMIT 1",
            (component_type_id,),
        )
        if cursor.fetchone() is not None:
            raise HTTPException(
                status_code=400,
                detail="Component type is still assigned to one or more items",
            )
        cursor.execute(
            "SELECT 1 FROM plated_item_components WHERE component_type_id = %s LIMIT 1",
            (component_type_id,),
        )
        if cursor.fetchone() is not None:
            raise HTTPException(
                status_code=400,
                detail="Component type is still used in one or more plated items",
            )
        cursor.execute(
            "SELECT 1 FROM combo_items WHERE component_type_id = %s LIMIT 1",
            (component_type_id,),
        )
        if cursor.fetchone() is not None:
            raise HTTPException(
                status_code=400,
                detail="Component type is still used in one or more combos",
            )

        cursor.execute(
            "DELETE FROM component_types WHERE component_type_id = %s",
            (component_type_id,),
        )
        db.commit()
        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="DELETE",
            entity_type="COMPONENT_TYPE",
            entity_id=component_type_id,
            description=f"Deleted component type {component_type_id}",
        )
        return {"status": "deleted", "component_type_id": component_type_id}
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
def auto_generate_daily_menu(
    payload: AutoMenuRequest, _: Dict[str, Any] = Depends(developer_required)
):
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
            "Condiments": "max_qty_condiments",
        }.get(meal, "max_qty_breakfast")

        allow_default = meal != "Dinner"
        is_condiments_meal = meal == "Condiments"
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
            date=None if is_condiments_meal else target_date,
            bld_type=meal,
            is_festival=False,
            period_type=None if is_condiments_meal else "one_day",
            items=menu_items,
            city_code=target_city,
            menu_type=MENU_TYPE_CONDIMENTS if is_condiments_meal else MENU_TYPE_ONE_DAY,
        )

        menu_data = upsert_daily_menu(menu_payload)
        menu_id = menu_data["menu_id"]
        released = False

        if meal in ("Breakfast", "Lunch") or is_condiments_meal:
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
            is_condiments_meal = meal == "Condiments"
            if is_condiments_meal:
                cursor.execute(
                    """
                    SELECT menu_id
                      FROM menu
                     WHERE bld_id = %s
                       AND city_code = %s
                       AND menu_type = %s
                       AND date IS NULL
                     LIMIT 1
                    """,
                    (bld_id, target_city, MENU_TYPE_CONDIMENTS),
                )
            else:
                cursor.execute(
                    """
                    SELECT menu_id
                      FROM menu
                     WHERE date = %s
                       AND bld_id = %s
                       AND city_code = %s
                       AND menu_type = %s
                     LIMIT 1
                    """,
                    (target_date, bld_id, target_city, MENU_TYPE_ONE_DAY),
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
            raise HTTPException(
                status_code=400, detail="Invalid date format. Use YYYY-MM-DD."
            ) from exc
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
                i.max_qty_condiments,
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

        daily_menu_completed = total_blds > 0 and menu_count >= total_blds and menu_items_count > 0
        release_completed = total_blds > 0 and released_count >= total_blds
        production_completed = total_blds > 0 and production_count >= total_blds
        deliveries_completed = daily_orders_total > 0 and daily_orders_pending == 0

        deliveries_status = (
            "Done"
            if deliveries_completed
            else ("In Progress" if daily_orders_delivered > 0 else "Pending")
        )

        daily_menu_status = (
            "Done"
            if daily_menu_completed
            else ("In Progress" if total_blds > 0 and menu_count > 0 else "Pending")
        )
        menu_release_status = (
            "Done"
            if release_completed
            else ("In Progress" if total_blds > 0 and released_count > 0 else "Pending")
        )
        production_status = (
            "Done"
            if production_completed
            else ("In Progress" if total_blds > 0 and production_count > 0 else "Pending")
        )

        checklist = [
            {
                "key": "daily_menu",
                "label": "Daily Menu Creation",
                "completed": daily_menu_completed,
                "status": daily_menu_status,
                "detail": (f"{menu_count}/{total_blds} menus ready" if total_blds else None),
            },
            {
                "key": "menu_release",
                "label": "Menu Release",
                "completed": release_completed,
                "status": menu_release_status,
                "detail": (f"{released_count}/{total_blds} released" if total_blds else None),
            },
            {
                "key": "production_plan",
                "label": "Kitchen Production Planning",
                "completed": production_completed,
                "status": production_status,
                "detail": (f"{production_count}/{total_blds} planned" if total_blds else None),
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
                    "id": (f"ORD-{order_id:05d}" if order_id else str(row.get("order_id") or "")),
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
              LEFT JOIN combos co ON oi.combo_id = co.combo_id
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
            LEFT JOIN combos co ON oi.combo_id = co.combo_id
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
                    COALESCE(i.name, co.combo_name) AS item_name
                FROM order_items oi
                LEFT JOIN items i ON oi.item_id = i.item_id
                LEFT JOIN combos co ON oi.combo_id = co.combo_id
                WHERE oi.order_id IN ({placeholders})
                ORDER BY oi.order_id ASC, COALESCE(i.name, co.combo_name) ASC
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
                        "line_total": float(row.get("quantity") or 0)
                        * float(row.get("price") or 0),
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
                            (
                                record["created_at"].strftime("%Y-%m-%d %H:%M:%S")
                                if record.get("created_at")
                                else ""
                            ),
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
        raise HTTPException(status_code=500, detail=f"Failed to update order status: {err.msg}")
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
                COALESCE(i.name, co.combo_name) AS item_name
            FROM order_items oi
            LEFT JOIN items i ON oi.item_id = i.item_id
            LEFT JOIN combos co ON oi.combo_id = co.combo_id
            WHERE oi.order_id = %s
            ORDER BY COALESCE(i.name, co.combo_name) ASC
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
    planned_quantity: Optional[float] = None
    buffer_quantity: Optional[float] = None
    final_quantity: Optional[float] = None
    available_quantity: Optional[float] = None


class ProductionPlanRequest(BaseModel):
    date: str
    menu_type: str
    plans: List[ProductionPlanItem]
    city_code: Optional[str] = None


class ProductionPlanResetRequest(BaseModel):
    date: str
    menu_type: str
    city_code: Optional[str] = None


class ProductionPlanFinalizeRequest(ProductionPlanResetRequest):
    plans: Optional[List[ProductionPlanItem]] = None


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


class DeliveryRoutePayload(BaseModel):
    route_id: Optional[int] = None
    route_code: str = Field(..., min_length=1, max_length=50)
    route_name: str = Field(..., min_length=1, max_length=150)
    notes: Optional[str] = None
    is_active: bool = True
    sort_order: Optional[int] = Field(default=0, ge=0)


class DeliveryRouteBulkSaveRequest(BaseModel):
    city_code: Optional[str] = None
    routes: List[DeliveryRoutePayload] = Field(default_factory=list)


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


def _ensure_delivery_routes_table(db) -> None:
    cursor = db.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS delivery_routes (
                route_id INT NOT NULL AUTO_INCREMENT,
                city_code VARCHAR(10) NOT NULL,
                route_code VARCHAR(50) NOT NULL,
                route_name VARCHAR(150) NOT NULL,
                notes TEXT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                sort_order INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (route_id),
                UNIQUE KEY uq_delivery_routes_city_route_code (city_code, route_code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
            """)
        db.commit()
    finally:
        cursor.close()


@app.get("/api/logistics/routes", tags=["Logistics"])
def list_delivery_routes(
    city_code: Optional[str] = Query(None, alias="city_code"),
    user: Dict[str, Any] = Depends(admin_required),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        _ensure_delivery_routes_table(db)
        resolved_city = _resolve_city_context(city_code, user)
        cursor.execute(
            """
            SELECT route_id, city_code, route_code, route_name, notes, is_active, sort_order
              FROM delivery_routes
             WHERE city_code = %s
             ORDER BY sort_order ASC, route_code ASC
            """,
            (resolved_city,),
        )
        return cursor.fetchall() or []
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.post("/api/logistics/routes/bulk-save", tags=["Logistics"])
def bulk_save_delivery_routes(
    payload: DeliveryRouteBulkSaveRequest,
    user: Dict[str, Any] = Depends(admin_required),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        _ensure_delivery_routes_table(db)
        resolved_city = _resolve_city_context(payload.city_code, user)
        normalized_routes: List[Dict[str, Any]] = []
        seen_codes: Set[str] = set()
        for index, route in enumerate(payload.routes):
            route_code = (route.route_code or "").strip()
            route_name = (route.route_name or "").strip()
            notes = (route.notes or "").strip() or None
            if not route_code or not route_name:
                raise HTTPException(
                    status_code=400,
                    detail="route_code and route_name are required for each route",
                )
            route_code_key = route_code.lower()
            if route_code_key in seen_codes:
                raise HTTPException(
                    status_code=400,
                    detail=f"Duplicate route_code in payload: {route_code}",
                )
            seen_codes.add(route_code_key)
            normalized_routes.append(
                {
                    "route_id": int(route.route_id) if route.route_id else None,
                    "route_code": route_code,
                    "route_name": route_name,
                    "notes": notes,
                    "is_active": 1 if route.is_active else 0,
                    "sort_order": int(route.sort_order or index),
                }
            )

        cursor.execute(
            "SELECT route_id FROM delivery_routes WHERE city_code = %s",
            (resolved_city,),
        )
        existing_route_ids = {
            int(row["route_id"])
            for row in (cursor.fetchall() or [])
            if row.get("route_id") is not None
        }

        kept_route_ids: List[int] = []
        for route in normalized_routes:
            route_id = route["route_id"]
            if route_id and route_id in existing_route_ids:
                cursor.execute(
                    """
                    UPDATE delivery_routes
                       SET route_code = %s,
                           route_name = %s,
                           notes = %s,
                           is_active = %s,
                           sort_order = %s
                     WHERE route_id = %s
                       AND city_code = %s
                    """,
                    (
                        route["route_code"],
                        route["route_name"],
                        route["notes"],
                        route["is_active"],
                        route["sort_order"],
                        route_id,
                        resolved_city,
                    ),
                )
                kept_route_ids.append(route_id)
                continue

            cursor.execute(
                """
                INSERT INTO delivery_routes (city_code, route_code, route_name, notes, is_active, sort_order)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    resolved_city,
                    route["route_code"],
                    route["route_name"],
                    route["notes"],
                    route["is_active"],
                    route["sort_order"],
                ),
            )
            kept_route_ids.append(int(cursor.lastrowid))

        if kept_route_ids:
            placeholders = ", ".join(["%s"] * len(kept_route_ids))
            cursor.execute(
                f"DELETE FROM delivery_routes WHERE city_code = %s AND route_id NOT IN ({placeholders})",
                (resolved_city, *kept_route_ids),
            )
        else:
            cursor.execute("DELETE FROM delivery_routes WHERE city_code = %s", (resolved_city,))

        db.commit()

        cursor.execute(
            """
            SELECT route_id, city_code, route_code, route_name, notes, is_active, sort_order
              FROM delivery_routes
             WHERE city_code = %s
             ORDER BY sort_order ASC, route_code ASC
            """,
            (resolved_city,),
        )
        return {
            "city_code": resolved_city,
            "routes": cursor.fetchall() or [],
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
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
    item_id: Optional[int] = None
    combo_id: Optional[int] = None
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
    coupon_codes: Optional[List[str]] = None


class OrderQuotePayload(BaseModel):
    items: List[OrderItemPayload]
    coupon_codes: Optional[List[str]] = None


def _load_coupon_discount(
    cursor, coupon_codes: Optional[List[str]], subtotal: float
) -> Tuple[float, List[str]]:
    if not coupon_codes:
        return 0.0, []
    normalized_codes = []
    for code in coupon_codes:
        if not code:
            continue
        normalized = code.strip().upper()
        if normalized and normalized not in normalized_codes:
            normalized_codes.append(normalized)
    if not normalized_codes:
        return 0.0, []
    placeholders = ", ".join(["%s"] * len(normalized_codes))
    cursor.execute(
        f"""
        SELECT constant_code, constant_value
          FROM constants
         WHERE constant_type = 'coupon'
           AND constant_code IN ({placeholders})
           AND is_active = 1
        """,
        tuple(normalized_codes),
    )
    rows = cursor.fetchall() or []
    valid_codes = {str(row[0]).strip().upper(): float(row[1] or 0) for row in rows}
    missing = [code for code in normalized_codes if code not in valid_codes]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid coupon code(s): {', '.join(missing)}",
        )
    total_percent = sum(valid_codes.values())
    if total_percent < 0:
        total_percent = 0.0
    if total_percent > 100:
        total_percent = 100.0
    discount_amount = (subtotal * total_percent) / 100.0
    return discount_amount, normalized_codes


def _load_tax_amounts(cursor, discounted_subtotal: float) -> Tuple[float, float]:
    cursor.execute("""
        SELECT constant_code, constant_value
          FROM constants
         WHERE constant_type = 'tax'
           AND is_active = 1
        """)
    cgst_percent = 0.0
    sgst_percent = 0.0
    for code, value in cursor.fetchall() or []:
        normalized = str(code or "").strip().upper()
        percent = float(value or 0)
        if normalized == "CGST":
            cgst_percent += percent
        elif normalized == "SGST":
            sgst_percent += percent
    cgst_amount = (discounted_subtotal * cgst_percent) / 100.0
    sgst_amount = (discounted_subtotal * sgst_percent) / 100.0
    return cgst_amount, sgst_amount


def _compute_order_totals(
    cursor, items: List[OrderItemPayload], coupon_codes: Optional[List[str]]
) -> Dict[str, Any]:
    for index, item in enumerate(items):
        has_item = item.item_id is not None
        has_combo = item.combo_id is not None
        if has_item == has_combo:
            raise HTTPException(
                status_code=400,
                detail=f"items[{index}] must include exactly one of item_id or combo_id",
            )
    subtotal = sum(item.price * item.quantity for item in items)
    discount_amount, applied_coupons = _load_coupon_discount(cursor, coupon_codes, subtotal)
    discounted_subtotal = max(subtotal - discount_amount, 0.0)
    cgst_amount, sgst_amount = _load_tax_amounts(cursor, discounted_subtotal)
    total_price = discounted_subtotal + cgst_amount + sgst_amount
    return {
        "subtotal": round(subtotal, 2),
        "discount": round(discount_amount, 2),
        "cgst": round(cgst_amount, 2),
        "sgst": round(sgst_amount, 2),
        "total_price": round(total_price, 2),
        "coupon_codes": applied_coupons,
    }


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
                "latitude": (float(row["latitude"]) if row.get("latitude") is not None else None),
                "longitude": (
                    float(row["longitude"]) if row.get("longitude") is not None else None
                ),
                "route_assignment": row.get("route_assignment"),
            }
            for row in rows
        ]
    finally:
        cursor.close()
        db.close()


def _resolve_coordinates(
    cursor, customer_id: int, latitude: Optional[float], longitude: Optional[float]
) -> Tuple[float, float]:
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
        cursor.execute(
            "SELECT customer_id FROM customers WHERE customer_id=%s LIMIT 1",
            (customer_id,),
        )
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
        lng_input = (
            payload.longitude if payload.longitude is not None else existing.get("longitude")
        )
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
            (payload.date, bld_id, target_city),
        )
        menu = cursor.fetchone()
        if not menu:
            raise HTTPException(status_code=404, detail="Menu not found for that date/type")
        menu_id = menu["menu_id"]

        updated = _persist_plan_items(cursor, menu_id, payload.plans)

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
def finalize_production_plan(payload: ProductionPlanFinalizeRequest):
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
            raise HTTPException(
                status_code=400, detail="No items available to export for this menu"
            )

        _persist_plan_items(cursor, menu_id, payload.plans)

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
                SELECT
                    mi.menu_item_id,
                    COALESCE(mi.max_qty, 0) AS max_qty,
                    COALESCE(mi.buffer_qty, 0) AS buffer_qty,
                    COALESCE(mi.final_qty, 0) AS final_qty,
                    COALESCE(mi.available_qty, 0) AS available_qty,
                    COALESCE(i.buffer_percentage, 0) AS buffer_percentage
                FROM menu_items mi
                JOIN items i ON mi.item_id = i.item_id
                WHERE mi.menu_id = %s
                  AND LOWER(i.name) = LOWER(%s)
                LIMIT 1
                """,
                (menu_id, adjustment.item_name),
            )
            row = cursor.fetchone()
            if not row:
                continue

            additional = float(adjustment.additional_qty or 0)
            if additional == 0:
                continue

            current_max = float(row["max_qty"] or 0)
            current_buffer = float(row["buffer_qty"] or 0)
            if current_buffer <= 0:
                inferred = float(row["final_qty"] or 0) - current_max
                if inferred > 0:
                    current_buffer = inferred
            current_available = float(row["available_qty"] or 0)
            buffer_pct = float(row["buffer_percentage"] or 0)

            buffer_delta = 0.0
            if buffer_pct > 0:
                buffer_delta = round((abs(additional) * buffer_pct) / 100)
                if additional < 0:
                    buffer_delta *= -1

            new_max = current_max + additional
            if new_max < 0:
                new_max = 0

            new_buffer = current_buffer + buffer_delta
            if new_buffer < 0:
                new_buffer = 0

            new_final = max(new_max + new_buffer, 0)
            new_available = current_available + additional + buffer_delta
            new_available = max(0, min(new_available, new_final, new_max))

            cursor.execute(
                """
                UPDATE menu_items
                   SET max_qty = %s,
                       buffer_qty = %s,
                       final_qty = %s,
                       available_qty = %s
                 WHERE menu_id = %s
                   AND menu_item_id = %s
                """,
                (
                    new_max,
                    new_buffer,
                    new_final,
                    new_available,
                    menu_id,
                    row["menu_item_id"],
                ),
            )

            updated_items.append(
                {
                    "item_name": adjustment.item_name,
                    "new_max_qty": new_max,
                    "new_buffer_qty": new_buffer,
                    "new_final_qty": new_final,
                    "new_available_qty": new_available,
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
            db.commit()

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
        _ensure_delivery_routes_table(db)
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
                a.route_assignment,
                dr.route_code,
                dr.route_name,
                dr.sort_order
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN addresses a ON o.address_id = a.address_id
            LEFT JOIN delivery_routes dr
              ON dr.city_code COLLATE utf8mb4_0900_ai_ci = a.city_code
             AND dr.route_code COLLATE utf8mb4_0900_ai_ci = a.route_assignment
           WHERE DATE(o.created_at) = %s
             AND a.city_code = %s
           ORDER BY COALESCE(dr.sort_order, 9999), COALESCE(dr.route_name, a.route_assignment, ''), c.name
            """,
            (parsed_date, target_city),
        )
        rows = cursor.fetchall() or []

        route_groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        route_sort_order: Dict[str, int] = {}
        updatable_statuses = {
            ORDER_STATUS_PENDING.lower(),
            ORDER_STATUS_CONFIRMED.lower(),
            ORDER_STATUS_PREPARING.lower(),
        }

        for row in rows:
            route_label = row.get("route_name") or row.get("route_assignment") or "Unassigned"
            route_sort_order.setdefault(route_label, int(row.get("sort_order") or 9999))
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
        for route, orders in sorted(
            route_groups.items(),
            key=lambda entry: (route_sort_order.get(entry[0], 9999), entry[0].lower()),
        ):
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


def _fetch_production_menu_rows(
    cursor,
    target_date: str,
    city_code: CityCode,
    period_type: Optional[str],
    meals: List[str],
) -> List[Dict[str, Any]]:
    if not meals:
        return []
    placeholders = ", ".join(["%s"] * len(meals))
    normalized_period = None if period_type == "festivals" else period_type
    cursor.execute(
        f"""
        SELECT
            m.menu_id,
            m.is_released,
            m.is_production_generated,
            b.bld_type AS meal,
            mi.menu_item_id,
            mi.item_id,
            mi.combo_id,
            COALESCE(i.name, c.combo_name) AS menu_entry_name
        FROM menu m
        JOIN bld b ON m.bld_id = b.bld_id
        JOIN menu_items mi ON m.menu_id = mi.menu_id
        LEFT JOIN items i ON mi.item_id = i.item_id
        LEFT JOIN combos c ON mi.combo_id = c.combo_id
        WHERE m.menu_type = %s
          AND m.date = %s
          AND m.city_code = %s
          AND ((m.period_type IS NULL AND %s IS NULL) OR m.period_type = %s)
          AND b.bld_type IN ({placeholders})
        ORDER BY b.bld_type ASC, mi.sort_order ASC, mi.menu_item_id ASC
        """,
        (
            MENU_TYPE_ONE_DAY,
            target_date,
            city_code,
            normalized_period,
            normalized_period,
            *meals,
        ),
    )
    return cursor.fetchall() or []


def _build_default_item_resolution_map(
    cursor,
    target_date: str,
    city_code: CityCode,
    period_type: Optional[str],
    meals: List[str],
) -> Tuple[
    Dict[Tuple[str, int], int],
    Dict[Tuple[str, int], str],
    Dict[Tuple[str, int], int],
]:
    if not meals:
        return {}, {}, {}
    placeholders = ", ".join(["%s"] * len(meals))
    normalized_period = None if period_type == "festivals" else period_type
    cursor.execute(
        f"""
        SELECT
            b.bld_type AS meal,
            i.component_type_id,
            i.item_id,
            i.name
        FROM menu m
        JOIN bld b ON m.bld_id = b.bld_id
        JOIN menu_items mi ON mi.menu_id = m.menu_id
        JOIN items i ON mi.item_id = i.item_id
        WHERE m.menu_type = %s
          AND m.date = %s
          AND m.city_code = %s
          AND ((m.period_type IS NULL AND %s IS NULL) OR m.period_type = %s)
          AND mi.is_default = 1
          AND i.component_type_id IS NOT NULL
          AND b.bld_type IN ({placeholders})
        ORDER BY b.bld_type ASC, i.component_type_id ASC, mi.menu_item_id ASC
        """,
        (
            MENU_TYPE_ONE_DAY,
            target_date,
            city_code,
            normalized_period,
            normalized_period,
            *meals,
        ),
    )
    rows = cursor.fetchall() or []
    counts: Dict[Tuple[str, int], int] = {}
    resolved_ids: Dict[Tuple[str, int], int] = {}
    resolved_names: Dict[Tuple[str, int], str] = {}
    for row in rows:
        meal = row.get("meal")
        component_type_id = row.get("component_type_id")
        item_id = row.get("item_id")
        if meal is None or component_type_id is None or item_id is None:
            continue
        key = (str(meal), int(component_type_id))
        counts[key] = counts.get(key, 0) + 1
        if counts[key] == 1:
            resolved_ids[key] = int(item_id)
            resolved_names[key] = str(row.get("name") or f"Item #{item_id}")
    return resolved_ids, resolved_names, counts


def _fetch_order_quantities_by_menu_item(
    cursor, target_date: str, city_code: CityCode
) -> Dict[int, float]:
    cursor.execute(
        """
        SELECT
            oi.menu_item_id,
            SUM(oi.quantity) AS quantity
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.order_id
        JOIN addresses a ON o.address_id = a.address_id
        WHERE COALESCE(o.order_date, DATE(o.created_at)) = %s
          AND a.city_code = %s
          AND oi.menu_item_id IS NOT NULL
          AND LOWER(REPLACE(COALESCE(o.status, ''), ' (Payment Due)', '')) NOT IN (
            'cancelled',
            'cancelled by customer',
            'cancelled by admin'
          )
        GROUP BY oi.menu_item_id
        """,
        (target_date, city_code),
    )
    rows = cursor.fetchall() or []
    return {
        int(row["menu_item_id"]): float(row.get("quantity") or 0)
        for row in rows
        if row.get("menu_item_id") is not None
    }


def _fetch_item_unit_details(cursor, item_ids: Iterable[int]) -> Dict[int, Dict[str, Any]]:
    normalized_ids = sorted({int(item_id) for item_id in item_ids if item_id is not None})
    if not normalized_ids:
        return {}
    placeholders = ", ".join(["%s"] * len(normalized_ids))
    cursor.execute(
        f"""
        SELECT
            item_id,
            name,
            uom_customer,
            unit_packing,
            uom_packing,
            uom_production,
            packing_to_production_rate
        FROM items
        WHERE item_id IN ({placeholders})
        """,
        tuple(normalized_ids),
    )
    rows = cursor.fetchall() or []
    details: Dict[int, Dict[str, Any]] = {}
    for row in rows:
        item_id = row.get("item_id")
        if item_id is None:
            continue
        details[int(item_id)] = {
            "item_id": int(item_id),
            "name": row.get("name"),
            "uom_customer": row.get("uom_customer"),
            "unit_packing": (
                float(row["unit_packing"]) if row.get("unit_packing") is not None else None
            ),
            "uom_packing": row.get("uom_packing"),
            "uom_production": row.get("uom_production"),
            "packing_to_production_rate": (
                float(row["packing_to_production_rate"])
                if row.get("packing_to_production_rate") is not None
                else None
            ),
        }
    return details


def _fetch_plated_parent_item_ids(cursor, item_ids: Iterable[int]) -> set[int]:
    normalized_ids = sorted({int(item_id) for item_id in item_ids if item_id is not None})
    if not normalized_ids:
        return set()
    placeholders = ", ".join(["%s"] * len(normalized_ids))
    cursor.execute(
        f"SELECT item_id FROM plated_items WHERE item_id IN ({placeholders})",
        tuple(normalized_ids),
    )
    rows = cursor.fetchall() or []
    return {int(row["item_id"]) for row in rows if row.get("item_id") is not None}


def _fetch_plated_components_by_parent_item(
    cursor, parent_item_ids: Iterable[int]
) -> Dict[int, List[Dict[str, Any]]]:
    normalized_ids = sorted({int(item_id) for item_id in parent_item_ids if item_id is not None})
    if not normalized_ids:
        return {}
    placeholders = ", ".join(["%s"] * len(normalized_ids))
    cursor.execute(
        f"""
        SELECT
            p.item_id AS parent_item_id,
            pic.component_item_id,
            pic.component_type_id,
            pic.quantity,
            i.name AS component_item_name,
            ct.name AS component_type_name
        FROM plated_items p
        JOIN plated_item_components pic ON p.plated_item_id = pic.plated_item_id
        LEFT JOIN items i ON pic.component_item_id = i.item_id
        LEFT JOIN component_types ct ON pic.component_type_id = ct.component_type_id
        WHERE p.item_id IN ({placeholders})
        ORDER BY p.item_id ASC, pic.id ASC
        """,
        tuple(normalized_ids),
    )
    rows = cursor.fetchall() or []
    components: Dict[int, List[Dict[str, Any]]] = {}
    for row in rows:
        parent_item_id = row.get("parent_item_id")
        if parent_item_id is None:
            continue
        components.setdefault(int(parent_item_id), []).append(
            {
                "component_item_id": (
                    int(row["component_item_id"])
                    if row.get("component_item_id") is not None
                    else None
                ),
                "component_type_id": (
                    int(row["component_type_id"])
                    if row.get("component_type_id") is not None
                    else None
                ),
                "quantity": float(row.get("quantity") or 0),
                "component_item_name": row.get("component_item_name"),
                "component_type_name": row.get("component_type_name"),
            }
        )
    return components


def _fetch_combo_components_by_combo_id(
    cursor, combo_ids: Iterable[int]
) -> Dict[int, List[Dict[str, Any]]]:
    normalized_ids = sorted({int(combo_id) for combo_id in combo_ids if combo_id is not None})
    if not normalized_ids:
        return {}
    placeholders = ", ".join(["%s"] * len(normalized_ids))
    cursor.execute(
        f"""
        SELECT
            ci.combo_id,
            ci.item_id AS component_item_id,
            ci.component_type_id,
            ci.quantity,
            i.name AS component_item_name,
            ct.name AS component_type_name
        FROM combo_items ci
        LEFT JOIN items i ON ci.item_id = i.item_id
        LEFT JOIN component_types ct ON ci.component_type_id = ct.component_type_id
        WHERE ci.combo_id IN ({placeholders})
        ORDER BY ci.combo_id ASC, ci.id ASC
        """,
        tuple(normalized_ids),
    )
    rows = cursor.fetchall() or []
    components: Dict[int, List[Dict[str, Any]]] = {}
    for row in rows:
        combo_id = row.get("combo_id")
        if combo_id is None:
            continue
        components.setdefault(int(combo_id), []).append(
            {
                "component_item_id": (
                    int(row["component_item_id"])
                    if row.get("component_item_id") is not None
                    else None
                ),
                "component_type_id": (
                    int(row["component_type_id"])
                    if row.get("component_type_id") is not None
                    else None
                ),
                "quantity": float(row.get("quantity") or 0),
                "component_item_name": row.get("component_item_name"),
                "component_type_name": row.get("component_type_name"),
            }
        )
    return components


def _append_production_issue(
    issues: List[Dict[str, Any]],
    *,
    issue_type: str,
    parent_name: str,
    required_units: float,
    component_type_name: Optional[str] = None,
    item_name: Optional[str] = None,
    detail: Optional[str] = None,
) -> None:
    issues.append(
        {
            "type": issue_type,
            "parent_name": parent_name,
            "item_name": item_name,
            "component_type_name": component_type_name,
            "required_units": round(required_units, 3),
            "detail": detail,
        }
    )


def _resolve_component_type_for_meal(
    resolved_default_ids: Dict[Tuple[str, int], int],
    resolved_default_names: Dict[Tuple[str, int], str],
    resolution_counts: Dict[Tuple[str, int], int],
    *,
    meal: str,
    component_type_id: Optional[int],
) -> Tuple[Optional[int], Optional[str], Optional[str]]:
    if component_type_id is None:
        return None, None, "Missing component type"
    key = (meal, int(component_type_id))
    count = resolution_counts.get(key, 0)
    if count == 1:
        return (
            resolved_default_ids.get(key),
            resolved_default_names.get(key),
            None,
        )
    if count == 0:
        return None, None, "No default item of the day found"
    return None, None, "Multiple default items found"


def _accumulate_production_item(
    aggregate: Dict[int, Dict[str, Any]],
    issues: List[Dict[str, Any]],
    *,
    parent_name: str,
    item_details: Dict[int, Dict[str, Any]],
    item_id: Optional[int],
    demand_units: float,
) -> None:
    if item_id is None:
        _append_production_issue(
            issues,
            issue_type="missing_item",
            parent_name=parent_name,
            required_units=demand_units,
            detail="Missing concrete item reference",
        )
        return

    detail = item_details.get(int(item_id))
    if not detail:
        _append_production_issue(
            issues,
            issue_type="missing_item_config",
            parent_name=parent_name,
            required_units=demand_units,
            item_name=f"Item #{item_id}",
            detail="Item not found in catalog",
        )
        return

    unit_packing = detail.get("unit_packing")
    conversion_rate = detail.get("packing_to_production_rate")
    uom_production = detail.get("uom_production")
    if unit_packing is None or conversion_rate is None or not uom_production:
        _append_production_issue(
            issues,
            issue_type="missing_unit_conversion",
            parent_name=parent_name,
            required_units=demand_units,
            item_name=detail.get("name"),
            detail="unit_packing, packing_to_production_rate, or uom_production is missing",
        )
        return

    production_quantity = demand_units * float(unit_packing) * float(conversion_rate)
    bucket = aggregate.setdefault(
        int(item_id),
        {
            "item_id": int(item_id),
            "item_name": detail.get("name"),
            "order_units": 0.0,
            "uom_customer": detail.get("uom_customer"),
            "unit_packing": float(unit_packing),
            "uom_packing": detail.get("uom_packing"),
            "uom_production": uom_production,
            "packing_to_production_rate": float(conversion_rate),
            "production_quantity": 0.0,
        },
    )
    bucket["order_units"] = float(bucket["order_units"]) + float(demand_units)
    bucket["production_quantity"] = float(bucket["production_quantity"]) + float(
        production_quantity
    )


@app.get("/api/production/day-plan", tags=["Production"])
def get_daily_production_plan(
    date: str,
    period_type: Optional[str] = Query(
        "one_day", description="Menu period to filter, e.g., one_day or subscription"
    ),
    city_code: Optional[str] = Query(None, alias="city_code"),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        resolved_city = _resolve_city_context(city_code, user)
        meals = get_food_meals_for_city(resolved_city)
        menu_rows = _fetch_production_menu_rows(cursor, date, resolved_city, period_type, meals)
        order_quantities = _fetch_order_quantities_by_menu_item(cursor, date, resolved_city)
        (
            resolved_default_ids,
            resolved_default_names,
            resolution_counts,
        ) = _build_default_item_resolution_map(cursor, date, resolved_city, period_type, meals)

        all_item_ids = {int(row["item_id"]) for row in menu_rows if row.get("item_id") is not None}
        plated_parent_ids = _fetch_plated_parent_item_ids(cursor, all_item_ids)
        combo_ids = {int(row["combo_id"]) for row in menu_rows if row.get("combo_id") is not None}

        plated_components = _fetch_plated_components_by_parent_item(cursor, plated_parent_ids)
        combo_components = _fetch_combo_components_by_combo_id(cursor, combo_ids)

        concrete_item_ids = set(all_item_ids)
        for component_rows in plated_components.values():
            for component in component_rows:
                if component.get("component_item_id") is not None:
                    concrete_item_ids.add(int(component["component_item_id"]))
        for component_rows in combo_components.values():
            for component in component_rows:
                if component.get("component_item_id") is not None:
                    concrete_item_ids.add(int(component["component_item_id"]))

        item_details = _fetch_item_unit_details(cursor, concrete_item_ids)

        rows_by_meal: Dict[str, List[Dict[str, Any]]] = {meal: [] for meal in meals}
        meal_status: Dict[str, Dict[str, bool]] = {
            meal: {"is_released": False, "is_production_generated": False} for meal in meals
        }
        for row in menu_rows:
            meal = row.get("meal")
            if meal not in rows_by_meal:
                continue
            rows_by_meal[meal].append(row)
            meal_status[meal] = {
                "is_released": bool(row.get("is_released")),
                "is_production_generated": bool(row.get("is_production_generated")),
            }

        response_meals: List[Dict[str, Any]] = []
        for meal in meals:
            aggregate: Dict[int, Dict[str, Any]] = {}
            issues: List[Dict[str, Any]] = []
            for row in rows_by_meal.get(meal, []):
                menu_item_id = row.get("menu_item_id")
                if menu_item_id is None:
                    continue
                ordered_units = float(order_quantities.get(int(menu_item_id), 0) or 0)
                if ordered_units <= 0:
                    continue
                parent_name = row.get("menu_entry_name") or f"Menu Item #{menu_item_id}"

                combo_id = row.get("combo_id")
                item_id = row.get("item_id")
                if combo_id is not None:
                    for component in combo_components.get(int(combo_id), []):
                        required_units = ordered_units * float(component.get("quantity") or 0)
                        if required_units <= 0:
                            continue
                        if component.get("component_item_id") is not None:
                            _accumulate_production_item(
                                aggregate,
                                issues,
                                parent_name=parent_name,
                                item_details=item_details,
                                item_id=int(component["component_item_id"]),
                                demand_units=required_units,
                            )
                        else:
                            resolved_item_id, _, resolution_error = (
                                _resolve_component_type_for_meal(
                                    resolved_default_ids,
                                    resolved_default_names,
                                    resolution_counts,
                                    meal=meal,
                                    component_type_id=component.get("component_type_id"),
                                )
                            )
                            if resolved_item_id is not None:
                                _accumulate_production_item(
                                    aggregate,
                                    issues,
                                    parent_name=parent_name,
                                    item_details=item_details,
                                    item_id=resolved_item_id,
                                    demand_units=required_units,
                                )
                                continue
                            _append_production_issue(
                                issues,
                                issue_type="unresolved_generic_component",
                                parent_name=parent_name,
                                required_units=required_units,
                                component_type_name=component.get("component_type_name"),
                                detail=resolution_error
                                or "Generic component still needs item-of-the-day resolution",
                            )
                    continue

                if item_id is None:
                    continue

                normalized_item_id = int(item_id)
                if normalized_item_id in plated_parent_ids:
                    for component in plated_components.get(normalized_item_id, []):
                        required_units = ordered_units * float(component.get("quantity") or 0)
                        if required_units <= 0:
                            continue
                        if component.get("component_item_id") is not None:
                            _accumulate_production_item(
                                aggregate,
                                issues,
                                parent_name=parent_name,
                                item_details=item_details,
                                item_id=int(component["component_item_id"]),
                                demand_units=required_units,
                            )
                        else:
                            resolved_item_id, _, resolution_error = (
                                _resolve_component_type_for_meal(
                                    resolved_default_ids,
                                    resolved_default_names,
                                    resolution_counts,
                                    meal=meal,
                                    component_type_id=component.get("component_type_id"),
                                )
                            )
                            if resolved_item_id is not None:
                                _accumulate_production_item(
                                    aggregate,
                                    issues,
                                    parent_name=parent_name,
                                    item_details=item_details,
                                    item_id=resolved_item_id,
                                    demand_units=required_units,
                                )
                                continue
                            _append_production_issue(
                                issues,
                                issue_type="unresolved_generic_component",
                                parent_name=parent_name,
                                required_units=required_units,
                                component_type_name=component.get("component_type_name"),
                                detail=resolution_error
                                or "Generic component still needs item-of-the-day resolution",
                            )
                    continue

                _accumulate_production_item(
                    aggregate,
                    issues,
                    parent_name=parent_name,
                    item_details=item_details,
                    item_id=normalized_item_id,
                    demand_units=ordered_units,
                )

            meal_items = sorted(
                (
                    {
                        **value,
                        "order_units": round(float(value["order_units"]), 3),
                        "production_quantity": round(float(value["production_quantity"]), 3),
                    }
                    for value in aggregate.values()
                ),
                key=lambda item: (item.get("item_name") or "").lower(),
            )
            response_meals.append(
                {
                    "meal": meal,
                    "is_released": meal_status[meal]["is_released"],
                    "is_production_generated": meal_status[meal]["is_production_generated"],
                    "items": meal_items,
                    "issues": issues,
                }
            )

        return {
            "date": date,
            "city_code": resolved_city,
            "period_type": period_type,
            "meals": response_meals,
        }
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.get("/api/production/orders-summary", tags=["Production"])
def get_production_orders_summary(
    date: str,
    menu_type: Optional[str] = Query(
        None, description="BLD type to filter (Breakfast/Lunch/Dinner/Condiments)"
    ),
    period_type: Optional[str] = Query(
        "one_day", description="Menu period to filter, e.g., one_day or subscription"
    ),
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
        clause_params: List[Any] = [
            date,
            normalized_period,
            normalized_period,
            resolved_city,
        ]

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


@app.post("/api/production/plated-expand-preview", tags=["Production"])
def preview_plated_item_expansion(
    payload: PlatedExpansionPreviewPayload,
    user: Dict[str, Any] = Depends(admin_required),
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        normalized_input: Dict[int, float] = {}
        for entry in payload.items:
            normalized_input[entry.item_id] = normalized_input.get(entry.item_id, 0.0) + float(
                entry.quantity
            )

        expanded_result = expand_plated_quantities(cursor, normalized_input)
        expanded_quantities = expanded_result.get("item_quantities", {})
        unresolved_component_types = expanded_result.get("unresolved_component_types", [])
        if not expanded_quantities and not unresolved_component_types:
            return {"items": [], "expanded_items": [], "unresolved_component_types": []}

        item_ids = sorted(expanded_quantities.keys())
        placeholders = ", ".join(["%s"] * len(item_ids))
        cursor.execute(
            f"""
            SELECT item_id,
                   name,
                   uom_customer,
                   unit_packing,
                   uom_packing,
                   uom_production,
                   packing_to_production_rate
              FROM items
             WHERE item_id IN ({placeholders})
             ORDER BY name ASC
            """,
            tuple(item_ids),
        )
        item_rows = {
            int(row["item_id"]): row
            for row in (cursor.fetchall() or [])
            if row.get("item_id") is not None
        }

        expanded_items = []
        for item_id in item_ids:
            row = item_rows.get(item_id, {})
            expanded_qty = float(expanded_quantities[item_id])
            unit_packing = row.get("unit_packing")
            conversion_rate = row.get("packing_to_production_rate")
            production_quantity = None
            if unit_packing is not None and conversion_rate is not None:
                production_quantity = expanded_qty * float(unit_packing) * float(conversion_rate)

            expanded_items.append(
                {
                    "item_id": item_id,
                    "name": row.get("name"),
                    "expanded_quantity": expanded_qty,
                    "uom_customer": row.get("uom_customer"),
                    "unit_packing": float(unit_packing) if unit_packing is not None else None,
                    "uom_packing": row.get("uom_packing"),
                    "uom_production": row.get("uom_production"),
                    "packing_to_production_rate": (
                        float(conversion_rate) if conversion_rate is not None else None
                    ),
                    "production_quantity": production_quantity,
                }
            )

        return {
            "items": [
                {"item_id": entry.item_id, "quantity": float(entry.quantity)}
                for entry in payload.items
            ],
            "expanded_items": expanded_items,
            "unresolved_component_types": unresolved_component_types,
        }
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.get("/api/menu", tags=["Daily Menu"])
def get_daily_menu(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD"),
    bld_type: Optional[str] = Query(
        None, description="BLD type: Breakfast, Lunch, Dinner, Condiments"
    ),
    period_type: Optional[str] = Query(
        None,
        description="Period type: one_day, subscription, all_days, or null for festivals",
    ),
    city_code: Optional[str] = Query(None, alias="city_code"),
    menu_type: Optional[str] = Query(MENU_TYPE_ONE_DAY, alias="menu_type"),
    include_combos: bool = Query(
        False,
        description="When true, includes combo menu rows in the response",
    ),
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
    return _get_daily_menu_internal(
        date,
        target_bld_type,
        period_type,
        resolved_city,
        resolved_menu_type,
        include_combos=include_combos,
    )


@app.post("/api/orders/quote", tags=["Orders"])
def quote_order(payload: OrderQuotePayload):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must include at least one item")
    db = get_db()
    cursor = db.cursor()
    try:
        totals = _compute_order_totals(cursor, payload.items, payload.coupon_codes)
        return totals
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


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

        totals = _compute_order_totals(cursor, payload.items, payload.coupon_codes)

        normalized_method = (payload.payment_method or "").strip()
        paid_flag = 1 if normalized_method.lower() in {"upi", "card", "online"} else 0
        initial_status = ORDER_STATUS_CONFIRMED if paid_flag else ORDER_STATUS_PENDING
        stored_status = initial_status if paid_flag else f"{initial_status} (Payment Due)"

        cursor.execute(
            """
            INSERT INTO orders (customer_id, address_id, total_price, payment_method, order_date, status, order_type, paid, discount, cgst, sgst)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                payload.customer_id,
                address_id,
                float(totals["total_price"]),
                payload.payment_method,
                payload.order_date,
                stored_status,
                payload.order_type or "one_time",
                paid_flag,
                float(totals["discount"]),
                float(totals["cgst"]),
                float(totals["sgst"]),
            ),
        )
        order_id = cursor.lastrowid

        cursor.executemany(
            """
            INSERT INTO order_items (order_id, item_id, combo_id, menu_item_id, meal_type, quantity, price)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            [
                (
                    order_id,
                    item.item_id,
                    item.combo_id,
                    item.menu_item_id,
                    item.meal_type,
                    item.quantity,
                    float(item.price),
                )
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
            "total_price": float(totals["total_price"]),
            "subtotal": float(totals["subtotal"]),
            "discount": float(totals["discount"]),
            "cgst": float(totals["cgst"]),
            "sgst": float(totals["sgst"]),
            "coupon_codes": totals["coupon_codes"],
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
                   COALESCE(i.name, co.combo_name) AS item_name
              FROM order_items oi
              LEFT JOIN items i ON oi.item_id = i.item_id
              LEFT JOIN combos co ON oi.combo_id = co.combo_id
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
                {
                    "bld_id": r["bld_id"],
                    "menu_type": r["bld_type"],
                    "is_generated": bool(r["is_generated"]),
                }
                for r in rows
            ],
        }
    finally:
        cursor.close()
        db.close()


def _persist_plan_items(
    cursor,
    menu_id: int,
    plans: Optional[List[ProductionPlanItem]],
) -> int:
    if not plans:
        return 0

    updated = 0
    for plan in plans:
        item_name = (plan.item_name or "").strip()
        if not item_name:
            continue

        planned_value = max(float(plan.planned_quantity or 0), 0.0)
        buffer_value = max(float(plan.buffer_quantity or 0), 0.0)
        final_value = max(
            float(
                plan.final_quantity
                if plan.final_quantity is not None
                else planned_value + buffer_value
            ),
            0.0,
        )
        available_input = plan.available_quantity
        if available_input is None:
            available_input = final_value - buffer_value
        available_value = max(0.0, min(float(available_input), final_value))

        cursor.execute(
            """
            UPDATE menu_items mi
            JOIN items i ON mi.item_id = i.item_id
               SET mi.max_qty = %s,
                   mi.buffer_qty = %s,
                   mi.final_qty = %s,
                   mi.available_qty = %s
             WHERE mi.menu_id = %s
               AND LOWER(i.name) = LOWER(%s)
            """,
            (
                planned_value,
                buffer_value,
                final_value,
                available_value,
                menu_id,
                item_name,
            ),
        )
        updated += cursor.rowcount

    return updated
