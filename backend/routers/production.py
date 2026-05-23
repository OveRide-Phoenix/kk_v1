"""Production planning router: generate, reopen, finalize, update-planned, day-plan, orders-summary, plated-expand-preview, status."""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional, Tuple

import mysql.connector
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from ..city_config import CityCode, DEFAULT_CITY
from ..db import get_raw_db
from ..utils.auth_deps import admin_required, get_optional_user
from ..utils.helpers import (
    MENU_TYPE_ONE_DAY,
    _resolve_city_context,
    get_food_meals_for_city,
    normalize_city_code,
    normalize_meal_type,
    resolve_bld_id,
)
from ..utils.logger import log_admin_action
from ..utils.plated_items import expand_plated_quantities

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class ProductionPlanItem(BaseModel):
    """Single item entry in a production plan."""

    item_name: str
    planned_quantity: Optional[float] = None
    buffer_quantity: Optional[float] = None
    final_quantity: Optional[float] = None
    available_quantity: Optional[float] = None


class ProductionPlanRequest(BaseModel):
    """Payload to generate/save a production plan."""

    date: str
    menu_type: str
    plans: List[ProductionPlanItem]
    city_code: Optional[str] = None


class ProductionPlanResetRequest(BaseModel):
    """Payload to reopen or reset a production plan."""

    date: str
    menu_type: str
    city_code: Optional[str] = None


class ProductionPlanFinalizeRequest(ProductionPlanResetRequest):
    """Payload to finalize a production plan, optionally with updated plan items."""

    plans: Optional[List[ProductionPlanItem]] = None
    buffer_override_pct: Optional[float] = None


class MaxQtyUpdate(BaseModel):
    """Single item quantity adjustment entry."""

    item_name: str
    additional_qty: float = Field(..., gt=0)


class UpdateMaxQtyRequest(BaseModel):
    """Payload to patch planned quantities for menu items."""

    date: str
    menu_type: str
    updates: List[MaxQtyUpdate]
    city_code: Optional[str] = None


class PlatedExpansionLineItemPayload(BaseModel):
    """Single plated item entry for expansion preview."""

    item_id: int
    quantity: float = Field(1, gt=0)


class PlatedExpansionPreviewPayload(BaseModel):
    """Payload for the plated-expand-preview endpoint."""

    items: List[PlatedExpansionLineItemPayload] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _persist_plan_items(
    cursor,
    menu_id: int,
    plans: Optional[List[ProductionPlanItem]],
) -> int:
    """Persist production plan quantities back into menu_items rows.

    Args:
        cursor: Database cursor.
        menu_id: ID of the menu to update.
        plans: List of plan item entries with quantities.

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

        cursor.execute(
            """
            UPDATE menu_items mi
            JOIN items i ON mi.item_id = i.item_id
               SET mi.planned_qty = %s,
                   mi.buffer_qty = %s,
                   mi.final_qty = %s
             WHERE mi.menu_id = %s
               AND LOWER(i.name) = LOWER(%s)
            """,
            (
                planned_value,
                buffer_value,
                final_value,
                menu_id,
                item_name,
            ),
        )
        updated += cursor.rowcount

    return updated


def _fetch_production_menu_rows(
    cursor,
    target_date: str,
    city_code: CityCode,
    period_type: Optional[str],
    meals: List[str],
) -> List[Dict[str, Any]]:
    """Fetch all menu rows for a given date, city, period, and meals.

    Args:
        cursor: Database cursor.
        target_date: Date string in YYYY-MM-DD format.
        city_code: City code to filter by.
        period_type: Menu period type string or None.
        meals: List of meal type strings to include.

    Returns:
        List of menu row dicts.
    """
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
            m.buffer_override_pct,
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
    """Build maps of default item IDs and names keyed by (meal, component_type_id).

    Args:
        cursor: Database cursor.
        target_date: Date string in YYYY-MM-DD format.
        city_code: City code to filter by.
        period_type: Menu period type string or None.
        meals: List of meal type strings to include.

    Returns:
        Tuple of (resolved_ids, resolved_names, resolution_counts) dicts.
    """
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
    """Fetch order quantity totals keyed by menu_item_id for a date/city.

    Args:
        cursor: Database cursor.
        target_date: Date string in YYYY-MM-DD format.
        city_code: City code to filter by.

    Returns:
        Dict mapping menu_item_id to total ordered quantity.
    """
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
    """Fetch unit and UOM details for a collection of item IDs.

    Args:
        cursor: Database cursor.
        item_ids: Iterable of item IDs to look up.

    Returns:
        Dict mapping item_id to a dict of unit detail fields.
    """
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
            packing_to_production_rate,
            buffer_percentage
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
            "buffer_percentage": (
                float(row["buffer_percentage"]) if row.get("buffer_percentage") is not None else 0.0
            ),
        }
    return details


def _fetch_plated_parent_item_ids(cursor, item_ids: Iterable[int]) -> set[int]:
    """Return the subset of item_ids that have a plated_items entry.

    Args:
        cursor: Database cursor.
        item_ids: Iterable of item IDs to check.

    Returns:
        Set of item IDs that are plated parents.
    """
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


def _fetch_stored_item_buffers(cursor, menu_id: int) -> Dict[int, Dict[str, float]]:
    """Fetch stored buffer_qty and final_qty from menu_items for a given menu.

    Args:
        cursor: Database cursor.
        menu_id: Menu ID to look up stored buffer values for.

    Returns:
        Dict mapping item_id to dict with buffer_qty and final_qty keys.
    """
    cursor.execute(
        """
        SELECT mi.item_id, mi.buffer_qty, mi.final_qty
          FROM menu_items mi
         WHERE mi.menu_id = %s
           AND mi.item_id IS NOT NULL
           AND (mi.buffer_qty > 0 OR mi.final_qty > 0)
        """,
        (menu_id,),
    )
    rows = cursor.fetchall() or []
    return {
        int(row["item_id"]): {
            "buffer_qty": float(row.get("buffer_qty") or 0),
            "final_qty": float(row.get("final_qty") or 0),
        }
        for row in rows
        if row.get("item_id") is not None
    }


def _fetch_plated_components_by_parent_item(
    cursor, parent_item_ids: Iterable[int]
) -> Dict[int, List[Dict[str, Any]]]:
    """Fetch plated item components grouped by parent item_id.

    Args:
        cursor: Database cursor.
        parent_item_ids: Iterable of parent item IDs.

    Returns:
        Dict mapping parent item_id to list of component dicts.
    """
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
    """Fetch combo components grouped by combo_id.

    Args:
        cursor: Database cursor.
        combo_ids: Iterable of combo IDs.

    Returns:
        Dict mapping combo_id to list of component dicts.
    """
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
    """Append a structured issue entry to the issues list.

    Args:
        issues: Mutable list to append to.
        issue_type: Short string classifier for the issue.
        parent_name: Name of the parent menu entry that caused the issue.
        required_units: Demand units that could not be resolved.
        component_type_name: Optional name of the unresolved item group.
        item_name: Optional name of the unresolved item.
        detail: Optional human-readable explanation.
    """
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
    """Attempt to resolve an item group to a specific item for the given meal.

    Args:
        resolved_default_ids: Map of (meal, component_type_id) -> item_id.
        resolved_default_names: Map of (meal, component_type_id) -> item_name.
        resolution_counts: Map of (meal, component_type_id) -> count of defaults.
        meal: Meal string (e.g. "Lunch").
        component_type_id: The item group ID to resolve.

    Returns:
        Tuple of (item_id, item_name, error_message). item_id is None on failure.
    """
    if component_type_id is None:
        return None, None, "Missing item group"
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
    """Accumulate production demand for a single item into the aggregate dict.

    Args:
        aggregate: Mutable dict keyed by item_id to accumulate production totals.
        issues: Mutable list to append issue entries to.
        parent_name: Name of the parent menu entry driving the demand.
        item_details: Dict mapping item_id to unit detail dicts.
        item_id: The concrete item ID to accumulate demand for, or None.
        demand_units: Number of customer units demanded.
    """
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
            "buffer_percentage": float(detail.get("buffer_percentage") or 0.0),
        },
    )
    bucket["order_units"] = float(bucket["order_units"]) + float(demand_units)
    bucket["production_quantity"] = float(bucket["production_quantity"]) + float(
        production_quantity
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/api/production/generate")
def generate_production_plan(payload: ProductionPlanRequest) -> Dict[str, Any]:
    """Save a production plan for the given date/menu type without marking it final.

    Args:
        payload: Date, menu_type, city_code, and list of plan items with quantities.

    Returns:
        Dict with success flag, updated_items count, menu_type, and message.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    updated = 0
    try:
        canonical_menu_type = normalize_meal_type(payload.menu_type)
        bld_id = resolve_bld_id(cursor, canonical_menu_type)
        target_city = normalize_city_code(payload.city_code or DEFAULT_CITY)

        cursor.execute(
            "SELECT menu_id FROM menu WHERE date=%s AND bld_id=%s AND city_code=%s LIMIT 1",
            (payload.date, bld_id, target_city),
        )
        menu = cursor.fetchone()
        if not menu:
            raise HTTPException(status_code=404, detail="Menu not found for that date/type")
        menu_id = menu["menu_id"]

        updated = _persist_plan_items(cursor, menu_id, payload.plans)

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


@router.post("/api/production/reopen")
def reopen_production_plan(payload: ProductionPlanResetRequest) -> Dict[str, Any]:
    """Reopen a previously finalized production plan by resetting its generated flag.

    Args:
        payload: Date, menu_type, and optional city_code.

    Returns:
        Dict with success flag, menu_type, and number of orders reverted.
    """
    db = get_raw_db()
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
            "orders_reverted": 0,
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.post("/api/production/finalize")
def finalize_production_plan(payload: ProductionPlanFinalizeRequest) -> Dict[str, Any]:
    """Finalize a production plan, marking it generated for downstream logistics.

    Args:
        payload: Date, menu_type, optional city_code, and optional updated plan items.

    Returns:
        Dict with success flag and menu_type.
    """
    db = get_raw_db()
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
            "UPDATE menu SET is_production_generated = 1, buffer_override_pct = %s WHERE menu_id = %s",
            (payload.buffer_override_pct, menu_id),
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


@router.patch("/api/production/update-planned")
def update_max_quantities(payload: UpdateMaxQtyRequest) -> Dict[str, Any]:
    """Incrementally adjust planned quantities for menu items after plan generation.

    Args:
        payload: Date, menu_type, city_code, and list of item name / additional_qty pairs.

    Returns:
        Dict with success flag, message, and list of updated item quantity snapshots.
    """
    if not payload.updates:
        raise HTTPException(status_code=400, detail="No updates provided")

    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    updated_items: List[Dict[str, Any]] = []

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
                    COALESCE(mi.planned_qty, 0) AS planned_qty,
                    COALESCE(mi.buffer_qty, 0) AS buffer_qty,
                    COALESCE(mi.final_qty, 0) AS final_qty,
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

            current_planned = float(row["planned_qty"] or 0)
            current_buffer = float(row["buffer_qty"] or 0)
            if current_buffer <= 0:
                inferred = float(row["final_qty"] or 0) - current_planned
                if inferred > 0:
                    current_buffer = inferred
            buffer_pct = float(row["buffer_percentage"] or 0)

            buffer_delta = 0.0
            if buffer_pct > 0:
                buffer_delta = round((abs(additional) * buffer_pct) / 100)
                if additional < 0:
                    buffer_delta *= -1

            new_planned = max(current_planned + additional, 0)
            new_buffer = max(current_buffer + buffer_delta, 0)
            new_final = max(new_planned + new_buffer, 0)

            cursor.execute(
                """
                UPDATE menu_items
                   SET planned_qty = %s,
                       buffer_qty = %s,
                       final_qty = %s
                 WHERE menu_id = %s
                   AND menu_item_id = %s
                """,
                (
                    new_planned,
                    new_buffer,
                    new_final,
                    menu_id,
                    row["menu_item_id"],
                ),
            )

            updated_items.append(
                {
                    "item_name": adjustment.item_name,
                    "new_planned_qty": new_planned,
                    "new_buffer_qty": new_buffer,
                    "new_final_qty": new_final,
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


@router.get("/api/production/day-plan")
def get_daily_production_plan(
    date: str,
    period_type: Optional[str] = Query(
        "one_day", description="Menu period to filter, e.g., one_day or subscription"
    ),
    city_code: Optional[str] = Query(None, alias="city_code"),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user),
) -> Dict[str, Any]:
    """Return the production day plan aggregated by meal for a given date and city.

    Expands combo and plated item components into their concrete ingredient items,
    applies UOM conversions, and surfaces any resolution issues.

    Args:
        date: Date string in YYYY-MM-DD format.
        period_type: Menu period type (default "one_day").
        city_code: City code override; resolved from user context if omitted.
        user: Optional authenticated user (injected).

    Returns:
        Dict with date, city_code, period_type, and list of meal breakdowns.
    """
    db = get_raw_db()
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
        meal_status: Dict[str, Dict[str, Any]] = {
            meal: {
                "is_released": False,
                "is_production_generated": False,
                "buffer_override_pct": None,
                "menu_id": None,
            }
            for meal in meals
        }
        for row in menu_rows:
            meal = row.get("meal")
            if meal not in rows_by_meal:
                continue
            rows_by_meal[meal].append(row)
            meal_status[meal] = {
                "is_released": bool(row.get("is_released")),
                "is_production_generated": bool(row.get("is_production_generated")),
                "buffer_override_pct": (
                    float(row["buffer_override_pct"])
                    if row.get("buffer_override_pct") is not None
                    else None
                ),
                "menu_id": row.get("menu_id"),
            }

        response_meals: List[Dict[str, Any]] = []
        for meal in meals:
            aggregate: Dict[int, Dict[str, Any]] = {}
            combo_packs: List[Dict[str, Any]] = []
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
                    combo_pack_components: List[Dict[str, Any]] = []
                    for component in combo_components.get(int(combo_id), []):
                        component_qty = float(component.get("quantity") or 0)
                        component_name = component.get("component_item_name")
                        resolved_item_name = component_name
                        resolution_status = "specific"
                        resolution_detail = None
                        if component.get("component_item_id") is None:
                            resolution_status = "resolved"
                            resolved_item_id, resolved_name, resolution_error = (
                                _resolve_component_type_for_meal(
                                    resolved_default_ids,
                                    resolved_default_names,
                                    resolution_counts,
                                    meal=meal,
                                    component_type_id=component.get("component_type_id"),
                                )
                            )
                            if resolved_item_id is not None:
                                resolved_item_name = resolved_name
                            else:
                                resolution_status = "unresolved"
                                resolved_item_name = None
                                resolution_detail = resolution_error
                        combo_pack_components.append(
                            {
                                "item_name": resolved_item_name,
                                "component_type_name": component.get("component_type_name"),
                                "quantity_per_pack": round(component_qty, 3),
                                "total_units": round(ordered_units * component_qty, 3),
                                "resolution_status": resolution_status,
                                "detail": resolution_detail,
                            }
                        )
                    combo_packs.append(
                        {
                            "combo_id": int(combo_id),
                            "menu_item_id": int(menu_item_id),
                            "combo_name": parent_name,
                            "order_units": round(ordered_units, 3),
                            "pack_count": round(ordered_units, 3),
                            "components": combo_pack_components,
                        }
                    )
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
                                or "Item group still needs item-of-the-day resolution",
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
                                or "Item group still needs item-of-the-day resolution",
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

            is_exported = meal_status[meal]["is_production_generated"]
            meal_buffer_override = meal_status[meal].get("buffer_override_pct")
            stored_item_buffers = (
                _fetch_stored_item_buffers(cursor, int(meal_status[meal]["menu_id"]))
                if is_exported and meal_status[meal].get("menu_id") is not None
                else {}
            )

            def _build_item(value: Dict[str, Any]) -> Dict[str, Any]:
                item_id = int(value["item_id"])
                prod_qty = float(value["production_quantity"])
                buffer_pct = float(value.get("buffer_percentage") or 0.0)
                stored_buffer = stored_item_buffers.get(item_id)
                if is_exported and stored_buffer and stored_buffer["final_qty"] > 0:
                    buffer_qty = stored_buffer["buffer_qty"]
                    final_qty = stored_buffer["final_qty"]
                else:
                    effective_pct = (
                        meal_buffer_override
                        if is_exported and meal_buffer_override is not None
                        else buffer_pct
                    )
                    buffer_qty = prod_qty * effective_pct / 100
                    final_qty = prod_qty + buffer_qty
                return {
                    **value,
                    "order_units": round(float(value["order_units"]), 3),
                    "production_quantity": round(prod_qty, 3),
                    "buffer_percentage": round(buffer_pct, 2),
                    "buffer_quantity": round(buffer_qty, 3),
                    "with_buffer_quantity": round(final_qty, 3),
                }

            meal_items = sorted(
                (_build_item(value) for value in aggregate.values()),
                key=lambda item: (item.get("item_name") or "").lower(),
            )
            response_meals.append(
                {
                    "meal": meal,
                    "is_released": meal_status[meal]["is_released"],
                    "is_production_generated": meal_status[meal]["is_production_generated"],
                    "buffer_override_pct": meal_status[meal]["buffer_override_pct"],
                    "items": meal_items,
                    "combo_packs": combo_packs,
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


@router.get("/api/production/orders-summary")
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
) -> Dict[str, Any]:
    """Return a summary of ordered quantities per item for a given date and city.

    Args:
        date: Date string in YYYY-MM-DD format.
        menu_type: Optional BLD type filter.
        period_type: Menu period type (default "one_day").
        city_code: City code override; resolved from user context if omitted.
        user: Optional authenticated user (injected).

    Returns:
        Dict with date, menu_type, period_type, and list of order quantity rows.
    """
    db = get_raw_db()
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
                WHERE COALESCE(o.order_date, DATE(o.created_at)) = %s
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


@router.post("/api/production/plated-expand-preview")
def preview_plated_item_expansion(
    payload: PlatedExpansionPreviewPayload,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Preview the component expansion and production quantities for plated items.

    Args:
        payload: List of plated item_id / quantity entries to expand.
        user: Current admin user (injected).

    Returns:
        Dict with original items, expanded_items with production quantities, and
        any unresolved_component_types.
    """
    db = get_raw_db()
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


@router.get("/api/production/status")
def get_production_plan_status(date: str) -> Dict[str, Any]:
    """Return the production generated status for each BLD type on a given date.

    Args:
        date: Date string in YYYY-MM-DD format.

    Returns:
        Dict with date and list of status entries per bld_id/menu_type.
    """
    db = get_raw_db()
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
