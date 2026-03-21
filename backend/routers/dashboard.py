"""Dashboard router: admin metrics and daily checklist."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

import mysql.connector
from fastapi import APIRouter, Depends, HTTPException, Query

from ..customer.customer_crud import get_customer_count
from ..db import get_raw_db
from ..utils.auth_deps import admin_required
from ..utils.helpers import (
    PENDING_ORDER_STATUS_NAMES,
    _resolve_city_context,
    format_status_with_payment,
    get_supported_meals_for_city,
)

router = APIRouter()


@router.get("/api/dashboard/metrics")
def get_dashboard_metrics(
    city_code: Optional[str] = Query(None, alias="city_code"),
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Return admin dashboard metrics including order counts, revenue, and daily checklist.

    Args:
        city_code: City code override; resolved from user context if omitted.
        user: Current admin user (injected).

    Returns:
        Dict with totalCustomers, totalOrders, pendingOrders, revenue figures,
        recentOrders list, and a daily operations checklist.
    """
    db = get_raw_db()
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
