"""Customers router: addresses, customer CRUD proxies, and order history."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import mysql.connector
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ..city_config import DEFAULT_CITY
from ..customer.customer_crud import (
    CustomerUpdate,
    create_customer,
    delete_customer,
    get_all_customers,
    get_customer_by_id,
    update_customer,
)
from ..db import get_raw_db
from ..utils.auth_deps import admin_required, get_current_user
from ..utils.helpers import (
    _format_datetime,
    _normalize_city_label,
    _resolve_city_code,
    _resolve_city_context,
    normalize_status_for_response,
    payment_status_label,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class AddressPayload(BaseModel):
    """Payload for creating or updating a customer address."""

    address_type: Optional[str] = None
    house_apartment_no: Optional[str] = None
    written_address: str
    city: str
    city_code: Optional[str] = None
    pin_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    route_id: Optional[int] = None
    is_default: bool = False


class AddressRouteAssignPayload(BaseModel):
    """Payload for assigning or clearing a delivery route on an address."""

    route_id: Optional[int] = None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _get_db():
    """Yield a pooled mysql.connector connection and return it on teardown.

    Used as a FastAPI ``Depends`` target so FastAPI automatically closes
    (i.e. returns to the pool) the connection after each request.

    Yields:
        A ``mysql.connector.pooling.PooledMySQLConnection`` instance.
    """
    db = get_raw_db()
    try:
        yield db
    finally:
        db.close()


def _resolve_coordinates(
    cursor, customer_id: int, latitude: Optional[float], longitude: Optional[float]
) -> Tuple[float, float]:
    """Resolve lat/lng from payload or fall back to the customer's default address.

    Args:
        cursor: Database cursor.
        customer_id: Customer to look up fallback coordinates for.
        latitude: Payload latitude (may be None).
        longitude: Payload longitude (may be None).

    Returns:
        Tuple of (latitude, longitude) as floats.
    """
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


# ---------------------------------------------------------------------------
# Customer CRUD proxy endpoints (SQLAlchemy-backed via customer_crud)
# ---------------------------------------------------------------------------


@router.post("/create-customer", response_model=dict)
def add_customer(customer, db=Depends(_get_db)):
    """Create a new customer record.

    Args:
        customer: CustomerCreate payload.
        db: Database connection (injected).

    Returns:
        Created customer dict.
    """
    return create_customer(db, customer)


@router.get("/get-customer/{customer_id}", response_model=dict)
def fetch_customer(customer_id: int, db=Depends(_get_db)):
    """Fetch a single customer by ID.

    Args:
        customer_id: Customer ID to look up.
        db: Database connection (injected).

    Returns:
        Customer dict.
    """
    return get_customer_by_id(db, customer_id)


@router.get("/get-all-customers", response_model=dict)
def fetch_all_customers(
    city_code: Optional[str] = Query(None, description="Optional city filter"),
    search: Optional[str] = Query(None, description="Search by name, phone, or email"),
    limit: int = Query(100, ge=1, le=500, description="Page size"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db=Depends(_get_db),
):
    """Return paginated customers, optionally filtered by city and search term.

    Args:
        city_code: Optional city code filter.
        search: Optional substring search on name, phone, or email.
        limit: Page size (max 500).
        offset: Pagination offset.
        db: Database connection (injected).

    Returns:
        Dict with ``customers`` list and ``total`` count.
    """
    return get_all_customers(db, city_code, search=search, limit=limit, offset=offset)


@router.get("/api/admin/customers", tags=["Admin"])
def fetch_admin_customers(
    city_code: Optional[str] = Query(None, description="Override city scope"),
    search: Optional[str] = Query(None, description="Search by name, phone, or email"),
    limit: int = Query(100, ge=1, le=500, description="Page size"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    user: Dict[str, Any] = Depends(admin_required),
    db=Depends(_get_db),
):
    """Return paginated customers scoped to the admin's active city.

    Args:
        city_code: Optional city_code override.
        search: Optional substring search on name, phone, or email.
        limit: Page size (max 500).
        offset: Pagination offset.
        user: Current admin user (injected).
        db: Database connection (injected).

    Returns:
        Dict with ``customers`` list and ``total`` count.
    """
    resolved_city = _resolve_city_context(city_code, user)
    return get_all_customers(db, resolved_city, search=search, limit=limit, offset=offset)


@router.put("/update-customer/{customer_id}", response_model=dict)
def modify_customer(customer_id: int, customer: CustomerUpdate, db=Depends(_get_db)):
    """Update customer fields.

    Args:
        customer_id: Customer to update.
        customer: CustomerUpdate payload.
        db: Database connection (injected).

    Returns:
        Updated customer dict.
    """
    return update_customer(db, customer_id, customer)


@router.delete("/delete-customer/{customer_id}", response_model=dict)
def remove_customer(customer_id: int, db=Depends(_get_db)):
    """Delete a customer by ID.

    Args:
        customer_id: Customer to delete.
        db: Database connection (injected).

    Returns:
        Deletion result dict.
    """
    return delete_customer(db, customer_id)


# ---------------------------------------------------------------------------
# Address endpoints
# ---------------------------------------------------------------------------


@router.get("/api/customers/{customer_id}/addresses", tags=["Customers"])
def get_customer_addresses(customer_id: int):
    """Return all addresses for a customer, including route info.

    Args:
        customer_id: Customer to look up.

    Returns:
        List of address dicts.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT
                a.address_id,
                a.address_type,
                a.house_apartment_no,
                a.written_address,
                a.city,
                a.city_code,
                a.pin_code,
                a.is_default,
                a.latitude,
                a.longitude,
                a.route_id,
                dr.route_code,
                dr.route_name
            FROM addresses a
            LEFT JOIN delivery_routes dr ON dr.route_id = a.route_id
            WHERE a.customer_id = %s
            ORDER BY a.is_default DESC, a.address_id ASC
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
                "route_id": row.get("route_id"),
                "route_code": row.get("route_code"),
                "route_name": row.get("route_name"),
            }
            for row in rows
        ]
    finally:
        cursor.close()
        db.close()


@router.post("/api/customers/{customer_id}/addresses", tags=["Customers"])
def create_customer_address(customer_id: int, payload: AddressPayload):
    """Create a new address for a customer.

    Args:
        customer_id: Customer to add the address for.
        payload: Address fields.

    Returns:
        Dict with address_id and success message.
    """
    db = get_raw_db()
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
                route_id,
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
                payload.route_id,
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


@router.put("/api/customers/{customer_id}/addresses/{address_id}", tags=["Customers"])
def update_customer_address(customer_id: int, address_id: int, payload: AddressPayload):
    """Update an existing address for a customer.

    Args:
        customer_id: Customer who owns the address.
        address_id: Address to update.
        payload: New address fields.

    Returns:
        Dict with success message.
    """
    db = get_raw_db()
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
                   route_id=%s,
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
                payload.route_id,
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


@router.patch("/api/customers/{customer_id}/addresses/{address_id}/route", tags=["Customers"])
def assign_address_route(
    customer_id: int,
    address_id: int,
    payload: AddressRouteAssignPayload,
    user: Dict[str, Any] = Depends(admin_required),
):
    """Assign or clear the delivery route for a specific customer address.

    Args:
        customer_id: ID of the customer who owns the address.
        address_id: ID of the address to update.
        payload: Contains route_id (or null to clear).
        user: Current admin user (injected).

    Returns:
        Dict with success message.
    """
    db = get_raw_db()
    cursor = db.cursor()
    try:
        cursor.execute(
            "SELECT address_id FROM addresses WHERE address_id=%s AND customer_id=%s LIMIT 1",
            (address_id, customer_id),
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Address not found")
        cursor.execute(
            "UPDATE addresses SET route_id=%s WHERE address_id=%s AND customer_id=%s",
            (payload.route_id, address_id, customer_id),
        )
        db.commit()
        return {"message": "Route assigned successfully"}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        cursor.close()
        db.close()


@router.post("/api/customers/{customer_id}/addresses/{address_id}/default", tags=["Customers"])
def set_default_customer_address(customer_id: int, address_id: int):
    """Mark an address as the default for a customer.

    Args:
        customer_id: Customer ID.
        address_id: Address to set as default.

    Returns:
        Dict with success message.
    """
    db = get_raw_db()
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


# ---------------------------------------------------------------------------
# Customer order history
# ---------------------------------------------------------------------------


@router.get("/api/customers/{customer_id}/orders", tags=["Customers"])
def list_customer_orders(customer_id: int, limit: int = Query(50, ge=1, le=200)):
    """Return a customer's order history with items.

    Args:
        customer_id: Customer to look up.
        limit: Maximum number of orders to return.

    Returns:
        List of order dicts with items.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        from mysql.connector import errorcode

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
                    "status": normalize_status_for_response(order.get("status")),
                    "payment_status": payment_status_label(paid_flag),
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
