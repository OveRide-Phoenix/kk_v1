"""Orders router: customer order creation, quote, and admin order management."""

from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Any, Dict, List, Optional

import mysql.connector
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ..db import get_raw_db
from ..utils.auth_deps import admin_required
from ..utils.helpers import (
    ORDER_STATUS_CONFIRMED,
    _format_datetime,
    _parse_optional_date,
    _resolve_city_context,
    normalize_status_for_response,
    normalize_order_status,
    payment_status_label,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class OrderItemPayload(BaseModel):
    """Payload for a single item line in an order."""

    item_id: Optional[int] = None
    combo_id: Optional[int] = None
    quantity: int
    price: float
    menu_item_id: Optional[int] = None
    meal_type: Optional[str] = None


class CreateOrderPayload(BaseModel):
    """Payload for creating a new customer order."""

    customer_id: int
    address_id: Optional[int] = None
    payment_method: str
    items: List[OrderItemPayload]
    order_date: Optional[str] = None
    order_type: Optional[str] = None
    coupon_codes: Optional[List[str]] = None


class OrderQuotePayload(BaseModel):
    """Payload for getting a price quote before placing an order."""

    items: List[OrderItemPayload]
    coupon_codes: Optional[List[str]] = None


class OrderStatusUpdate(BaseModel):
    """Payload for updating an order's status."""

    status: str = Field(..., min_length=1, max_length=50)


class OrderPaymentUpdate(BaseModel):
    """Payload for updating an order's payment state."""

    paid: bool


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _load_coupon_discount(
    cursor, coupon_codes: Optional[List[str]], subtotal: float
) -> tuple[float, List[str]]:
    """Load and apply coupon discounts to a subtotal.

    Args:
        cursor: DB cursor.
        coupon_codes: List of coupon code strings to apply.
        subtotal: Order subtotal before discounts.

    Returns:
        Tuple of (discount_amount, applied_coupon_codes).
    """
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


def _load_tax_amounts(cursor, discounted_subtotal: float) -> tuple[float, float]:
    """Load CGST and SGST tax percentages and compute tax amounts.

    Args:
        cursor: DB cursor.
        discounted_subtotal: Subtotal after discount applied.

    Returns:
        Tuple of (cgst_amount, sgst_amount).
    """
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
    """Compute order totals including discount and taxes.

    Args:
        cursor: DB cursor.
        items: List of order item payloads.
        coupon_codes: Optional list of coupon codes to apply.

    Returns:
        Dict with subtotal, discount, cgst, sgst, total_price, and coupon_codes.
    """
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


def _apply_order_filters(
    base_where: List[str],
    params: List,
    status: Optional[str],
    customer: Optional[str],
    product: Optional[str],
) -> None:
    """Append WHERE clause fragments for admin order history filters.

    Args:
        base_where: Mutable list of WHERE clause strings to append to.
        params: Mutable list of query params to append to.
        status: Status string to filter by (or None for all).
        customer: Customer name/phone substring to filter by.
        product: Product name substring to filter by.
    """
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


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/api/orders/quote")
def quote_order(payload: OrderQuotePayload) -> Dict[str, Any]:
    """Return a price quote for a set of items without placing an order.

    Args:
        payload: Items and optional coupon codes to quote.

    Returns:
        Dict with subtotal, discount, cgst, sgst, total_price, and applied coupon_codes.
    """
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must include at least one item")
    db = get_raw_db()
    cursor = db.cursor()
    try:
        totals = _compute_order_totals(cursor, payload.items, payload.coupon_codes)
        return totals
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.post("/api/orders/create")
def create_order(payload: CreateOrderPayload) -> Dict[str, Any]:
    """Place a new customer order.

    Validates the customer's address, computes totals (with coupon and taxes),
    inserts order and order_items, and decrements menu_item available_qty.

    Args:
        payload: Order creation payload with customer_id, address_id, items, etc.

    Returns:
        Dict with order_id, totals, coupon_codes, and status.
    """
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must include at least one item")

    db = get_raw_db()
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
        initial_status = ORDER_STATUS_CONFIRMED
        stored_status = initial_status

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


@router.get("/api/admin/orders/history")
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
    """Return paginated order history for admin, with optional CSV export.

    Args:
        start_date: Filter orders placed on or after this date (YYYY-MM-DD).
        end_date: Filter orders placed on or before this date (YYYY-MM-DD).
        status: Filter by order status string.
        customer: Filter by customer name or phone substring.
        product: Filter by product name substring.
        city_code: City to filter orders for.
        limit: Page size (max 200).
        offset: Pagination offset.
        export: When set to "csv", returns a CSV file download.
        user: Current admin user (injected).

    Returns:
        Dict with orders list and total count, or CSV response when export="csv".
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    _streaming = False
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

        if export == "csv":
            # Stream the CSV to avoid loading all rows into memory.
            # Close the count cursor and open a new one for the streaming query.
            cursor.close()
            stream_cursor = db.cursor(dictionary=True)
            stream_query = f"""
                SELECT
                    o.order_id,
                    o.created_at,
                    o.total_price,
                    o.status,
                    o.paid,
                    o.payment_method,
                    c.name AS customer_name,
                    c.primary_mobile,
                    COALESCE(i.name, co.combo_name) AS item_name,
                    COALESCE(oi.quantity, 0) AS quantity,
                    COALESCE(oi.price, 0.0) AS price,
                    COALESCE(oi.quantity, 0) * COALESCE(oi.price, 0.0) AS line_total
                FROM orders o
                JOIN customers c ON o.customer_id = c.customer_id
                LEFT JOIN addresses a ON o.address_id = a.address_id
                LEFT JOIN order_items oi ON o.order_id = oi.order_id
                LEFT JOIN items i ON oi.item_id = i.item_id
                LEFT JOIN combos co ON oi.combo_id = co.combo_id
                {where_fragment}
                ORDER BY o.created_at DESC, o.order_id DESC,
                         COALESCE(i.name, co.combo_name) ASC
            """

            def _generate_csv():
                """Yield CSV rows in chunks, then close the cursor and connection."""
                try:
                    stream_cursor.execute(stream_query, tuple(params))
                    buf = io.StringIO()
                    writer = csv.writer(buf)
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
                    yield buf.getvalue()
                    buf.seek(0)
                    buf.truncate()
                    while True:
                        rows = stream_cursor.fetchmany(200)
                        if not rows:
                            break
                        for row in rows:
                            paid_flag = bool(row.get("paid"))
                            writer.writerow(
                                [
                                    row["order_id"],
                                    (
                                        row["created_at"].strftime("%Y-%m-%d %H:%M:%S")
                                        if row.get("created_at")
                                        else ""
                                    ),
                                    row.get("customer_name") or "",
                                    row.get("primary_mobile") or "",
                                    normalize_status_for_response(row.get("status")),
                                    row.get("payment_method") or "",
                                    payment_status_label(paid_flag),
                                    row.get("item_name") or "",
                                    int(row.get("quantity") or 0),
                                    float(row.get("price") or 0),
                                    float(row.get("line_total") or 0),
                                    float(row.get("total_price") or 0),
                                ]
                            )
                            yield buf.getvalue()
                            buf.seek(0)
                            buf.truncate()
                finally:
                    stream_cursor.close()
                    db.close()

            # Signal the outer finally not to close db — the generator handles cleanup.
            _streaming = True
            return StreamingResponse(
                _generate_csv(),
                media_type="text/csv",
                headers={
                    "Content-Disposition": "attachment; filename=order-history.csv",
                },
            )

        data_query += " LIMIT %s OFFSET %s"
        data_params = list(params) + [limit, offset]
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

        result = []
        for record in orders:
            paid_flag = bool(record.get("paid"))
            normalized_status = normalize_status_for_response(record.get("status"))
            order_id = record["order_id"]
            result.append(
                {
                    "order_id": order_id,
                    "created_at": _format_datetime(record.get("created_at")),
                    "status": normalized_status,
                    "payment_status": payment_status_label(paid_flag),
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
        if not _streaming:
            cursor.close()
            db.close()


@router.post("/api/admin/orders/{order_id}/status")
def admin_update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Update the status of a specific order.

    Args:
        order_id: ID of the order to update.
        payload: New status string.
        user: Current admin user (injected).

    Returns:
        Dict with order_id and new status.
    """
    db = get_raw_db()
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
        new_status = normalize_order_status(payload.status)
        cursor.execute(
            "UPDATE orders SET status = %s WHERE order_id = %s",
            (new_status, order_id),
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


@router.post("/api/admin/orders/{order_id}/payment")
def admin_update_order_payment(
    order_id: int,
    payload: OrderPaymentUpdate,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Update the payment state of a specific order.

    Args:
        order_id: ID of the order to update.
        payload: New paid / unpaid state.
        user: Current admin user (injected).

    Returns:
        Dict with order_id, paid, and payment_status.
    """
    db = get_raw_db()
    cursor = db.cursor()
    try:
        target_city = _resolve_city_context(None, user)
        cursor.execute(
            """
            UPDATE orders o
            JOIN addresses a ON o.address_id = a.address_id
               SET o.paid = %s
             WHERE o.order_id = %s
               AND a.city_code = %s
            """,
            (int(payload.paid), order_id, target_city),
        )
        if cursor.rowcount == 0:
            db.rollback()
            raise HTTPException(status_code=404, detail="Order not found")
        db.commit()
        return {
            "order_id": order_id,
            "paid": bool(payload.paid),
            "payment_status": payment_status_label(payload.paid),
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update order payment: {err.msg}")
    finally:
        cursor.close()
        db.close()


@router.get("/api/admin/orders/{order_id}/invoice")
def admin_order_invoice(
    order_id: int,
    city_code: Optional[str] = Query(None, alias="city_code"),
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Return invoice data for a specific order.

    Args:
        order_id: ID of the order to invoice.
        city_code: City to scope the lookup.
        user: Current admin user (injected).

    Returns:
        Dict with invoice_number, order details, customer, address, and line items.
    """
    db = get_raw_db()
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

        return {
            "invoice_number": f"INV-{order_id:05d}",
            "issued_at": _format_datetime(datetime.now()),
            "due_date": None,
            "order": {
                "order_id": order_id,
                "created_at": _format_datetime(order_row.get("created_at")),
                "status": normalize_status_for_response(order_row.get("status")),
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
    finally:
        cursor.close()
        db.close()
