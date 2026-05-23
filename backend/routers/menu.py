"""Menu router: daily menu setup, available items, release/unrelease."""

from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

import mysql.connector
from mysql.connector import errorcode
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ..db import get_raw_db
from ..city_config import DEFAULT_CITY, normalize_city_code
from ..utils.auth_deps import get_optional_user
from ..utils.helpers import (
    CONDIMENTS_BLD_TYPE,
    MENU_TYPE_ONE_DAY,
    MENU_TYPE_CONDIMENTS,
    MENU_TYPE_SUBSCRIPTION,
    _is_condiment_from_blds,
    attach_bld_ids,
    attach_plated_flags,
    attach_combo_bld_ids,
    resolve_bld_id,
    normalize_meal_type,
    normalize_menu_type,
    ensure_menu_allowed,
    resolve_delivers_by_value,
    filter_items_by_bld,
    _resolve_city_context,
)
from ..utils.logger import log_admin_action

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class MenuItemPayload(BaseModel):
    """Payload for a single item entry within a daily menu."""

    item_id: Optional[int] = None
    combo_id: Optional[int] = None
    component_type_id: Optional[int] = None
    category_id: Optional[int] = None
    max_qty: Optional[int] = None
    available_qty: Optional[int] = None
    rate: float
    is_default: bool = False
    sort_order: Optional[int] = None


class DailyMenuPayload(BaseModel):
    """Payload for creating or updating a daily menu."""

    date: Optional[str] = None
    bld_type: str
    is_festival: bool = False
    period_type: Optional[str] = None
    items: List[MenuItemPayload]
    city_code: Optional[str] = None
    menu_type: Optional[str] = None
    delivers_by: Optional[str] = None


class SubscriptionPausePayload(BaseModel):
    """Payload for creating or updating a customer subscription pause window."""

    customer_id: int
    order_id: Optional[int] = None
    start_date: str
    end_date: str
    meal_type: Optional[str] = None
    reason: Optional[str] = None
    city_code: Optional[str] = None


# ---------------------------------------------------------------------------
# Internal helper
# ---------------------------------------------------------------------------


def _get_daily_menu_internal(
    date: Optional[str],
    bld_type: str,
    period_type: Optional[str],
    city_code: str,
    menu_type: str,
    include_combos: bool = False,
) -> Dict[str, Any]:
    """Fetch the full menu record for a given date/meal/city combination.

    Args:
        date: Service date in YYYY-MM-DD format (required for ONE_DAY menus).
        bld_type: Meal type string (Breakfast, Lunch, Dinner, Condiments).
        period_type: Menu period type (one_day, subscription, etc.).
        city_code: City code to filter by.
        menu_type: Menu type (ONE_DAY or CONDIMENTS).
        include_combos: When True, includes combo items in the menu.

    Returns:
        Dict with menu metadata and nested items list.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
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
        elif resolved_menu_type == MENU_TYPE_SUBSCRIPTION:
            where_clauses.append("date IS NULL")
            where_clauses.append("period_type = 'subscription'")
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

        items_query = """
            SELECT
                mi.menu_item_id,
                mi.item_id,
                mi.combo_id,
                COALESCE(i.name, c.combo_name, ct_menu.name) AS item_name,
                COALESCE(i.component_type_id, mi.component_type_id) AS component_type_id,
                COALESCE(ct.name, ct_menu.name) AS component_type_name,
                COALESCE(i.uom_customer, CASE WHEN mi.combo_id IS NOT NULL THEN 'combo' ELSE 'item_group' END) AS uom,
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
                mi.discount_pct,
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
            LEFT JOIN component_types ct_menu ON mi.component_type_id = ct_menu.component_type_id
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


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/api/menu/available-items")
def get_available_items(
    bld_type: str = Query(..., description="BLD type: Breakfast, Lunch, Dinner, Condiments"),
    include_combos: bool = Query(
        False,
        description="When true, includes combo products mapped to the selected meal",
    ),
) -> List[Dict[str, Any]]:
    """Return all available items for a given meal type.

    Args:
        bld_type: BLD type to filter items by (Breakfast, Lunch, Dinner, Condiments).
        include_combos: When true, also includes combo products for the meal.

    Returns:
        List of item dicts with bld_ids, is_combo, is_plated flags.
    """
    db = get_raw_db()
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
                cat.category_name,
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
            LEFT JOIN categories cat ON i.category_id = cat.category_id
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
                        cat.category_name,
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
                    LEFT JOIN categories cat ON i.category_id = cat.category_id
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
                cat.category_name,
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
            LEFT JOIN categories cat ON c.category_id = cat.category_id
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


@router.get("/api/menu/low-stock-alerts")
def get_low_stock_alerts(
    city_code: Optional[str] = Query(None),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
) -> List[Dict[str, Any]]:
    """Return today's released menu items where available_qty is at or below 10% of final_qty.

    Args:
        city_code: City to filter by; falls back to the authenticated user's city.
        user: Optional authenticated user (injected).

    Returns:
        List of dicts with menu_item_id, item_name, available_qty, final_qty, and menu_id.
    """
    resolved_city = _resolve_city_context(city_code, user)
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT
                mi.menu_item_id,
                COALESCE(i.name, c.combo_name) AS item_name,
                mi.available_qty,
                mi.max_qty,
                mi.menu_id
            FROM menu_items mi
            JOIN menu m ON m.menu_id = mi.menu_id
            LEFT JOIN items i ON i.item_id = mi.item_id
            LEFT JOIN combos c ON c.combo_id = mi.combo_id
            WHERE m.city_code = %s
              AND m.date = CURDATE()
              AND m.is_released = 1
              AND m.menu_type = 'ONE_DAY'
              AND mi.max_qty > 0
              AND mi.available_qty <= mi.max_qty * 0.20
            ORDER BY mi.available_qty ASC
            """,
            (resolved_city,),
        )
        return cursor.fetchall() or []
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.get("/api/menu")
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
) -> Dict[str, Any]:
    """Return the daily menu for a given date, meal type, and city.

    Args:
        date: Service date in YYYY-MM-DD format (required for ONE_DAY menus).
        bld_type: Meal type (Breakfast, Lunch, Dinner, Condiments).
        period_type: Menu period type.
        city_code: City to fetch menu for; defaults to admin's active city.
        menu_type: Menu type (ONE_DAY, CONDIMENTS, or SUBSCRIPTION).
        include_combos: When true, includes combo items in the response.
        user: Optional authenticated user (injected).

    Returns:
        Dict with menu metadata and nested items list.
    """
    resolved_city = _resolve_city_context(city_code, user)
    resolved_menu_type = normalize_menu_type(menu_type)
    target_bld_type = bld_type or CONDIMENTS_BLD_TYPE
    if resolved_menu_type == MENU_TYPE_ONE_DAY and not date:
        raise HTTPException(status_code=400, detail="date is required for ONE_DAY menus")
    if resolved_menu_type == MENU_TYPE_SUBSCRIPTION and not bld_type:
        raise HTTPException(status_code=400, detail="bld_type is required for subscription menus")
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


@router.post("/api/menu")
def upsert_daily_menu(payload: DailyMenuPayload) -> Dict[str, Any]:
    """Create or update a daily menu (upsert) for a given date, meal type, and city.

    This is an upsert: if a menu already exists for the given date/bld/city/menu_type
    combination, it updates it; otherwise it inserts a new menu record.

    Args:
        payload: Menu upsert payload with date, bld_type, city_code, items, etc.

    Returns:
        Full menu dict with menu_id, metadata, and items list.
    """
    db = get_raw_db()
    cursor = db.cursor()
    try:
        canonical_bld_type = normalize_meal_type(payload.bld_type)
        bld_id = resolve_bld_id(cursor, canonical_bld_type)
        city_code = normalize_city_code(payload.city_code or DEFAULT_CITY)

        resolved_menu_type = normalize_menu_type(payload.menu_type)
        ensure_menu_allowed(city_code, resolved_menu_type)
        menu_date = payload.date if resolved_menu_type == MENU_TYPE_ONE_DAY else None
        resolved_period_type = (
            "subscription" if resolved_menu_type == MENU_TYPE_SUBSCRIPTION else payload.period_type
        )
        resolved_delivers_by = resolve_delivers_by_value(canonical_bld_type, payload.delivers_by)

        find_conditions = ["menu_type = %s", "bld_id = %s", "city_code = %s"]
        params: List[Any] = [resolved_menu_type, bld_id, city_code]
        if resolved_menu_type == MENU_TYPE_ONE_DAY:
            if not menu_date:
                raise HTTPException(status_code=400, detail="date is required for ONE_DAY menus")
            find_conditions.append("date = %s")
            params.append(menu_date)
        elif resolved_menu_type == MENU_TYPE_SUBSCRIPTION:
            find_conditions.append("date IS NULL")
            find_conditions.append("period_type = 'subscription'")
        else:
            find_conditions.append("date IS NULL")

        find_query = f"SELECT menu_id FROM menu WHERE {' AND '.join(find_conditions)}"
        cursor.execute(find_query, tuple(params))
        existing = cursor.fetchone()

        if existing:
            menu_id = existing[0]
            cursor.execute(
                """
                UPDATE menu
                   SET is_festival = %s,
                       period_type = %s,
                       date = %s,
                       delivers_by = %s
                 WHERE menu_id = %s
                """,
                (
                    int(payload.is_festival),
                    resolved_period_type,
                    menu_date,
                    resolved_delivers_by,
                    menu_id,
                ),
            )
        else:
            cursor.execute(
                """
                INSERT INTO menu (date, is_festival, is_released, period_type, bld_id, city_code, menu_type, delivers_by)
                VALUES (%s, %s, 0, %s, %s, %s, %s, %s)
                """,
                (
                    menu_date,
                    int(payload.is_festival),
                    resolved_period_type,
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
            has_component_type = mi.component_type_id is not None
            if sum([has_item, has_combo, has_component_type]) != 1:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"items[{idx - 1}] must include exactly one of item_id, "
                        "combo_id, or component_type_id"
                    ),
                )
            if has_component_type and resolved_menu_type != MENU_TYPE_SUBSCRIPTION:
                raise HTTPException(
                    status_code=400,
                    detail="Item group rows are only supported for subscription menus",
                )
            if has_item:
                payload_key = ("item", int(mi.item_id))
            elif has_combo:
                payload_key = ("combo", int(mi.combo_id))
            else:
                payload_key = ("component_type", int(mi.component_type_id))
            if payload_key in seen_payload_keys:
                raise HTTPException(
                    status_code=400,
                    detail=f"Duplicate menu entry in payload: {payload_key[0]} {payload_key[1]}",
                )
            seen_payload_keys.add(payload_key)
            if has_item:
                cursor.execute(
                    "SELECT category_id, component_type_id FROM items WHERE item_id = %s LIMIT 1",
                    (mi.item_id,),
                )
                row = cursor.fetchone()
                if row is None:
                    raise HTTPException(status_code=400, detail=f"Unknown item_id: {mi.item_id}")
                resolved_category_id = mi.category_id if mi.category_id is not None else row[0]
                resolved_component_type_id = row[1]
            elif has_combo:
                cursor.execute(
                    "SELECT category_id FROM combos WHERE combo_id = %s LIMIT 1",
                    (mi.combo_id,),
                )
                row = cursor.fetchone()
                if row is None:
                    raise HTTPException(status_code=400, detail=f"Unknown combo_id: {mi.combo_id}")
                resolved_category_id = mi.category_id if mi.category_id is not None else row[0]
                resolved_component_type_id = None
            else:
                cursor.execute(
                    "SELECT category_id FROM component_types WHERE component_type_id = %s AND is_active = 1 LIMIT 1",
                    (mi.component_type_id,),
                )
                row = cursor.fetchone()
                if row is None:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Unknown component_type_id: {mi.component_type_id}",
                    )
                resolved_category_id = mi.category_id if mi.category_id is not None else row[0]
                resolved_component_type_id = mi.component_type_id

            # Discounts are applied at order time via discount codes, not at menu level.
            # menu_items.discount_pct is always NULL — full price is always shown on the menu.
            resolved_discount_pct: Optional[float] = None

            normalized_menu_items.append(
                {
                    "item_id": mi.item_id,
                    "combo_id": mi.combo_id,
                    "component_type_id": resolved_component_type_id,
                    "category_id": resolved_category_id,
                    "max_qty": mi.max_qty if mi.max_qty is not None else None,
                    "available_qty": mi.available_qty if mi.available_qty is not None else None,
                    "rate": float(mi.rate),
                    "discount_pct": resolved_discount_pct,
                    "is_default": bool(mi.is_default),
                    "sort_order": mi.sort_order or idx,
                    "key": payload_key,
                }
            )

        # Auto-default: for each component_type, if exactly one menu item has that type,
        # force is_default=True. If more than one, leave is_default as explicitly set.
        type_indices: Dict[int, List[int]] = defaultdict(list)
        for i, entry in enumerate(normalized_menu_items):
            ct_id = entry.get("component_type_id")
            if ct_id is not None:
                type_indices[ct_id].append(i)
        for ct_id, indices in type_indices.items():
            if len(indices) == 1:
                normalized_menu_items[indices[0]]["is_default"] = True

        cursor.execute(
            """
            SELECT menu_item_id, item_id, combo_id, component_type_id
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
            existing_component_type_id = row[3]
            if existing_item_id is not None:
                row_key = ("item", int(existing_item_id))
            elif existing_combo_id is not None:
                row_key = ("combo", int(existing_combo_id))
            elif existing_component_type_id is not None:
                row_key = ("component_type", int(existing_component_type_id))
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
            component_type_id = entry["component_type_id"]
            category_id = entry["category_id"]
            max_qty_value = entry["max_qty"]
            available_qty_value = entry["available_qty"]
            rate_value = entry["rate"]
            discount_pct_value = entry["discount_pct"]
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
                        component_type_id = %s,
                        max_qty = %s,
                        available_qty = %s,
                        rate = %s,
                        discount_pct = %s,
                        is_default = %s,
                        sort_order = %s
                    WHERE menu_item_id = %s
                    """,
                    (
                        category_id,
                        component_type_id,
                        max_qty_value,
                        effective_available_qty,
                        rate_value,
                        discount_pct_value,
                        int(is_default),
                        sort_order,
                        existing_row["menu_item_id"],
                    ),
                )
                continue

            cursor.execute(
                """
                INSERT INTO menu_items
                    (menu_id, item_id, combo_id, component_type_id, category_id, max_qty, available_qty, rate, discount_pct, is_default, sort_order)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    menu_id,
                    item_id,
                    combo_id,
                    component_type_id,
                    category_id,
                    max_qty_value,
                    effective_available_qty,
                    rate_value,
                    discount_pct_value,
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

        if resolved_menu_type == MENU_TYPE_ONE_DAY:
            validation_cursor = db.cursor(dictionary=True)
            try:
                _validate_subscription_groups_for_daily_menu(validation_cursor, menu_id)
            finally:
                validation_cursor.close()

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
            period_type=resolved_period_type,
            city_code=city_code,
            menu_type=resolved_menu_type,
            include_combos=True,
        )
    except HTTPException:
        db.rollback()
        raise
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


def _validate_subscription_groups_for_daily_menu(cursor, menu_id: int) -> None:
    """Ensure a Daily Menu can resolve all released Subscription Menu item groups.

    Args:
        cursor: Dictionary cursor on the active database connection.
        menu_id: Daily menu ID being saved or released.
    """
    cursor.execute(
        """
        SELECT
            m.menu_id,
            m.date,
            m.city_code,
            m.bld_id,
            m.menu_type,
            b.bld_type
          FROM menu m
          JOIN bld b ON b.bld_id = m.bld_id
         WHERE m.menu_id = %s
         LIMIT 1
        """,
        (menu_id,),
    )
    menu = cursor.fetchone()
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    if menu.get("menu_type") != MENU_TYPE_ONE_DAY:
        return

    subscription_filter_params = (MENU_TYPE_SUBSCRIPTION, menu["city_code"], menu["bld_id"])
    cursor.execute(
        """
        SELECT DISTINCT
            required.component_type_id,
            required.component_type_name,
            GROUP_CONCAT(DISTINCT required.source_name ORDER BY required.source_name SEPARATOR ', ') AS sources
        FROM (
            SELECT
                mi.component_type_id,
                ct.name AS component_type_name,
                ct.name AS source_name
              FROM menu sm
              JOIN menu_items mi ON mi.menu_id = sm.menu_id
              JOIN component_types ct ON ct.component_type_id = mi.component_type_id
             WHERE sm.menu_type = %s
               AND sm.period_type = 'subscription'
               AND sm.date IS NULL
               AND sm.is_released = 1
               AND sm.city_code = %s
               AND sm.bld_id = %s
               AND mi.component_type_id IS NOT NULL
               AND mi.item_id IS NULL
               AND mi.combo_id IS NULL

            UNION ALL

            SELECT
                ci.component_type_id,
                ct.name AS component_type_name,
                c.combo_name AS source_name
              FROM menu sm
              JOIN menu_items mi ON mi.menu_id = sm.menu_id
              JOIN combos c ON c.combo_id = mi.combo_id
              JOIN combo_items ci ON ci.combo_id = c.combo_id
              JOIN component_types ct ON ct.component_type_id = ci.component_type_id
             WHERE sm.menu_type = %s
               AND sm.period_type = 'subscription'
               AND sm.date IS NULL
               AND sm.is_released = 1
               AND sm.city_code = %s
               AND sm.bld_id = %s
               AND ci.component_type_id IS NOT NULL
               AND ci.item_id IS NULL

            UNION ALL

            SELECT
                pic.component_type_id,
                ct.name AS component_type_name,
                i.name AS source_name
              FROM menu sm
              JOIN menu_items mi ON mi.menu_id = sm.menu_id
              JOIN items i ON i.item_id = mi.item_id
              JOIN plated_items p ON p.item_id = mi.item_id
              JOIN plated_item_components pic ON pic.plated_item_id = p.plated_item_id
              JOIN component_types ct ON ct.component_type_id = pic.component_type_id
             WHERE sm.menu_type = %s
               AND sm.period_type = 'subscription'
               AND sm.date IS NULL
               AND sm.is_released = 1
               AND sm.city_code = %s
               AND sm.bld_id = %s
               AND pic.component_type_id IS NOT NULL
               AND pic.component_item_id IS NULL
        ) required
        GROUP BY required.component_type_id, required.component_type_name
        ORDER BY required.component_type_name ASC
        """,
        (*subscription_filter_params, *subscription_filter_params, *subscription_filter_params),
    )
    subscription_groups = cursor.fetchall() or []
    if not subscription_groups:
        return

    issues: List[Dict[str, Any]] = []
    for group in subscription_groups:
        component_type_id = group.get("component_type_id")
        component_type_name = group.get("component_type_name") or f"Item Group #{component_type_id}"
        sources = group.get("sources")
        cursor.execute(
            """
            SELECT
                COUNT(*) AS item_count,
                SUM(CASE WHEN mi.is_default = 1 THEN 1 ELSE 0 END) AS default_count
              FROM menu_items mi
              JOIN items i ON i.item_id = mi.item_id
             WHERE mi.menu_id = %s
               AND i.component_type_id = %s
            """,
            (menu_id, component_type_id),
        )
        resolution = cursor.fetchone() or {}
        item_count = int(resolution.get("item_count") or 0)
        default_count = int(resolution.get("default_count") or 0)
        if item_count == 0:
            issues.append(
                {
                    "issue_type": "missing_daily_item",
                    "component_type_id": component_type_id,
                    "component_type_name": component_type_name,
                    "meal": menu["bld_type"],
                    "sources": sources,
                    "item_count": item_count,
                    "default_count": default_count,
                    "message": (f"Add one {menu['bld_type']} Daily Menu item for this item group."),
                }
            )
        elif item_count > 1 and default_count != 1:
            issues.append(
                {
                    "issue_type": "missing_default_item",
                    "component_type_id": component_type_id,
                    "component_type_name": component_type_name,
                    "meal": menu["bld_type"],
                    "sources": sources,
                    "item_count": item_count,
                    "default_count": default_count,
                    "message": (
                        "Choose exactly one default item because multiple Daily Menu "
                        "items match this item group."
                    ),
                }
            )

    if issues:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Resolve subscription item groups before saving or releasing this Daily Menu.",
                "issues": issues,
            },
        )


def _validate_combo_generic_components(cursor, menu_id: int) -> None:
    """Block menu release if any combo's generic components are missing from the daily menu.

    A combo may include generic components — rows in combo_items where component_type_id is set
    and item_id is NULL. These mean "pick any item of this type". For a daily menu to be
    releasable, every such component_type must be satisfied by at least one item in the menu
    (i.e., a menu_items row with an item whose items.component_type_id matches).

    Args:
        cursor: Dictionary cursor on the active database connection.
        menu_id: ID of the daily menu being released.
    """
    cursor.execute(
        """
        SELECT
            ci.component_type_id,
            ct.name AS component_type_name,
            GROUP_CONCAT(DISTINCT c.combo_name ORDER BY c.combo_name SEPARATOR ', ') AS combo_names
          FROM menu_items mi
          JOIN combos c ON c.combo_id = mi.combo_id
          JOIN combo_items ci ON ci.combo_id = c.combo_id
          JOIN component_types ct ON ct.component_type_id = ci.component_type_id
         WHERE mi.menu_id = %s
           AND mi.combo_id IS NOT NULL
           AND ci.component_type_id IS NOT NULL
           AND ci.item_id IS NULL
         GROUP BY ci.component_type_id, ct.name
         ORDER BY ct.name ASC
        """,
        (menu_id,),
    )
    required_types = cursor.fetchall() or []
    if not required_types:
        return

    issues: List[str] = []
    for row in required_types:
        component_type_id = row.get("component_type_id")
        component_type_name = row.get("component_type_name") or f"component #{component_type_id}"
        cursor.execute(
            """
            SELECT COUNT(*) AS item_count
              FROM menu_items mi
              JOIN items i ON i.item_id = mi.item_id
             WHERE mi.menu_id = %s
               AND i.component_type_id = %s
            """,
            (menu_id, component_type_id),
        )
        result = cursor.fetchone() or {}
        if int(result.get("item_count") or 0) == 0:
            issues.append(f"Please select today's {component_type_name}")

    if issues:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Resolve missing combo components before releasing this menu.",
                "issues": issues,
            },
        )


@router.patch("/api/menu/{menu_id}/release")
def release_menu(menu_id: int) -> Dict[str, Any]:
    """Mark a menu as released so customers can see and order from it.

    Args:
        menu_id: ID of the menu to release.

    Returns:
        Dict with status and menu_id.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT menu_id FROM menu WHERE menu_id = %s", (menu_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Menu not found")

        _validate_subscription_groups_for_daily_menu(cursor, menu_id)
        _validate_combo_generic_components(cursor, menu_id)

        cursor.execute("UPDATE menu SET is_released = 1 WHERE menu_id = %s", (menu_id,))
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


@router.patch("/api/menu/{menu_id}/unrelease")
def unrelease_menu(menu_id: int) -> Dict[str, Any]:
    """Mark a menu as unreleased, hiding it from customers.

    Args:
        menu_id: ID of the menu to unrelease.

    Returns:
        Dict with status and menu_id.
    """
    db = get_raw_db()
    cursor = db.cursor()
    try:
        cursor.execute("SELECT menu_id FROM menu WHERE menu_id = %s", (menu_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Menu not found")

        cursor.execute("UPDATE menu SET is_released = 0 WHERE menu_id = %s", (menu_id,))
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


class ResolveSubscriptionsPayload(BaseModel):
    """Payload for resolving subscription items against today's released menu."""

    force: bool = False


@router.post("/api/menu/{menu_id}/resolve-subscriptions")
def resolve_subscriptions_for_menu(
    menu_id: int,
    payload: ResolveSubscriptionsPayload,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
) -> Dict[str, Any]:
    """Resolve active subscription orders against today's released daily menu.

    For each active subscriber (non-paused, non-cancelled) whose subscription
    covers this menu's meal type and city, creates a subscription_daily order
    with concrete item_ids and rates resolved from the menu. Decrements
    available_qty on the matched menu_items.

    If subscription_daily orders already exist for this date/meal/city and
    force=False, returns {already_resolved: true, existing_count: N} without
    making changes. If force=True, deletes those orders (restoring available_qty)
    and recreates them.

    Args:
        menu_id: The released daily menu to resolve against.
        payload: Contains force flag.
        user: Optional authenticated user (injected).

    Returns:
        Dict with already_resolved, existing_count, orders_created, items_resolved.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        _ensure_subscription_pause_table(cursor)

        # 1. Fetch menu metadata
        cursor.execute(
            """
            SELECT m.menu_id, m.date, m.city_code, m.is_released, b.bld_type
              FROM menu m
              JOIN bld b ON b.bld_id = m.bld_id
             WHERE m.menu_id = %s
            """,
            (menu_id,),
        )
        menu = cursor.fetchone()
        if not menu:
            raise HTTPException(status_code=404, detail="Menu not found")
        if not menu["is_released"]:
            raise HTTPException(
                status_code=400, detail="Menu must be released before resolving subscriptions"
            )

        menu_date = (
            menu["date"].isoformat() if hasattr(menu["date"], "isoformat") else str(menu["date"])
        )
        city_code = menu["city_code"]
        bld_type = menu["bld_type"].lower()  # 'breakfast' | 'lunch' | 'dinner'

        # 2. Check for existing subscription_daily orders for this date/meal/city
        cursor.execute(
            """
            SELECT COUNT(DISTINCT o.order_id) AS cnt
              FROM orders o
              JOIN addresses a ON a.address_id = o.address_id
              JOIN order_items oi ON oi.order_id = o.order_id
             WHERE o.order_type = 'subscription_daily'
               AND o.delivery_date = %s
               AND LOWER(oi.meal_type) = %s
               AND a.city_code = %s
            """,
            (menu_date, bld_type, city_code),
        )
        existing_count = int((cursor.fetchone() or {}).get("cnt", 0))

        if existing_count > 0 and not payload.force:
            return {
                "already_resolved": True,
                "existing_count": existing_count,
                "orders_created": 0,
                "items_resolved": 0,
            }

        # 3. If force: restore available_qty and delete existing subscription_daily orders
        if existing_count > 0 and payload.force:
            cursor.execute(
                """
                SELECT DISTINCT o.order_id
                  FROM orders o
                  JOIN addresses a ON a.address_id = o.address_id
                  JOIN order_items oi ON oi.order_id = o.order_id
                 WHERE o.order_type = 'subscription_daily'
                   AND o.delivery_date = %s
                   AND LOWER(oi.meal_type) = %s
                   AND a.city_code = %s
                """,
                (menu_date, bld_type, city_code),
            )
            old_order_ids = [r["order_id"] for r in cursor.fetchall()]
            if old_order_ids:
                fmt = ",".join(["%s"] * len(old_order_ids))
                # Restore available_qty
                cursor.execute(
                    f"""
                    UPDATE menu_items mi
                      JOIN order_items oi ON oi.menu_item_id = mi.menu_item_id
                     SET mi.available_qty = mi.available_qty + oi.quantity
                    WHERE oi.order_id IN ({fmt})
                      AND oi.menu_item_id IS NOT NULL
                    """,
                    tuple(old_order_ids),
                )
                cursor.execute(
                    f"DELETE FROM order_items WHERE order_id IN ({fmt})", tuple(old_order_ids)
                )
                cursor.execute(
                    f"DELETE FROM orders WHERE order_id IN ({fmt})", tuple(old_order_ids)
                )

        # 4. Build component_type_id → (menu_item_id, item_id, rate) map from today's menu
        cursor.execute(
            """
            SELECT
                COALESCE(i.component_type_id, mi.component_type_id) AS component_type_id,
                mi.menu_item_id,
                mi.item_id,
                mi.rate
              FROM menu_items mi
              JOIN items i ON mi.item_id = i.item_id
             WHERE mi.menu_id = %s
               AND COALESCE(i.component_type_id, mi.component_type_id) IS NOT NULL
            """,
            (menu_id,),
        )
        ct_map: Dict[int, Dict[str, Any]] = {
            r["component_type_id"]: r for r in cursor.fetchall() if r["component_type_id"]
        }

        # 5. Find active subscription orders for this meal type and city
        cursor.execute(
            """
            SELECT DISTINCT o.order_id, o.customer_id, o.address_id, o.payment_method
              FROM orders o
              JOIN addresses a ON a.address_id = o.address_id
              JOIN order_items oi ON oi.order_id = o.order_id
              LEFT JOIN menu_items sub_mi ON oi.menu_item_id = sub_mi.menu_item_id
              LEFT JOIN items i_sub ON oi.item_id = i_sub.item_id
              LEFT JOIN subscription_pause_windows spw
                     ON spw.customer_id = o.customer_id
                    AND spw.city_code = %s
                    AND spw.is_active = 1
                    AND %s BETWEEN spw.start_date AND spw.end_date
                    AND spw.order_id = o.order_id
             WHERE o.order_type = 'subscription'
               AND o.status NOT IN ('cancelled', 'rejected')
               AND LOWER(oi.meal_type) = %s
               AND a.city_code = %s
               AND spw.pause_id IS NULL
               AND COALESCE(sub_mi.component_type_id, i_sub.component_type_id) IS NOT NULL
            """,
            (city_code, menu_date, bld_type, city_code),
        )
        sub_orders = cursor.fetchall() or []

        orders_created = 0
        items_resolved = 0

        for sub in sub_orders:
            # Get this subscription's items for this meal type
            cursor.execute(
                """
                SELECT
                    oi.quantity,
                    oi.meal_type,
                    COALESCE(sub_mi.component_type_id, i_sub.component_type_id) AS component_type_id
                  FROM order_items oi
                  LEFT JOIN menu_items sub_mi ON oi.menu_item_id = sub_mi.menu_item_id
                  LEFT JOIN items i_sub ON oi.item_id = i_sub.item_id
                 WHERE oi.order_id = %s
                   AND LOWER(oi.meal_type) = %s
                   AND COALESCE(sub_mi.component_type_id, i_sub.component_type_id) IS NOT NULL
                """,
                (sub["order_id"], bld_type),
            )
            sub_items = cursor.fetchall() or []

            # Resolve each item against today's menu
            resolved_lines: List[Dict[str, Any]] = []
            for si in sub_items:
                ct_id = si["component_type_id"]
                if ct_id not in ct_map:
                    continue
                resolved = ct_map[ct_id]
                resolved_lines.append(
                    {
                        "menu_item_id": resolved["menu_item_id"],
                        "item_id": resolved["item_id"],
                        "rate": float(resolved["rate"]),
                        "quantity": si["quantity"],
                        "meal_type": si["meal_type"],
                    }
                )

            if not resolved_lines:
                continue

            # Calculate total
            total_price = sum(line["rate"] * line["quantity"] for line in resolved_lines)

            # Insert the subscription_daily order
            cursor.execute(
                """
                INSERT INTO orders
                    (customer_id, address_id, total_price, status, payment_method,
                     delivery_date, order_type, discount, cgst, sgst, delivery_charge)
                VALUES (%s, %s, %s, 'Confirmed', %s, %s, 'subscription_daily', 0, 0, 0, 0)
                """,
                (
                    sub["customer_id"],
                    sub["address_id"],
                    total_price,
                    sub["payment_method"],
                    menu_date,
                ),
            )
            new_order_id = cursor.lastrowid

            for line in resolved_lines:
                cursor.execute(
                    """
                    INSERT INTO order_items
                        (order_id, item_id, menu_item_id, meal_type, quantity, price)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        new_order_id,
                        line["item_id"],
                        line["menu_item_id"],
                        line["meal_type"],
                        line["quantity"],
                        line["rate"],
                    ),
                )
                # Decrement available_qty
                cursor.execute(
                    "UPDATE menu_items SET available_qty = GREATEST(available_qty - %s, 0) WHERE menu_item_id = %s",
                    (line["quantity"], line["menu_item_id"]),
                )
                items_resolved += 1

            orders_created += 1

        db.commit()
        return {
            "already_resolved": False,
            "existing_count": 0,
            "orders_created": orders_created,
            "items_resolved": items_resolved,
        }

    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


def _ensure_subscription_pause_table(cursor) -> None:
    """Create the subscription pause table if the deployment has not run migrations yet.

    Args:
        cursor: Active MySQL cursor.
    """
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS subscription_pause_windows (
            pause_id INT NOT NULL AUTO_INCREMENT,
            customer_id INT NOT NULL,
            order_id INT NULL,
            city_code VARCHAR(3) NOT NULL,
            meal_type VARCHAR(20) NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            reason VARCHAR(255) NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (pause_id),
            KEY idx_subscription_pause_city_dates (city_code, start_date, end_date),
            KEY idx_subscription_pause_customer (customer_id),
            KEY idx_subscription_pause_order (order_id),
            CONSTRAINT fk_subscription_pause_customer
                FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
                ON DELETE CASCADE
        )
        """
    )
    cursor.execute("SHOW COLUMNS FROM subscription_pause_windows LIKE 'order_id'")
    if cursor.fetchone() is None:
        cursor.execute(
            "ALTER TABLE subscription_pause_windows ADD COLUMN order_id INT NULL AFTER customer_id"
        )
    cursor.execute(
        "SHOW INDEX FROM subscription_pause_windows WHERE Key_name = 'idx_subscription_pause_order'"
    )
    if cursor.fetchone() is None:
        cursor.execute(
            "CREATE INDEX idx_subscription_pause_order ON subscription_pause_windows (order_id)"
        )


@router.get("/api/subscription-pauses")
def list_subscription_pauses(
    city_code: Optional[str] = Query(None, alias="city_code"),
    customer_id: Optional[int] = Query(None, description="Limit pauses to one customer"),
    include_inactive: bool = Query(False, description="Include cancelled pause windows"),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
) -> List[Dict[str, Any]]:
    """Return customer subscription pause windows for a city.

    Args:
        city_code: City to filter by; defaults from the authenticated admin context.
        customer_id: Optional customer filter.
        include_inactive: Whether cancelled windows should be included.
        user: Optional authenticated user for city resolution.

    Returns:
        List of pause windows with customer display fields.
    """
    resolved_city = _resolve_city_context(city_code, user)
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        _ensure_subscription_pause_table(cursor)
        where = ["spw.city_code = %s"]
        params: List[Any] = [resolved_city]
        if customer_id is not None:
            where.append("spw.customer_id = %s")
            params.append(customer_id)
        if not include_inactive:
            where.append("spw.is_active = 1")
        cursor.execute(
            f"""
            SELECT
                spw.pause_id,
                spw.customer_id,
                spw.order_id,
                c.name AS customer_name,
                c.primary_mobile AS customer_phone,
                spw.city_code,
                spw.meal_type,
                spw.start_date,
                spw.end_date,
                spw.reason,
                spw.is_active,
                spw.created_at,
                spw.updated_at
            FROM subscription_pause_windows spw
            JOIN customers c ON c.customer_id = spw.customer_id
            WHERE {' AND '.join(where)}
            ORDER BY spw.start_date DESC, spw.pause_id DESC
            """,
            tuple(params),
        )
        rows = cursor.fetchall() or []
        return [
            {
                **row,
                "is_active": bool(row.get("is_active")),
                "start_date": str(row.get("start_date")),
                "end_date": str(row.get("end_date")),
                "created_at": str(row.get("created_at")) if row.get("created_at") else None,
                "updated_at": str(row.get("updated_at")) if row.get("updated_at") else None,
            }
            for row in rows
        ]
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.post("/api/subscription-pauses")
def create_subscription_pause(payload: SubscriptionPausePayload) -> Dict[str, Any]:
    """Create a customer subscription pause window.

    Args:
        payload: Customer, date range, optional meal, reason, and city code.

    Returns:
        Dict containing the created pause_id.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        _ensure_subscription_pause_table(cursor)
        city_code = normalize_city_code(payload.city_code or DEFAULT_CITY)
        cursor.execute(
            """
            SELECT c.customer_id
              FROM customers c
              JOIN addresses a ON a.customer_id = c.customer_id
             WHERE c.customer_id = %s
               AND a.city_code = %s
               AND a.is_active = 1
             LIMIT 1
            """,
            (payload.customer_id, city_code),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Customer not found in selected city")
        if payload.order_id is None:
            raise HTTPException(status_code=400, detail="Subscription order is required")
        cursor.execute(
            """
            SELECT order_id
              FROM orders
             WHERE order_id = %s
               AND customer_id = %s
               AND LOWER(COALESCE(order_type, 'one_time')) = 'subscription'
               AND LOWER(COALESCE(status, '')) NOT IN ('cancelled', 'rejected')
             LIMIT 1
            """,
            (payload.order_id, payload.customer_id),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Subscription order not found")
        if payload.end_date < payload.start_date:
            raise HTTPException(status_code=400, detail="end_date must be on or after start_date")
        cursor.execute(
            """
            INSERT INTO subscription_pause_windows
                (customer_id, order_id, city_code, meal_type, start_date, end_date, reason, is_active)
            VALUES (%s, %s, %s, NULL, %s, %s, %s, 1)
            """,
            (
                payload.customer_id,
                payload.order_id,
                city_code,
                payload.start_date,
                payload.end_date,
                payload.reason,
            ),
        )
        pause_id = int(cursor.lastrowid)
        db.commit()
        log_admin_action(
            db,
            admin_id=1,
            action_type="ADD",
            entity_type="ITEM",
            entity_id=pause_id,
            description=f"Created subscription pause for customer {payload.customer_id}",
        )
        return {"pause_id": pause_id}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.put("/api/subscription-pauses/{pause_id}")
def update_subscription_pause(pause_id: int, payload: SubscriptionPausePayload) -> Dict[str, Any]:
    """Update a customer subscription pause window.

    Args:
        pause_id: Pause window to update.
        payload: Replacement pause window fields.

    Returns:
        Dict with update status and pause_id.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        _ensure_subscription_pause_table(cursor)
        city_code = normalize_city_code(payload.city_code or DEFAULT_CITY)
        if payload.end_date < payload.start_date:
            raise HTTPException(status_code=400, detail="end_date must be on or after start_date")
        if payload.order_id is None:
            raise HTTPException(status_code=400, detail="Subscription order is required")
        cursor.execute(
            """
            SELECT order_id
              FROM orders
             WHERE order_id = %s
               AND customer_id = %s
               AND LOWER(COALESCE(order_type, 'one_time')) = 'subscription'
             LIMIT 1
            """,
            (payload.order_id, payload.customer_id),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Subscription order not found")
        cursor.execute(
            "SELECT pause_id FROM subscription_pause_windows WHERE pause_id = %s", (pause_id,)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Pause window not found")
        cursor.execute(
            """
            UPDATE subscription_pause_windows
               SET customer_id = %s,
                   order_id = %s,
                   city_code = %s,
                   meal_type = NULL,
                   start_date = %s,
                   end_date = %s,
                   reason = %s
             WHERE pause_id = %s
            """,
            (
                payload.customer_id,
                payload.order_id,
                city_code,
                payload.start_date,
                payload.end_date,
                payload.reason,
                pause_id,
            ),
        )
        db.commit()
        return {"status": "updated", "pause_id": pause_id}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.patch("/api/subscription-pauses/{pause_id}/resume")
def resume_subscription_pause(pause_id: int) -> Dict[str, Any]:
    """Cancel a subscription pause window so the subscription resumes.

    Args:
        pause_id: Pause window to cancel.

    Returns:
        Dict with resume status and pause_id.
    """
    db = get_raw_db()
    cursor = db.cursor()
    try:
        _ensure_subscription_pause_table(cursor)
        cursor.execute(
            "UPDATE subscription_pause_windows SET is_active = 0 WHERE pause_id = %s",
            (pause_id,),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Pause window not found")
        db.commit()
        return {"status": "resumed", "pause_id": pause_id}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()
