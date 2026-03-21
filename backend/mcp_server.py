"""Kuteera Kitchen MCP server.

Exposes key backend operations as MCP tools so that AI agents can query
menu data, order information, production status, and customer details.

Run with:
    python -m backend.mcp_server
Or via FastMCP CLI:
    fastmcp run backend/mcp_server.py
"""

from __future__ import annotations

from datetime import date
from typing import Any, Dict, List, Optional

import fastmcp

from .city_config import DEFAULT_CITY, normalize_city_code
from .db import get_raw_db
from .utils.helpers import (
    MENU_TYPE_ONE_DAY,
    resolve_bld_id,
)

mcp = fastmcp.FastMCP(
    name="kuteera-kitchen",
    instructions=(
        "Tools for querying Kuteera Kitchen data: menus, orders, customers, "
        "production status, and delivery routes. Always pass city_code (e.g. 'MYS' or 'BLR') "
        "when filtering city-scoped data."
    ),
)


# ---------------------------------------------------------------------------
# Menu tools
# ---------------------------------------------------------------------------


@mcp.tool()
def get_daily_menu(
    date_str: str,
    bld_type: str,
    city_code: str = DEFAULT_CITY,
) -> Dict[str, Any]:
    """Return the released daily menu for a specific date, meal type, and city.

    Args:
        date_str: Date in YYYY-MM-DD format.
        bld_type: Meal type: Breakfast, Lunch, Dinner, or Condiments.
        city_code: City code (e.g. MYS or BLR).

    Returns:
        Dict with menu_id, date, bld_type, city_code, is_released, is_production_generated,
        and list of menu items.
    """
    city = normalize_city_code(city_code)
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        bld_id = resolve_bld_id(cursor, bld_type)
        cursor.execute(
            """
            SELECT m.menu_id, m.date, b.bld_type, m.city_code,
                   m.is_released, m.is_production_generated
              FROM menu m
              JOIN bld b ON m.bld_id = b.bld_id
             WHERE m.date = %s AND m.bld_id = %s AND m.city_code = %s
             LIMIT 1
            """,
            (date_str, bld_id, city),
        )
        menu_row = cursor.fetchone()
        if not menu_row:
            return {"error": f"No menu found for {date_str} {bld_type} in {city}"}

        menu_id = menu_row["menu_id"]
        cursor.execute(
            """
            SELECT mi.menu_item_id, mi.item_id, mi.combo_id,
                   COALESCE(i.name, c.combo_name) AS item_name,
                   mi.max_qty, mi.available_qty, mi.rate, mi.sort_order
              FROM menu_items mi
              LEFT JOIN items i ON mi.item_id = i.item_id
              LEFT JOIN combos c ON mi.combo_id = c.combo_id
             WHERE mi.menu_id = %s
             ORDER BY mi.sort_order ASC, mi.menu_item_id ASC
            """,
            (menu_id,),
        )
        items = cursor.fetchall() or []
        return {
            **menu_row,
            "is_released": bool(menu_row.get("is_released")),
            "is_production_generated": bool(menu_row.get("is_production_generated")),
            "items": [
                {
                    "menu_item_id": row["menu_item_id"],
                    "item_id": row.get("item_id"),
                    "combo_id": row.get("combo_id"),
                    "item_name": row.get("item_name"),
                    "max_qty": float(row.get("max_qty") or 0),
                    "available_qty": float(row.get("available_qty") or 0),
                    "rate": float(row.get("rate") or 0),
                    "sort_order": row.get("sort_order"),
                }
                for row in items
            ],
        }
    finally:
        cursor.close()
        db.close()


# ---------------------------------------------------------------------------
# Order tools
# ---------------------------------------------------------------------------


@mcp.tool()
def get_orders_for_date(
    date_str: str,
    city_code: str = DEFAULT_CITY,
    status_filter: Optional[str] = None,
) -> Dict[str, Any]:
    """Return a summary of all orders for a given date and city.

    Args:
        date_str: Date in YYYY-MM-DD format.
        city_code: City code (e.g. MYS or BLR).
        status_filter: Optional status string to filter by (e.g. "Confirmed").

    Returns:
        Dict with date, city_code, total_orders, and list of order summaries.
    """
    city = normalize_city_code(city_code)
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        params: list = [date_str, city]
        status_clause = ""
        if status_filter:
            status_clause = "AND LOWER(o.status) LIKE LOWER(%s)"
            params.append(f"%{status_filter}%")

        cursor.execute(
            f"""
            SELECT o.order_id, o.status, o.total_price, o.payment_method, o.paid,
                   o.created_at, c.name AS customer_name, c.primary_mobile
              FROM orders o
              JOIN customers c ON o.customer_id = c.customer_id
              JOIN addresses a ON o.address_id = a.address_id
             WHERE DATE(o.created_at) = %s
               AND a.city_code = %s
               {status_clause}
             ORDER BY o.created_at DESC
            """,
            params,
        )
        rows = cursor.fetchall() or []
        return {
            "date": date_str,
            "city_code": city,
            "total_orders": len(rows),
            "orders": [
                {
                    "order_id": row["order_id"],
                    "customer_name": row.get("customer_name"),
                    "phone": row.get("primary_mobile"),
                    "status": row.get("status"),
                    "total_price": float(row.get("total_price") or 0),
                    "payment_method": row.get("payment_method"),
                    "paid": bool(row.get("paid")),
                    "created_at": (
                        row["created_at"].isoformat() if row.get("created_at") else None
                    ),
                }
                for row in rows
            ],
        }
    finally:
        cursor.close()
        db.close()


@mcp.tool()
def get_order_detail(order_id: int) -> Dict[str, Any]:
    """Return full details for a single order including all line items.

    Args:
        order_id: The order ID to look up.

    Returns:
        Dict with order header fields and items list, or an error dict if not found.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT o.order_id, o.status, o.total_price, o.payment_method, o.paid,
                   o.created_at, o.notes,
                   c.name AS customer_name, c.primary_mobile, c.email,
                   a.written_address, a.city, a.pin_code
              FROM orders o
              JOIN customers c ON o.customer_id = c.customer_id
              JOIN addresses a ON o.address_id = a.address_id
             WHERE o.order_id = %s
             LIMIT 1
            """,
            (order_id,),
        )
        order = cursor.fetchone()
        if not order:
            return {"error": f"Order {order_id} not found"}

        cursor.execute(
            """
            SELECT oi.quantity, oi.price, oi.meal_type,
                   COALESCE(i.name, c.combo_name) AS item_name
              FROM order_items oi
              LEFT JOIN items i ON oi.item_id = i.item_id
              LEFT JOIN combos c ON oi.combo_id = c.combo_id
             WHERE oi.order_id = %s
             ORDER BY oi.id ASC
            """,
            (order_id,),
        )
        items = cursor.fetchall() or []
        return {
            **{k: (v.isoformat() if hasattr(v, "isoformat") else v) for k, v in order.items()},
            "paid": bool(order.get("paid")),
            "items": [
                {
                    "item_name": row.get("item_name"),
                    "meal_type": row.get("meal_type"),
                    "quantity": float(row.get("quantity") or 0),
                    "price": float(row.get("price") or 0),
                    "line_total": round(
                        float(row.get("quantity") or 0) * float(row.get("price") or 0), 2
                    ),
                }
                for row in items
            ],
        }
    finally:
        cursor.close()
        db.close()


# ---------------------------------------------------------------------------
# Production tools
# ---------------------------------------------------------------------------


@mcp.tool()
def get_production_status(date_str: str) -> Dict[str, Any]:
    """Return the production plan status for each meal type on a given date.

    Args:
        date_str: Date in YYYY-MM-DD format.

    Returns:
        Dict with date and list of status entries (bld_id, menu_type, is_generated).
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT m.bld_id, b.bld_type,
                   MAX(m.is_production_generated) AS is_generated,
                   MAX(m.is_released) AS is_released
              FROM menu m
              JOIN bld b ON m.bld_id = b.bld_id
             WHERE m.date = %s
          GROUP BY m.bld_id, b.bld_type
            """,
            (date_str,),
        )
        rows = cursor.fetchall() or []
        return {
            "date": date_str,
            "status": [
                {
                    "bld_id": row["bld_id"],
                    "menu_type": row["bld_type"],
                    "is_released": bool(row.get("is_released")),
                    "is_generated": bool(row.get("is_generated")),
                }
                for row in rows
            ],
        }
    finally:
        cursor.close()
        db.close()


# ---------------------------------------------------------------------------
# Customer tools
# ---------------------------------------------------------------------------


@mcp.tool()
def search_customers(
    query: str,
    city_code: str = DEFAULT_CITY,
    limit: int = 20,
) -> Dict[str, Any]:
    """Search customers by name or phone number within a city.

    Args:
        query: Search string matched against name or primary_mobile.
        city_code: City code to scope the search (e.g. MYS or BLR).
        limit: Maximum number of results to return (default 20, max 100).

    Returns:
        Dict with total and list of matching customer records.
    """
    city = normalize_city_code(city_code)
    safe_limit = max(1, min(int(limit), 100))
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT DISTINCT c.customer_id, c.name, c.primary_mobile, c.email, c.created_at
              FROM customers c
              JOIN addresses a ON c.customer_id = a.customer_id
             WHERE a.city_code = %s
               AND (c.name LIKE %s OR c.primary_mobile LIKE %s)
             ORDER BY c.name ASC
             LIMIT %s
            """,
            (city, f"%{query}%", f"%{query}%", safe_limit),
        )
        rows = cursor.fetchall() or []
        return {
            "city_code": city,
            "query": query,
            "total": len(rows),
            "customers": [
                {
                    "customer_id": row["customer_id"],
                    "name": row.get("name"),
                    "phone": row.get("primary_mobile"),
                    "email": row.get("email"),
                    "created_at": (
                        row["created_at"].isoformat() if row.get("created_at") else None
                    ),
                }
                for row in rows
            ],
        }
    finally:
        cursor.close()
        db.close()


# ---------------------------------------------------------------------------
# Delivery tools
# ---------------------------------------------------------------------------


@mcp.tool()
def get_delivery_routes(city_code: str = DEFAULT_CITY) -> Dict[str, Any]:
    """Return all active delivery routes for a city.

    Args:
        city_code: City code (e.g. MYS or BLR).

    Returns:
        Dict with city_code and list of route records.
    """
    city = normalize_city_code(city_code)
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT route_id, route_code, route_name, notes, is_active, sort_order
              FROM delivery_routes
             WHERE city_code = %s AND is_active = 1
             ORDER BY sort_order ASC, route_code ASC
            """,
            (city,),
        )
        rows = cursor.fetchall() or []
        return {
            "city_code": city,
            "routes": [
                {
                    "route_id": row["route_id"],
                    "route_code": row.get("route_code"),
                    "route_name": row.get("route_name"),
                    "notes": row.get("notes"),
                    "sort_order": row.get("sort_order"),
                }
                for row in rows
            ],
        }
    finally:
        cursor.close()
        db.close()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()
