"""Shared helper utilities for the Kuteera Kitchen backend.

These functions are used across multiple routers and were previously
inlined in main.py.
"""

from __future__ import annotations

import re
from collections import defaultdict
from datetime import date, datetime
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

from fastapi import HTTPException

from ..city_config import (
    CityCode,
    DEFAULT_CITY,
    normalize_city_code,
    city_supports_food,
    city_supports_condiments,
)

# ---------------------------------------------------------------------------
# City / label helpers
# ---------------------------------------------------------------------------

CITY_NAME_TO_CODE: Dict[str, str] = {
    "mysore": "MYS",
    "mysuru": "MYS",
    "blr": "BLR",
    "bangalore": "BLR",
    "bengaluru": "BLR",
}

CITY_CODE_TO_LABEL: Dict[str, str] = {
    "MYS": "Mysore",
    "BLR": "Bangalore",
}


def _resolve_city_code(label: Optional[str], code: Optional[str]) -> CityCode:
    """Resolve a CityCode from a label string or explicit code string.

    Args:
        label: Human-readable city name (e.g. "Mysore").
        code: City code override (e.g. "MYS").

    Returns:
        Normalised CityCode.
    """
    if code:
        return normalize_city_code(code)
    if label:
        mapped = CITY_NAME_TO_CODE.get(label.strip().lower())
        if mapped:
            return normalize_city_code(mapped)
    return DEFAULT_CITY


def _normalize_city_label(label: Optional[str], city_code: CityCode) -> str:
    """Return a human-readable city label, falling back to the code label map.

    Args:
        label: Raw label from request (may be empty/None).
        city_code: Resolved city code.

    Returns:
        Display label string.
    """
    if label:
        stripped = label.strip()
        if stripped:
            return stripped
    return CITY_CODE_TO_LABEL.get(city_code, city_code)


def _resolve_city_context(city_override: Optional[str], user: Optional[Dict[str, Any]]) -> CityCode:
    """Pick the effective city: explicit override > user token city > default.

    Args:
        city_override: Optional query-param city_code from the request.
        user: Decoded JWT payload dict (may be None for unauthenticated requests).

    Returns:
        Normalised CityCode.
    """
    if city_override:
        return normalize_city_code(city_override)
    if user:
        code = user.get("city_code")
        if isinstance(code, str) and code.strip():
            return normalize_city_code(code)
    return DEFAULT_CITY


def _customer_has_city(cursor, customer_id: int, city_code: CityCode) -> bool:
    """Check whether a customer has at least one address in the given city.

    Args:
        cursor: Database cursor.
        customer_id: Customer to check.
        city_code: Target city code.

    Returns:
        True if a matching address row exists.
    """
    cursor.execute(
        "SELECT 1 FROM addresses WHERE customer_id=%s AND city_code=%s LIMIT 1",
        (customer_id, city_code),
    )
    return cursor.fetchone() is not None


# ---------------------------------------------------------------------------
# Datetime helpers
# ---------------------------------------------------------------------------


def _format_datetime(dt: Optional[datetime]) -> Optional[str]:
    """Format a datetime to ISO 8601 string or None.

    Args:
        dt: Datetime object to format.

    Returns:
        ISO 8601 string or None.
    """
    if dt is None:
        return None
    return dt.isoformat()


def _parse_optional_date(value: Optional[str]) -> Optional[date]:
    """Parse an optional YYYY-MM-DD date string, raising 400 on bad input.

    Args:
        value: Date string or None.

    Returns:
        date object or None.
    """
    if value is None:
        return None
    stripped = value.strip()
    if not stripped:
        return None
    try:
        return datetime.strptime(stripped, "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.") from exc


def _normalize_menu_date(raw: Optional[str]) -> str:
    """Parse a menu date string; defaults to today when None.

    Args:
        raw: Optional YYYY-MM-DD string.

    Returns:
        ISO date string.
    """
    if raw:
        try:
            return datetime.strptime(raw, "%Y-%m-%d").date().isoformat()
        except ValueError as exc:
            raise HTTPException(
                status_code=400, detail="Invalid date format. Use YYYY-MM-DD."
            ) from exc
    return date.today().isoformat()


# ---------------------------------------------------------------------------
# Meal / BLD helpers
# ---------------------------------------------------------------------------

MEAL_NORMALIZATION_MAP: Dict[str, str] = {
    "breakfast": "Breakfast",
    "lunch": "Lunch",
    "dinner": "Dinner",
    "condiments": "Condiments",
}

CONDIMENTS_BLD_TYPE = "Condiments"

MENU_TYPE_ONE_DAY = "ONE_DAY"
MENU_TYPE_CONDIMENTS = "CONDIMENTS"
MENU_TYPE_SUBSCRIPTION = "SUBSCRIPTION"
VALID_MENU_TYPES: Set[str] = {MENU_TYPE_ONE_DAY, MENU_TYPE_CONDIMENTS, MENU_TYPE_SUBSCRIPTION}
MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Condiments"]


def normalize_meal_type(raw: Optional[str]) -> str:
    """Normalise a BLD type string to its canonical capitalised form.

    Args:
        raw: Raw meal-type string from the request.

    Returns:
        Canonical meal type string (e.g. "Breakfast").
    """
    if raw is None:
        raise HTTPException(status_code=400, detail="BLD type is required")
    cleaned = raw.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="BLD type is required")
    return MEAL_NORMALIZATION_MAP.get(cleaned.lower(), cleaned)


def normalize_menu_type(value: Optional[str]) -> str:
    """Normalise and validate a menu_type string.

    Args:
        value: Raw menu_type from the request.

    Returns:
        One of "ONE_DAY", "CONDIMENTS", or "SUBSCRIPTION".
    """
    if not value:
        return MENU_TYPE_ONE_DAY
    upper = value.strip().upper()
    if upper in VALID_MENU_TYPES:
        return upper
    raise HTTPException(status_code=400, detail="Invalid menu_type")


def ensure_menu_allowed(city_code: CityCode, menu_type: str) -> None:
    """Raise 400 if the given menu_type is not supported for the city.

    Args:
        city_code: Target city.
        menu_type: Validated menu type constant.
    """
    if menu_type in {MENU_TYPE_ONE_DAY, MENU_TYPE_SUBSCRIPTION} and not city_supports_food(
        city_code
    ):
        raise HTTPException(status_code=400, detail="This city does not support food menus yet.")
    if menu_type == MENU_TYPE_CONDIMENTS and not city_supports_condiments(city_code):
        raise HTTPException(
            status_code=400, detail="This city does not support condiments menus yet."
        )


def get_food_meals_for_city(city_code: CityCode) -> List[str]:
    """Return the food meal names supported by a city.

    Args:
        city_code: Target city code.

    Returns:
        List of meal name strings.
    """
    if not city_supports_food(city_code):
        return []
    return ["Breakfast", "Lunch", "Dinner"]


def get_supported_meals_for_city(city_code: CityCode) -> List[str]:
    """Return all meal types supported by a city (food + condiments).

    Args:
        city_code: Target city code.

    Returns:
        List of meal name strings.
    """
    meals = get_food_meals_for_city(city_code)
    if city_supports_condiments(city_code):
        meals.append("Condiments")
    return meals


def default_delivers_by_for_meal(canonical_bld_type: str) -> Optional[str]:
    """Return the default delivery time string for a meal type.

    Args:
        canonical_bld_type: One of Breakfast/Lunch/Dinner.

    Returns:
        Time string or None.
    """
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
    """Return the effective delivery time for a meal, respecting any override.

    Args:
        canonical_bld_type: Canonical meal name string.
        override_value: Optional override from the request payload.

    Returns:
        Time string or None.
    """
    if override_value is not None:
        value = override_value.strip()
        return value or None
    return default_delivers_by_for_meal(canonical_bld_type)


# ---------------------------------------------------------------------------
# Order status helpers
# ---------------------------------------------------------------------------

ORDER_STATUS_CONFIRMED = "Confirmed"
ORDER_STATUS_DISPATCHED = "Dispatched"
ORDER_STATUS_DELIVERED = "Delivered"
ORDER_STATUS_CANCELLED = "Cancelled"

_ORDER_STATUS_ALIASES: Dict[str, str] = {
    "pending": ORDER_STATUS_CONFIRMED,
    "payment due": ORDER_STATUS_CONFIRMED,
    "awaiting payment": ORDER_STATUS_CONFIRMED,
    "confirmed - payment due": ORDER_STATUS_CONFIRMED,
    "confirmed but needs to pay": ORDER_STATUS_CONFIRMED,
    "confirmed (payment due)": ORDER_STATUS_CONFIRMED,
    "confirmed": ORDER_STATUS_CONFIRMED,
    "preparing": ORDER_STATUS_CONFIRMED,
    "in progress": ORDER_STATUS_DISPATCHED,
    "processing": ORDER_STATUS_CONFIRMED,
    "on the way": ORDER_STATUS_DISPATCHED,
    "out for delivery": ORDER_STATUS_DISPATCHED,
    "en route": ORDER_STATUS_DISPATCHED,
    "dispatched": ORDER_STATUS_DISPATCHED,
    "delivered": ORDER_STATUS_DELIVERED,
    "completed": ORDER_STATUS_DELIVERED,
    "complete": ORDER_STATUS_DELIVERED,
    "cancelled": ORDER_STATUS_CANCELLED,
    "canceled": ORDER_STATUS_CANCELLED,
}

ORDER_STATUS_ALLOWED = set(_ORDER_STATUS_ALIASES.values())
PENDING_ORDER_STATUS_NAMES: Set[str] = {
    ORDER_STATUS_CONFIRMED.lower(),
    ORDER_STATUS_DISPATCHED.lower(),
    "pending",
}


def normalize_order_status(value: str) -> str:
    """Normalise an order status string to the canonical form, raising 400 on unknown values.

    Args:
        value: Raw status string from the request.

    Returns:
        Canonical status string.
    """
    key = value.strip().lower()
    base = key.replace(" (payment due)", "")
    if not base:
        raise HTTPException(status_code=400, detail="Status is required")
    normalized = _ORDER_STATUS_ALIASES.get(base) or _ORDER_STATUS_ALIASES.get(key)
    if not normalized:
        raise HTTPException(status_code=400, detail=f"Unsupported status '{value}'")
    return normalized


def normalize_status_for_response(value: Optional[str]) -> str:
    """Safely normalise a status for API response output, falling back gracefully.

    Args:
        value: Raw status string (may be None).

    Returns:
        Normalised status string.
    """
    try:
        return normalize_order_status(value or "")
    except HTTPException:
        return value or ORDER_STATUS_CONFIRMED


def payment_status_label(paid: Optional[bool]) -> str:
    """Return the admin-facing payment label for an order.

    Args:
        paid: Whether the order is marked paid.

    Returns:
        ``"Payment Done"`` when paid, else ``"Payment Due"``.
    """
    return "Payment Done" if paid else "Payment Due"


def format_status_with_payment(status: Optional[str], paid: Optional[bool]) -> str:
    """Return a legacy combined status label.

    Args:
        status: Raw status string.
        paid: Whether the order has been paid.

    Returns:
        Canonical status string, optionally suffixed with ``"(Payment Due)"``.
    """
    base = normalize_status_for_response(status)
    if paid:
        return base
    if base != ORDER_STATUS_CONFIRMED or "payment due" in base.lower():
        return base
    return f"{base} (Payment Due)"


def _bulk_update_order_status_for_date(
    cursor,
    target_date: str,
    city_code: CityCode,
    new_status: str,
    allowed_previous_statuses: Iterable[str],
) -> int:
    """Bulk-update orders matching date/city from a set of previous statuses.

    Args:
        cursor: Database cursor.
        target_date: YYYY-MM-DD date string.
        city_code: City to scope the update.
        new_status: Target status value.
        allowed_previous_statuses: Only update orders currently in these statuses.

    Returns:
        Number of rows updated.
    """
    normalized_previous = sorted({status.lower() for status in allowed_previous_statuses if status})
    if not normalized_previous:
        return 0
    placeholders = ", ".join(["%s"] * len(normalized_previous))
    params = [new_status, target_date, city_code, *normalized_previous]
    status_compare_expr = "LOWER(REPLACE(COALESCE(o.status, ''), ' (Payment Due)', ''))"
    cursor.execute(
        f"""
        UPDATE orders o
        JOIN addresses a ON o.address_id = a.address_id
           SET o.status = %s
         WHERE DATE(o.created_at) = %s
           AND a.city_code = %s
           AND {status_compare_expr} IN ({placeholders})
        """,
        tuple(params),
    )
    return cursor.rowcount


# ---------------------------------------------------------------------------
# Generic row-value helper
# ---------------------------------------------------------------------------


def _row_value(row: Any, key: str, index: int = 0) -> Optional[int]:
    """Extract an integer value from a dict or tuple row.

    Args:
        row: Row from cursor.fetchone() (dict or tuple).
        key: Dict key to look up if row is a dict.
        index: Tuple index to use if row is a tuple.

    Returns:
        Integer value or None.
    """
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


def _normalize_int_list(values: Iterable[Any]) -> List[int]:
    """Convert an iterable of mixed values to a list of positive ints.

    Args:
        values: Iterable of values to normalize.

    Returns:
        List of positive integers.
    """
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


# ---------------------------------------------------------------------------
# BLD / meal database helpers
# ---------------------------------------------------------------------------


def resolve_bld_id(cursor, bld_type: str) -> int:
    """Look up the bld_id for a canonical meal type, raising 404 if missing.

    Args:
        cursor: Database cursor.
        bld_type: Canonical meal type string.

    Returns:
        Integer bld_id.
    """
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


def _validate_bld_ids(cursor, bld_ids: Iterable[Any]) -> List[int]:
    """Validate that a list of bld_ids all exist in the database.

    Args:
        cursor: Database cursor.
        bld_ids: Iterable of bld_id values.

    Returns:
        Sorted list of valid bld_ids.
    """
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
    """Fetch all bld_ids assigned to an item.

    Args:
        cursor: Database cursor.
        item_id: Item to look up.

    Returns:
        Sorted list of bld_ids.
    """
    cursor.execute(
        "SELECT bld_id FROM item_bld_map WHERE item_id = %s ORDER BY bld_id",
        (item_id,),
    )
    rows = cursor.fetchall() or []
    return [value for value in (_row_value(row, "bld_id", 0) for row in rows) if value is not None]


def set_item_blds(cursor, item_id: int, bld_ids: List[int]) -> None:
    """Replace the bld_id assignments for an item.

    Args:
        cursor: Database cursor.
        item_id: Item to update.
        bld_ids: New list of bld_ids.
    """
    cursor.execute("DELETE FROM item_bld_map WHERE item_id = %s", (item_id,))
    if not bld_ids:
        return
    values = [(item_id, bld_id) for bld_id in bld_ids]
    cursor.executemany(
        "INSERT INTO item_bld_map (item_id, bld_id) VALUES (%s, %s)",
        values,
    )


def attach_bld_ids(cursor, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Attach a bld_ids list to each item dict in-place.

    Args:
        cursor: Database cursor.
        items: List of item dicts to enrich.

    Returns:
        The same list with bld_ids populated.
    """
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
    """Fetch all bld_ids assigned to a combo.

    Args:
        cursor: Database cursor.
        combo_id: Combo to look up.

    Returns:
        Sorted list of bld_ids.
    """
    cursor.execute(
        "SELECT bld_id FROM combo_bld_map WHERE combo_id = %s ORDER BY bld_id",
        (combo_id,),
    )
    rows = cursor.fetchall() or []
    return [value for value in (_row_value(row, "bld_id", 0) for row in rows) if value is not None]


def set_combo_blds(cursor, combo_id: int, bld_ids: List[int]) -> None:
    """Replace the bld_id assignments for a combo.

    Args:
        cursor: Database cursor.
        combo_id: Combo to update.
        bld_ids: New list of bld_ids.
    """
    cursor.execute("DELETE FROM combo_bld_map WHERE combo_id = %s", (combo_id,))
    if not bld_ids:
        return
    values = [(combo_id, bld_id) for bld_id in bld_ids]
    cursor.executemany(
        "INSERT INTO combo_bld_map (combo_id, bld_id) VALUES (%s, %s)",
        values,
    )


def attach_combo_bld_ids(cursor, combos: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Attach a bld_ids list to each combo dict in-place.

    Args:
        cursor: Database cursor.
        combos: List of combo dicts to enrich.

    Returns:
        The same list with bld_ids populated.
    """
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
    """Check whether an item's BLD assignments indicate it is a condiment.

    Args:
        bld_ids: Iterable of bld_id values for the item.
        condiments_bld_id: The bld_id that represents condiments.

    Returns:
        True if the item is a condiment.
    """
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
    """Raise 400 if an item is simultaneously a condiment and a food meal.

    Args:
        bld_ids: BLD IDs assigned to the item.
        condiments_bld_id: BLD ID for condiments.
    """
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


# ---------------------------------------------------------------------------
# Item helpers
# ---------------------------------------------------------------------------


def filter_items_by_bld(items: List[Dict[str, Any]], bld_id: int) -> List[Dict[str, Any]]:
    """Filter items to only those that include a specific bld_id.

    Args:
        items: List of item dicts (must have bld_ids populated).
        bld_id: BLD ID to filter by.

    Returns:
        Filtered list.
    """
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
    """Attach an is_plated boolean flag to each item dict in-place.

    Args:
        cursor: Database cursor.
        items: List of item dicts to enrich.
    """
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


def _resolve_category_id_by_name(cursor, category_name: str) -> Optional[int]:
    """Look up a category_id by name (case-insensitive).

    Args:
        cursor: Database cursor.
        category_name: Category name to look up.

    Returns:
        category_id integer or None.
    """
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
    """Raise 400 if any component_type_id values do not exist in the database.

    Args:
        cursor: Database cursor.
        component_type_ids: Iterable of IDs to validate.
    """
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
    """Raise 400 if a non-condiment item is missing component_type_id.

    Args:
        is_condiment_item: Whether this item is a condiment.
        component_type_id: The component_type_id value (or None).
    """
    if is_condiment_item:
        return
    if component_type_id is None:
        raise HTTPException(
            status_code=400,
            detail="component_type_id is required for non-condiment items",
        )


def _build_item_detail_columns(available_columns: Set[str]) -> List[str]:
    """Build the SELECT column list for item detail queries based on available schema columns.

    Args:
        available_columns: Set of column names present in the items table.

    Returns:
        List of SQL column expressions.
    """

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
    """Fetch a single item's full detail row.

    Args:
        cursor: Database cursor.
        item_id: Item to fetch.
        available_columns: Set of columns present in the items table.

    Returns:
        Item dict or None.
    """
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


def _normalize_item_payload_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise string, int, float, and bool fields from an item payload dict.

    Args:
        data: Raw dict from a Pydantic model dump.

    Returns:
        Cleaned dict with type-coerced values.
    """
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
        "condiment_type_id",
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


_ITEMS_COLUMNS: Optional[Set[str]] = None


def get_items_columns(cursor: Any) -> Set[str]:
    """Return the cached set of column names for the items table.

    Fetches from the database exactly once per process lifetime; all subsequent
    calls return the cached set without touching the DB.

    Args:
        cursor: Database cursor (used only on the first call).

    Returns:
        Set of column name strings present in the items table.
    """
    global _ITEMS_COLUMNS
    if _ITEMS_COLUMNS is None:
        cursor.execute("SHOW COLUMNS FROM items")
        _ITEMS_COLUMNS = {row["Field"] for row in cursor.fetchall()}
    return _ITEMS_COLUMNS


def _item_column_field_map(available_columns: Set[str]) -> Dict[str, str]:
    """Build a mapping of payload field names to DB column names (only for available columns).

    Args:
        available_columns: Set of column names present in the items table.

    Returns:
        Dict mapping field name to column name.
    """
    field_map = {
        "name": "name",
        "description": "description",
        "alias": "alias",
        "category_id": "category_id",
        "condiment_type_id": "condiment_type_id",
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


# ---------------------------------------------------------------------------
# Menu type column guard
# ---------------------------------------------------------------------------

_MENU_HAS_TYPE_COLUMN: Optional[bool] = None


def _ensure_menu_type_column(db) -> None:
    """Ensure the menu.menu_type column exists, creating it via ALTER TABLE if absent.

    Args:
        db: mysql.connector connection object.
    """
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

        cursor.execute("SHOW COLUMNS FROM menu LIKE 'date'")
        row = cursor.fetchone()
        if row and row[2] == "NO":
            cursor.execute("ALTER TABLE menu MODIFY date DATE NULL")
            db.commit()

        cursor.execute("SHOW COLUMNS FROM menu_items LIKE 'component_type_id'")
        if cursor.fetchone() is None:
            cursor.execute("ALTER TABLE menu_items ADD COLUMN component_type_id INT NULL")
            db.commit()

        _MENU_HAS_TYPE_COLUMN = True
    finally:
        cursor.close()


# ---------------------------------------------------------------------------
# Delivery routes table guard
# ---------------------------------------------------------------------------


def _ensure_delivery_routes_table(db) -> None:
    """Ensure the delivery_routes table exists, creating it if absent.

    Args:
        db: mysql.connector connection object.
    """
    cursor = db.cursor()
    try:
        cursor.execute(
            """
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
            """
        )
        db.commit()
    finally:
        cursor.close()


# ---------------------------------------------------------------------------
# Production plan helpers
# ---------------------------------------------------------------------------


def _persist_plan_items(
    cursor,
    menu_id: int,
    plans: Optional[list],
) -> int:
    """Persist production plan quantities to menu_items rows.

    Args:
        cursor: Database cursor.
        menu_id: Menu to update.
        plans: List of ProductionPlanItem-like objects (must have item_name and quantity fields).

    Returns:
        Number of rows updated.
    """
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
