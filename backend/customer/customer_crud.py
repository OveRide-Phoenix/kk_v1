import mysql.connector
from fastapi import HTTPException
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel

from ..utils.rbac import get_role_id, parse_role_ids


# Add CustomerUpdate model that's used in main.py
class CustomerUpdate(BaseModel):
    referred_by: Optional[str] = None
    primary_mobile: str
    alternative_mobile: Optional[str] = None
    name: str
    recipient_name: str
    date_of_birth: Optional[date] = None
    payment_frequency: Optional[str] = "Daily"
    email: Optional[str] = None
    # Address fields
    house_apartment_no: Optional[str] = None
    written_address: str
    city: str
    pin_code: str
    latitude: float
    longitude: float
    address_type: Optional[str] = None
    route_id: Optional[int] = None
    is_default: bool = True


def create_customer(db, customer_data):
    try:
        cursor = db.cursor()

        # Check if mobile number already exists
        cursor.execute(
            "SELECT customer_id FROM customers WHERE primary_mobile = %s",
            (customer_data.primary_mobile,),
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Mobile number already registered")

        # Insert customer
        customer_query = """
        INSERT INTO customers (referred_by, primary_mobile, alternative_mobile, name, recipient_name,
                           date_of_birth, payment_frequency, email, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        customer_values = (
            customer_data.referred_by,
            customer_data.primary_mobile,
            customer_data.alternative_mobile,
            customer_data.name,
            customer_data.recipient_name,
            customer_data.date_of_birth,
            customer_data.payment_frequency,
            customer_data.email,
            datetime.utcnow(),
        )

        cursor.execute(customer_query, customer_values)
        customer_id = cursor.lastrowid

        # Insert address
        address_query = """
        INSERT INTO addresses (customer_id, house_apartment_no, written_address, city, pin_code,
                             latitude, longitude, address_type, route_id, is_default)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        address_values = (
            customer_id,
            customer_data.house_apartment_no,
            customer_data.written_address,
            customer_data.city,
            customer_data.pin_code,
            customer_data.latitude,
            customer_data.longitude,
            customer_data.address_type,
            customer_data.route_id,
            customer_data.is_default,
        )

        cursor.execute(address_query, address_values)
        db.commit()

        return {"customer_id": customer_id, "message": "Customer and address created successfully"}

    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        cursor.close()


def get_customer_by_id(db, customer_id):
    try:
        cursor = db.cursor(dictionary=True)
        query = """
        SELECT 
            c.customer_id, c.referred_by, c.primary_mobile, c.alternative_mobile, 
            c.name, c.recipient_name, c.date_of_birth, c.payment_frequency, c.email, c.created_at,
            c.roles, c.admin_is_active,
            a.address_id, a.house_apartment_no, a.written_address, a.city, 
            a.pin_code, a.latitude, a.longitude, a.address_type, a.route_id,
            dr.route_name, dr.route_code
        FROM customers c
        INNER JOIN addresses a ON c.customer_id = a.customer_id
        LEFT JOIN delivery_routes dr ON dr.route_id = a.route_id
        WHERE c.customer_id = %s AND a.is_default = 1 AND a.is_active = 1
        """
        cursor.execute(query, (customer_id,))
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Customer not found")
        roles = parse_role_ids(result.get("roles"))
        result["roles"] = roles

        admin_role_id = get_role_id(cursor, "admin")
        result["is_admin"] = 1 if admin_role_id and admin_role_id in roles else 0
        result["admin_is_active"] = bool(result.get("admin_is_active", True))

        return result
    finally:
        cursor.close()


def get_all_customers(
    db,
    city_code: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    """Return a paginated list of customers with optional city and search filters.

    Args:
        db: Database connection.
        city_code: Optional city filter; when set, only customers with an address in that city
            are returned.
        search: Optional substring filter applied to customer name, phone, or email.
        limit: Maximum number of rows to return (capped at 500).
        offset: Pagination offset.

    Returns:
        Dict with ``customers`` list and ``total`` count.
    """
    limit = min(limit, 500)
    try:
        cursor = db.cursor(dictionary=True)
        params: list = []
        search_clause = ""
        search_params: list = []
        if search:
            term = f"%{search}%"
            search_clause = (
                " AND (c.name LIKE %s OR c.primary_mobile LIKE %s"
                " OR c.email LIKE %s OR a.written_address LIKE %s)"
            )
            search_params = [term, term, term, term]

        if city_code:
            base_from = """
            FROM customers c
            INNER JOIN (
                SELECT *
                FROM (
                    SELECT addr.*,
                           ROW_NUMBER() OVER (
                               PARTITION BY addr.customer_id
                               ORDER BY addr.is_default DESC, addr.address_id DESC
                           ) AS rn
                      FROM addresses addr
                     WHERE addr.city_code = %s AND addr.is_active = 1
                ) ranked_addr
               WHERE ranked_addr.rn = 1
            ) a ON c.customer_id = a.customer_id
            LEFT JOIN delivery_routes dr ON dr.route_id = a.route_id
            LEFT JOIN (
                SELECT o.customer_id, COUNT(*) AS completed_orders
                 FROM orders o
                  JOIN addresses ao ON ao.address_id = o.address_id
                 WHERE LOWER(COALESCE(o.status, '')) = 'delivered'
                   AND ao.city_code = %s
                 GROUP BY o.customer_id
            ) o ON o.customer_id = c.customer_id
            LEFT JOIN (
                SELECT o.customer_id, COUNT(*) AS pending_orders
                 FROM orders o
                  JOIN addresses ao ON ao.address_id = o.address_id
                 WHERE LOWER(COALESCE(o.status, '')) IN ('confirmed', 'dispatched')
                   AND ao.city_code = %s
                 GROUP BY o.customer_id
            ) p ON p.customer_id = c.customer_id
            WHERE 1=1
            """
            base_params = [city_code, city_code, city_code]
        else:
            base_from = """
            FROM customers c
            INNER JOIN addresses a ON c.customer_id = a.customer_id
            LEFT JOIN delivery_routes dr ON dr.route_id = a.route_id
            LEFT JOIN (
                SELECT customer_id, COUNT(*) AS completed_orders
                FROM orders
                WHERE status = 'Delivered'
                GROUP BY customer_id
            ) o ON o.customer_id = c.customer_id
            LEFT JOIN (
                SELECT customer_id, COUNT(*) AS pending_orders
                FROM orders
                WHERE status IN ('Confirmed', 'Dispatched')
                GROUP BY customer_id
            ) p ON p.customer_id = c.customer_id
            WHERE a.is_default = 1 AND a.is_active = 1
            """
            base_params = []

        count_query = f"SELECT COUNT(DISTINCT c.customer_id) AS total {base_from}{search_clause}"
        cursor.execute(count_query, tuple(base_params + search_params))
        total = int((cursor.fetchone() or {}).get("total") or 0)

        data_query = f"""
            SELECT
                c.customer_id, c.referred_by, c.primary_mobile, c.alternative_mobile,
                c.name, c.recipient_name, c.date_of_birth, c.payment_frequency, c.email, c.created_at,
                c.roles, c.admin_is_active,
                a.address_id, a.house_apartment_no, a.written_address, a.city,
                a.pin_code, a.latitude, a.longitude, a.address_type, a.route_id,
                dr.route_name, dr.route_code,
                COALESCE(o.completed_orders, 0) AS completed_orders,
                COALESCE(p.pending_orders, 0) AS pending_orders
            {base_from}{search_clause}
            ORDER BY c.created_at ASC
            LIMIT %s OFFSET %s
        """
        cursor.execute(data_query, tuple(base_params + search_params + [limit, offset]))
        rows = cursor.fetchall()

        admin_role_id = get_role_id(cursor, "admin")
        for row in rows:
            roles = parse_role_ids(row.get("roles"))
            row["roles"] = roles
            row["is_admin"] = 1 if admin_role_id and admin_role_id in roles else 0
            row["admin_is_active"] = bool(row.get("admin_is_active", True))
        return {"customers": rows, "total": total}
    finally:
        cursor.close()


def update_customer(db, customer_id, customer_data):
    try:
        cursor = db.cursor()

        # Update customer information
        customer_query = """
        UPDATE customers
        SET referred_by=%s, primary_mobile=%s, alternative_mobile=%s, name=%s, recipient_name=%s,
            date_of_birth=%s, payment_frequency=%s, email=%s
        WHERE customer_id=%s
        """
        customer_values = (
            customer_data.referred_by,
            customer_data.primary_mobile,
            customer_data.alternative_mobile,
            customer_data.name,
            customer_data.recipient_name,
            customer_data.date_of_birth,
            customer_data.payment_frequency,
            customer_data.email,
            customer_id,
        )
        cursor.execute(customer_query, customer_values)

        # Check whether the incoming address actually differs from the current active default.
        cursor.execute(
            """
            SELECT address_id, house_apartment_no, written_address, city, pin_code,
                   latitude, longitude, address_type, route_id
            FROM addresses
            WHERE customer_id=%s AND is_default=TRUE AND is_active=TRUE
            LIMIT 1
            """,
            (customer_id,),
        )
        current = cursor.fetchone()

        new_vals = (
            customer_data.house_apartment_no,
            customer_data.written_address,
            customer_data.city,
            customer_data.pin_code,
            float(customer_data.latitude),
            float(customer_data.longitude),
            customer_data.address_type,
            customer_data.route_id,
        )

        if current is not None:
            cur_vals = (
                current[1],  # house_apartment_no
                current[2],  # written_address
                current[3],  # city
                current[4],  # pin_code
                float(current[5]),  # latitude
                float(current[6]),  # longitude
                current[7],  # address_type
                current[8],  # route_id
            )
            address_changed = cur_vals != new_vals
        else:
            address_changed = True

        if address_changed:
            # Soft-deprecate all existing active addresses for this customer
            cursor.execute(
                "UPDATE addresses SET is_active=FALSE, is_default=FALSE WHERE customer_id=%s AND is_active=TRUE",
                (customer_id,),
            )
            # Insert the new address as the active default
            cursor.execute(
                """
                INSERT INTO addresses (customer_id, house_apartment_no, written_address, city, pin_code,
                                       latitude, longitude, address_type, route_id, is_default, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, TRUE)
                """,
                (customer_id,) + new_vals,
            )

        db.commit()
        return {"message": "Customer and address updated successfully"}

    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        cursor.close()


def delete_customer(db, customer_id):
    try:
        cursor = db.cursor()

        # Soft-delete all active addresses so order history is preserved
        cursor.execute(
            "UPDATE addresses SET is_active=FALSE, is_default=FALSE WHERE customer_id=%s AND is_active=TRUE",
            (customer_id,),
        )

        # Then delete the customer
        cursor.execute("DELETE FROM customers WHERE customer_id = %s", (customer_id,))

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Customer not found")

        db.commit()
        return {"message": "Customer and associated addresses deleted successfully"}

    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    finally:
        cursor.close()


def get_customer_count(db, city_code: Optional[str] = None):
    try:
        cursor = db.cursor(dictionary=True)
        if city_code:
            query = """
                SELECT COUNT(DISTINCT c.customer_id) AS total
                  FROM customers c
                  JOIN addresses a ON a.customer_id = c.customer_id
                 WHERE a.city_code = %s
            """
            cursor.execute(query, (city_code,))
        else:
            cursor.execute("SELECT COUNT(*) AS total FROM customers")
        result = cursor.fetchone()
        return result["total"]
    finally:
        cursor.close()
