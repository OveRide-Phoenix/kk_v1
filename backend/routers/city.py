"""City lookup router: get city by phone, get all cities."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from ..city_config import DEFAULT_CITY
from ..db import get_raw_db
from ..utils.rbac import parse_role_ids
from .rbac import build_role_context

router = APIRouter()

ADMIN_ROLE_CODE = "admin"


@router.get("/api/get-city")
def get_city(phone: str):
    """Return the city and role information for a customer identified by phone number.

    Args:
        phone: Customer's primary mobile number.

    Returns:
        Dict with city, city_code, eligible_city_codes, is_admin, roles, role_codes, role_details.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True, buffered=True)
    try:
        query = """
        SELECT
            c.customer_id,
            a.city,
            a.city_code,
            c.roles
        FROM customers c
        INNER JOIN addresses a ON c.customer_id = a.customer_id
        WHERE c.primary_mobile = %s
          AND a.is_default = 1
        LIMIT 1;
        """
        cursor.execute(query, (phone,))
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="User does not exist. Please register.")

        roles = parse_role_ids(result.get("roles"))
        _, role_codes, role_details = build_role_context(db, roles)
        is_admin = ADMIN_ROLE_CODE in role_codes
        cursor.execute(
            "SELECT DISTINCT city_code FROM addresses WHERE customer_id=%s",
            (result["customer_id"],),
        )
        eligible_rows = cursor.fetchall() or []
        return {
            "city": result["city"],
            "city_code": result.get("city_code") or DEFAULT_CITY,
            "eligible_city_codes": [row.get("city_code") or DEFAULT_CITY for row in eligible_rows],
            "is_admin": bool(is_admin),
            "roles": roles,
            "role_codes": role_codes,
            "role_details": role_details,
        }
    finally:
        cursor.close()
        db.close()


@router.get("/api/get-cities")
def get_available_cities():
    """Return all distinct city names present in the addresses table.

    Returns:
        Dict with list of city name strings.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT DISTINCT city FROM addresses")
    result = cursor.fetchall()
    db.close()
    return {"cities": [row["city"] for row in result]}
