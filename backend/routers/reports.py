from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, Iterable, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database import get_db

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def _validate_date_range(start_date: date, end_date: date) -> Tuple[date, date]:
    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date must be on or before end_date",
        )
    return start_date, end_date


def _as_float(value: Any) -> float:
    if isinstance(value, Decimal):
        return float(value)
    if value is None:
        return 0.0
    return float(value)


def _date_keyed_result(rows: Iterable[Dict[str, Any]], key: str) -> Dict[date, Dict[str, Any]]:
    mapping: Dict[date, Dict[str, Any]] = {}
    for row in rows:
        report_date = row.get(key)
        if isinstance(report_date, date):
            mapping[report_date] = dict(row)
        else:
            # Attempt to coerce from string in YYYY-MM-DD format
            mapping[date.fromisoformat(str(report_date))] = dict(row)
    return mapping


def _list_with_zero_fill(
    start_date: date,
    end_date: date,
    rows_by_date: Dict[date, Dict[str, Any]],
) -> List[Dict[str, Any]]:
    current = start_date
    output: List[Dict[str, Any]] = []
    while current <= end_date:
        entry = rows_by_date.get(current)
        if entry is None:
            output.append(
                {
                    "date": current.isoformat(),
                    "total_sales": 0.0,
                    "total_orders": 0,
                }
            )
        else:
            output.append(
                {
                    "date": current.isoformat(),
                    "total_sales": _as_float(entry.get("total_sales")),
                    "total_orders": int(entry.get("total_orders") or 0),
                }
            )
        current += timedelta(days=1)
    return output


@router.get("/sales")
def get_sales_report(
    start_date: date = Query(..., description="Inclusive start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="Inclusive end date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    start_date, end_date = _validate_date_range(start_date, end_date)
    result = db.execute(
        text(
            """
            SELECT
                DATE(o.created_at) AS report_date,
                SUM(o.total_price) AS total_sales,
                COUNT(*) AS total_orders
            FROM orders o
            WHERE DATE(o.created_at) BETWEEN :start_date AND :end_date
            GROUP BY report_date
            ORDER BY report_date
            """
        ),
        {"start_date": start_date, "end_date": end_date},
    )

    rows = [dict(row) for row in result.mappings().all()]
    rows_by_date = _date_keyed_result(rows, "report_date")
    return _list_with_zero_fill(start_date, end_date, rows_by_date)


@router.get("/category")
def get_category_report(
    start_date: date = Query(..., description="Inclusive start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="Inclusive end date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    start_date, end_date = _validate_date_range(start_date, end_date)
    result = db.execute(
        text(
            """
            SELECT
                COALESCE(c.category_name, 'Uncategorized') AS category_name,
                SUM(oi.quantity) AS total_items_sold,
                SUM(oi.quantity * oi.price) AS total_revenue
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.order_id
            LEFT JOIN items i ON i.item_id = oi.item_id
            LEFT JOIN categories c ON c.category_id = i.category_id
            WHERE DATE(o.created_at) BETWEEN :start_date AND :end_date
            GROUP BY category_name
            ORDER BY total_revenue DESC
            """
        ),
        {"start_date": start_date, "end_date": end_date},
    )

    report: List[Dict[str, Any]] = []
    for row in result.mappings().all():
        report.append(
            {
                "category_name": row["category_name"],
                "total_items_sold": int(row.get("total_items_sold") or 0),
                "total_revenue": _as_float(row.get("total_revenue")),
            }
        )
    return report


@router.get("/customers")
def get_top_customers_report(
    start_date: date = Query(..., description="Inclusive start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="Inclusive end date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    start_date, end_date = _validate_date_range(start_date, end_date)
    result = db.execute(
        text(
            """
            SELECT
                cu.name AS customer_name,
                COUNT(DISTINCT o.order_id) AS total_orders,
                SUM(o.total_price) AS total_spent,
                MAX(o.created_at) AS last_order_date
            FROM orders o
            JOIN customers cu ON cu.customer_id = o.customer_id
            WHERE DATE(o.created_at) BETWEEN :start_date AND :end_date
            GROUP BY cu.customer_id, cu.name
            ORDER BY total_spent DESC
            LIMIT 10
            """
        ),
        {"start_date": start_date, "end_date": end_date},
    )

    report: List[Dict[str, Any]] = []
    for row in result.mappings().all():
        report.append(
            {
                "customer_name": row["customer_name"],
                "total_orders": int(row.get("total_orders") or 0),
                "total_spent": _as_float(row.get("total_spent")),
                "last_order_date": (
                    row.get("last_order_date").isoformat()
                    if row.get("last_order_date")
                    else None
                ),
            }
        )
    return report


def _subscriptions_table_metadata(db: Session) -> Optional[Tuple[str, str, Optional[str]]]:
    exists = db.execute(
        text(
            """
            SELECT COUNT(*) AS total
            FROM information_schema.tables
            WHERE table_schema = DATABASE() AND table_name = :table_name
            """
        ),
        {"table_name": "subscriptions"},
    ).scalar()

    if not exists:
        return None

    column_rows = db.execute(
        text(
            """
            SELECT COLUMN_NAME
            FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = :table_name
            """
        ),
        {"table_name": "subscriptions"},
    ).fetchall()

    columns = {row[0] for row in column_rows}
    plan_column = next(
        (candidate for candidate in ("plan_type", "plan_name", "name") if candidate in columns),
        None,
    )
    date_column = next(
        (
            candidate
            for candidate in ("created_at", "start_date", "subscription_date", "updated_at")
            if candidate in columns
        ),
        None,
    )
    revenue_column = next(
        (
            candidate
            for candidate in ("total_price", "price", "amount", "total_amount", "revenue")
            if candidate in columns
        ),
        None,
    )

    if plan_column and date_column:
        return plan_column, date_column, revenue_column
    return None


@router.get("/subscriptions")
def get_subscription_report(
    start_date: date = Query(..., description="Inclusive start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="Inclusive end date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    start_date, end_date = _validate_date_range(start_date, end_date)

    metadata = _subscriptions_table_metadata(db)
    if metadata:
        plan_column, date_column, revenue_column = metadata
        revenue_expression = (
            f"SUM(COALESCE({revenue_column}, 0))" if revenue_column else "0"
        )
        query = text(
            f"""
            SELECT
                {plan_column} AS plan_type,
                COUNT(*) AS total_subscriptions,
                {revenue_expression} AS total_revenue
            FROM subscriptions
            WHERE DATE({date_column}) BETWEEN :start_date AND :end_date
            GROUP BY {plan_column}
            ORDER BY total_subscriptions DESC
            """
        )
        result = db.execute(query, {"start_date": start_date, "end_date": end_date})
    else:
        result = db.execute(
            text(
                """
                SELECT
                    COALESCE(o.order_type, 'subscription') AS plan_type,
                    COUNT(*) AS total_subscriptions,
                    SUM(o.total_price) AS total_revenue
                FROM orders o
                WHERE LOWER(COALESCE(o.order_type, '')) = 'subscription'
                  AND DATE(o.created_at) BETWEEN :start_date AND :end_date
                GROUP BY COALESCE(o.order_type, 'subscription')
                ORDER BY total_subscriptions DESC
                """
            ),
            {"start_date": start_date, "end_date": end_date},
        )

    report: List[Dict[str, Any]] = []
    for row in result.mappings().all():
        report.append(
            {
                "plan_type": row.get("plan_type") or "Unknown",
                "total_subscriptions": int(row.get("total_subscriptions") or 0),
                "total_revenue": _as_float(row.get("total_revenue")),
            }
        )
    return report
