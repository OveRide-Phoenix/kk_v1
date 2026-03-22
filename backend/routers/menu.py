"""Menu router: daily menu setup, available items, release/unrelease."""

from __future__ import annotations

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
        menu_type: Menu type (ONE_DAY or CONDIMENTS).
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
                    payload.period_type,
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


@router.patch("/api/menu/{menu_id}/release")
def release_menu(menu_id: int) -> Dict[str, Any]:
    """Mark a menu as released so customers can see and order from it.

    Args:
        menu_id: ID of the menu to release.

    Returns:
        Dict with status and menu_id.
    """
    db = get_raw_db()
    cursor = db.cursor()
    try:
        cursor.execute("SELECT menu_id FROM menu WHERE menu_id = %s", (menu_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Menu not found")

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
