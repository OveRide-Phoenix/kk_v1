"""Logistics router: delivery routes CRUD and trip-sheet generation."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime
import json
from typing import Any, Dict, List, Optional, Set

import mysql.connector
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from ..db import get_raw_db
from ..utils.auth_deps import admin_required
from ..utils.helpers import (
    ORDER_STATUS_CANCELLED,
    ORDER_STATUS_CONFIRMED,
    ORDER_STATUS_DELIVERED,
    ORDER_STATUS_DISPATCHED,
    _parse_optional_date,
    _resolve_city_context,
    get_food_meals_for_city,
    normalize_status_for_response,
    payment_status_label,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class TripSheetRequest(BaseModel):
    """Payload for generating a trip sheet."""

    date: str
    city_code: Optional[str] = None
    meal_type: Optional[str] = None


class TripSheetBulkStatusRequest(BaseModel):
    """Payload for bulk-updating trip-sheet order statuses for a date."""

    date: str
    city_code: Optional[str] = None
    meal_type: Optional[str] = None


class DeliveryRoutePayload(BaseModel):
    """Single delivery route entry for bulk-save."""

    route_id: Optional[int] = None
    route_code: str = Field(..., min_length=1, max_length=50)
    route_name: str = Field(..., min_length=1, max_length=150)
    notes: Optional[str] = None
    is_active: bool = True
    sort_order: Optional[int] = Field(default=0, ge=0)


class DeliveryRouteBulkSaveRequest(BaseModel):
    """Payload for bulk-saving delivery routes for a city."""

    city_code: Optional[str] = None
    routes: List[DeliveryRoutePayload] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _ensure_delivery_routes_table(db) -> None:
    """Create the delivery_routes table if it does not yet exist.

    Args:
        db: mysql.connector connection.
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


def _ensure_trip_sheets_table(db) -> None:
    """Create the trip_sheets table if it does not yet exist.

    Args:
        db: mysql.connector connection.
    """
    cursor = db.cursor()
    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS trip_sheets (
                trip_sheet_id INT NOT NULL AUTO_INCREMENT,
                service_date DATE NOT NULL,
                city_code VARCHAR(10) NOT NULL,
                meal_type VARCHAR(50) NOT NULL DEFAULT '',
                payload JSON NOT NULL,
                generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (trip_sheet_id),
                UNIQUE KEY uq_trip_sheets_service_city_meal (service_date, city_code, meal_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
            """
        )
        db.commit()
    finally:
        cursor.close()


def _normalized_meal_type(meal_type: Optional[str]) -> str:
    """Normalize a trip sheet meal type for persistence and lookups.

    Args:
        meal_type: Raw meal type from the request.

    Returns:
        Trimmed meal type, or an empty string for all-meal sheets.
    """
    return (meal_type or "").strip()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/api/logistics/routes")
def list_delivery_routes(
    city_code: Optional[str] = Query(None, alias="city_code"),
    user: Dict[str, Any] = Depends(admin_required),
) -> List[Dict[str, Any]]:
    """Return all delivery routes for the resolved city, ordered by sort_order then route_code.

    Args:
        city_code: City code override; resolved from user context if omitted.
        user: Current admin user (injected).

    Returns:
        List of delivery route dicts.
    """
    db = get_raw_db()
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


@router.post("/api/logistics/routes/bulk-save")
def bulk_save_delivery_routes(
    payload: DeliveryRouteBulkSaveRequest,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Replace the set of delivery routes for a city with the provided list.

    Existing routes present in the payload are updated in-place; routes not present
    in the payload are deleted; new routes are inserted.

    Args:
        payload: city_code and list of route entries.
        user: Current admin user (injected).

    Returns:
        Dict with city_code and updated routes list.
    """
    db = get_raw_db()
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


@router.get("/api/logistics/trip-sheet/unassigned-routes")
def get_unassigned_route_customers(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    city_code: Optional[str] = Query(None),
    meal_type: Optional[str] = Query(
        None, description="Filter to orders containing this meal type"
    ),
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Return customers with active orders whose delivery address has no route assignment.

    This must return an empty list before a trip sheet can be generated.

    Args:
        date: Service date in YYYY-MM-DD format.
        city_code: City to filter by; defaults to admin's active city.
        meal_type: Optional meal type to scope the check (e.g. "Breakfast").
        user: Current admin user (injected).

    Returns:
        Dict with unassigned_count and list of customers with order and address details.
    """
    parsed_date = _parse_optional_date(date)
    if not parsed_date:
        raise HTTPException(status_code=400, detail="Valid date required (YYYY-MM-DD)")
    target_city = _resolve_city_context(city_code, user)
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        meal_filter_sql = ""
        params: tuple = (parsed_date, target_city)
        if meal_type:
            meal_filter_sql = """
              AND EXISTS (
                SELECT 1 FROM order_items oi_m
                WHERE oi_m.order_id = o.order_id
                  AND LOWER(oi_m.meal_type) = LOWER(%s)
              )"""
            params = (parsed_date, target_city, meal_type)
        cursor.execute(
            f"""
            SELECT
                o.order_id,
                o.total_price,
                o.status,
                c.customer_id,
                c.name AS customer_name,
                c.primary_mobile,
                a.address_id,
                a.house_apartment_no,
                a.written_address,
                a.city,
                a.route_id
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN addresses a ON o.address_id = a.address_id
            WHERE COALESCE(o.order_date, DATE(o.created_at)) = %s
              AND a.city_code = %s
              AND o.status NOT IN ('Cancelled', 'Delivered')
              AND a.route_id IS NULL
              {meal_filter_sql}
            ORDER BY c.name
            """,
            params,
        )
        rows = cursor.fetchall() or []
        return {
            "date": parsed_date.isoformat(),
            "city_code": target_city,
            "unassigned_count": len(rows),
            "customers": [
                {
                    "order_id": row["order_id"],
                    "customer_id": row["customer_id"],
                    "customer_name": row["customer_name"],
                    "phone": row["primary_mobile"],
                    "total_price": float(row["total_price"] or 0),
                    "status": row["status"],
                    "address": {
                        "address_id": row["address_id"],
                        "house_apartment_no": row["house_apartment_no"],
                        "written_address": row["written_address"],
                        "city": row["city"],
                    },
                }
                for row in rows
            ],
        }
    finally:
        cursor.close()
        db.close()


@router.get("/api/logistics/trip-sheet")
def get_saved_trip_sheet(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    city_code: Optional[str] = Query(None),
    meal_type: Optional[str] = Query(None, description="Load the saved sheet for this meal type"),
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Return a previously generated trip sheet for a date, city, and meal.

    Args:
        date: Service date in YYYY-MM-DD format.
        city_code: City to filter by; defaults to admin's active city.
        meal_type: Optional meal type scope (e.g. "Breakfast").
        user: Current admin user (injected).

    Returns:
        The stored trip sheet payload.
    """
    parsed_date = _parse_optional_date(date)
    if not parsed_date:
        raise HTTPException(status_code=400, detail="Valid date required (YYYY-MM-DD)")

    target_city = _resolve_city_context(city_code, user)
    normalized_meal = _normalized_meal_type(meal_type)
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        _ensure_trip_sheets_table(db)
        cursor.execute(
            """
            SELECT payload
              FROM trip_sheets
             WHERE service_date = %s
               AND city_code = %s
               AND meal_type = %s
            """,
            (parsed_date, target_city, normalized_meal),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Trip sheet not found")

        payload = row.get("payload")
        if isinstance(payload, str):
            return json.loads(payload)
        return payload
    finally:
        cursor.close()
        db.close()


@router.post("/api/logistics/trip-sheet/mark-delivered")
def mark_trip_sheet_orders_delivered(
    payload: TripSheetBulkStatusRequest,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Mark all active orders for a service date and city as delivered.

    This bulk action is intended for admins completing daily delivery runs from
    the trip-sheet page. It updates both the orders table and the stored trip
    sheet payload for the same date, city, and meal.

    Args:
        payload: Service date, optional city_code, and optional meal_type.
        user: Current admin user (injected).

    Returns:
        Dict with the service date, city_code, meal_type, and number of orders updated.
    """
    parsed_date = _parse_optional_date(payload.date)
    if not parsed_date:
        raise HTTPException(status_code=400, detail="Valid date required (YYYY-MM-DD)")

    target_city = _resolve_city_context(payload.city_code, user)
    normalized_meal = _normalized_meal_type(payload.meal_type)
    meal_type = normalized_meal or None
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        _ensure_trip_sheets_table(db)
        meal_filter_sql = ""
        query_params: tuple = (parsed_date, target_city)
        if meal_type:
            meal_filter_sql = """
              AND EXISTS (
                SELECT 1 FROM order_items oi_m
                WHERE oi_m.order_id = o.order_id
                  AND LOWER(oi_m.meal_type) = LOWER(%s)
              )"""
            query_params = (parsed_date, target_city, meal_type)
        cursor.execute(
            f"""
            SELECT o.order_id, o.status
              FROM orders o
              JOIN addresses a ON o.address_id = a.address_id
             WHERE COALESCE(o.order_date, DATE(o.created_at)) = %s
               AND a.city_code = %s
               {meal_filter_sql}
            """,
            query_params,
        )
        rows = cursor.fetchall() or []
        deliverable_ids = [
            int(row["order_id"])
            for row in rows
            if normalize_status_for_response(row.get("status")).lower()
            not in {ORDER_STATUS_DELIVERED.lower(), "cancelled"}
        ]

        updated_rows = 0
        if deliverable_ids:
            placeholders = ", ".join(["%s"] * len(deliverable_ids))
            cursor.execute(
                f"""
                UPDATE orders
                   SET status = %s
                 WHERE order_id IN ({placeholders})
                """,
                (ORDER_STATUS_DELIVERED, *deliverable_ids),
            )
            updated_rows = cursor.rowcount

            cursor.execute(
                """
                SELECT trip_sheet_id, payload
                  FROM trip_sheets
                 WHERE service_date = %s
                   AND city_code = %s
                   AND meal_type = %s
                """,
                (parsed_date, target_city, normalized_meal),
            )
            for sheet_row in cursor.fetchall() or []:
                raw_payload = sheet_row.get("payload")
                payload_obj = (
                    json.loads(raw_payload) if isinstance(raw_payload, str) else raw_payload
                )
                if not isinstance(payload_obj, dict):
                    continue
                routes = payload_obj.get("routes")
                if not isinstance(routes, list):
                    continue

                payload_changed = False
                for route in routes:
                    orders = route.get("orders")
                    if not isinstance(orders, list):
                        continue
                    for order in orders:
                        order_id = order.get("order_id")
                        if (
                            order_id in deliverable_ids
                            and order.get("status") != ORDER_STATUS_CANCELLED
                        ):
                            order["status"] = ORDER_STATUS_DELIVERED
                            payload_changed = True

                if payload_changed:
                    cursor.execute(
                        """
                        UPDATE trip_sheets
                           SET payload = CAST(%s AS JSON)
                         WHERE trip_sheet_id = %s
                        """,
                        (json.dumps(payload_obj), sheet_row["trip_sheet_id"]),
                    )

        db.commit()
        return {
            "date": parsed_date.isoformat(),
            "city_code": target_city,
            "meal_type": meal_type,
            "updated_orders": updated_rows,
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.post("/api/logistics/trip-sheet")
def generate_trip_sheet_report(
    payload: TripSheetRequest,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Generate a trip sheet grouped by delivery route for a given date and city.

    Validates that production has been finalized for all released meals before
    generating. Updates qualifying order statuses to "Dispatched".

    Args:
        payload: Date, optional city_code, and optional meal_type filter.
        user: Current admin user (injected).

    Returns:
        Dict with date, city_code, meal_type, routes (with orders), status_updates, and generated_at.
    """
    parsed_date = _parse_optional_date(payload.date)
    if not parsed_date:
        raise HTTPException(status_code=400, detail="Valid date required (YYYY-MM-DD)")
    target_city = _resolve_city_context(payload.city_code, user)
    normalized_meal = _normalized_meal_type(payload.meal_type)
    meal_type = normalized_meal or None
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        _ensure_delivery_routes_table(db)
        _ensure_trip_sheets_table(db)
        meals_requiring_production = (
            [meal_type] if meal_type else get_food_meals_for_city(target_city)
        )
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

        meal_filter_sql = ""
        orders_params: tuple = (parsed_date, target_city)
        if meal_type:
            meal_filter_sql = """
              AND EXISTS (
                SELECT 1 FROM order_items oi_m
                WHERE oi_m.order_id = o.order_id
                  AND LOWER(oi_m.meal_type) = LOWER(%s)
              )"""
            orders_params = (parsed_date, target_city, meal_type)
        cursor.execute(
            f"""
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
                a.route_id,
                dr.route_code,
                dr.route_name,
                dr.sort_order
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN addresses a ON o.address_id = a.address_id
            LEFT JOIN delivery_routes dr ON dr.route_id = a.route_id
           WHERE COALESCE(o.order_date, DATE(o.created_at)) = %s
             AND a.city_code = %s
             {meal_filter_sql}
           ORDER BY COALESCE(dr.sort_order, 9999), COALESCE(dr.route_name, ''), c.name
            """,
            orders_params,
        )
        rows = cursor.fetchall() or []

        order_items_map: Dict[int, List[Dict[str, Any]]] = {}
        if rows:
            order_ids = [row["order_id"] for row in rows]
            id_placeholders = ", ".join(["%s"] * len(order_ids))
            items_meal_filter = ""
            items_params: tuple = tuple(order_ids)
            if meal_type:
                items_meal_filter = "AND LOWER(oi.meal_type) = LOWER(%s)"
                items_params = (*order_ids, meal_type)
            cursor.execute(
                f"""
                SELECT
                    oi.order_id,
                    oi.quantity,
                    oi.price,
                    oi.meal_type,
                    COALESCE(i.name, co.combo_name) AS item_name
                FROM order_items oi
                LEFT JOIN items i ON oi.item_id = i.item_id
                LEFT JOIN combos co ON oi.combo_id = co.combo_id
                WHERE oi.order_id IN ({id_placeholders})
                  {items_meal_filter}
                ORDER BY oi.order_id, COALESCE(i.name, co.combo_name)
                """,
                items_params,
            )
            for item_row in cursor.fetchall() or []:
                oid = item_row["order_id"]
                qty = int(item_row.get("quantity") or 0)
                price = float(item_row.get("price") or 0)
                order_items_map.setdefault(oid, []).append(
                    {
                        "item_name": item_row.get("item_name") or "Item",
                        "meal_type": item_row.get("meal_type"),
                        "quantity": qty,
                        "price": price,
                        "line_total": round(qty * price, 2),
                    }
                )

        route_groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        route_sort_order: Dict[str, int] = {}
        updatable_statuses = {ORDER_STATUS_CONFIRMED.lower()}
        legacy_updatable_statuses = {"preparing", "processing"}

        for row in rows:
            route_label = row.get("route_name") or "Unassigned"
            route_sort_order.setdefault(route_label, int(row.get("sort_order") or 9999))
            normalized_display = normalize_status_for_response(row.get("status"))
            raw_status_key = (
                str(row.get("status") or "").strip().lower().replace(" (payment due)", "")
            )
            if (
                normalized_display.lower() in updatable_statuses
                or raw_status_key in legacy_updatable_statuses
            ):
                display_status = ORDER_STATUS_DISPATCHED
            else:
                display_status = normalized_display
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
                    "payment_status": payment_status_label(bool(row.get("paid"))),
                    "status": display_status,
                    "address": {
                        "address_id": row.get("address_id"),
                        "label": row.get("address_type"),
                        "house_apartment_no": row.get("house_apartment_no"),
                        "written_address": row.get("written_address"),
                        "city": row.get("city"),
                        "pin_code": row.get("pin_code"),
                    },
                    "items": order_items_map.get(row["order_id"], []),
                }
            )

        updatable_order_ids = [
            row["order_id"]
            for row in rows
            if normalize_status_for_response(row.get("status")).lower() in updatable_statuses
            or str(row.get("status") or "").strip().lower().replace(" (payment due)", "")
            in legacy_updatable_statuses
        ]
        updated_rows = 0
        if updatable_order_ids:
            id_ph = ", ".join(["%s"] * len(updatable_order_ids))
            status_compare_expr = "LOWER(REPLACE(COALESCE(status, ''), ' (Payment Due)', ''))"
            previous_statuses = sorted(updatable_statuses | legacy_updatable_statuses)
            prev_ph = ", ".join(["%s"] * len(previous_statuses))
            cursor.execute(
                f"""
                UPDATE orders
                   SET status = %s
                 WHERE order_id IN ({id_ph})
                   AND {status_compare_expr} IN ({prev_ph})
                """,
                (
                    ORDER_STATUS_DISPATCHED,
                    *updatable_order_ids,
                    *previous_statuses,
                ),
            )
            updated_rows = cursor.rowcount
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

        response_payload = {
            "date": parsed_date.isoformat(),
            "city_code": target_city,
            "meal_type": meal_type,
            "routes": routes_payload,
            "status_updates": updated_rows,
            "generated_at": datetime.utcnow().isoformat() + "Z",
        }
        cursor.execute(
            """
            INSERT INTO trip_sheets (service_date, city_code, meal_type, payload)
            VALUES (%s, %s, %s, CAST(%s AS JSON))
            ON DUPLICATE KEY UPDATE
                payload = VALUES(payload),
                generated_at = CURRENT_TIMESTAMP
            """,
            (
                parsed_date,
                target_city,
                normalized_meal,
                json.dumps(response_payload),
            ),
        )
        db.commit()
        return response_payload
    finally:
        cursor.close()
        db.close()
