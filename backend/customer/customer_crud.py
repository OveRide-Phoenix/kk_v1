import mysql.connector
from fastapi import HTTPException
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

# Add CustomerUpdate model that's used in main.py
class CustomerUpdate(BaseModel):
    referred_by: Optional[str] = None
    primary_mobile: str
    alternative_mobile: Optional[str] = None
    name: str
    recipient_name: str
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
    route_assignment: Optional[str] = None
    is_default: bool = True


def create_customer(db, customer_data):
    try:
        cursor = db.cursor()
        
        # Check if mobile number already exists
        cursor.execute("SELECT customer_id FROM customers WHERE primary_mobile = %s", 
                      (customer_data.primary_mobile,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Mobile number already registered")

        # Insert customer
        customer_query = """
        INSERT INTO customers (referred_by, primary_mobile, alternative_mobile, name, recipient_name, 
                           payment_frequency, email, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        customer_values = (
            customer_data.referred_by,
            customer_data.primary_mobile,
            customer_data.alternative_mobile,
            customer_data.name,
            customer_data.recipient_name,
            customer_data.payment_frequency,
            customer_data.email,
            datetime.utcnow(),
        )

        cursor.execute(customer_query, customer_values)
        customer_id = cursor.lastrowid

        # Insert address
        address_query = """
        INSERT INTO addresses (customer_id, house_apartment_no, written_address, city, pin_code, 
                             latitude, longitude, address_type, route_assignment, is_default)
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
            customer_data.route_assignment,
            customer_data.is_default
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
            c.name, c.recipient_name, c.payment_frequency, c.email, c.created_at,
            a.address_id, a.house_apartment_no, a.written_address, a.city, 
            a.pin_code, a.latitude, a.longitude, a.address_type, a.route_assignment,
            CASE WHEN au.admin_id IS NOT NULL THEN 1 ELSE 0 END AS is_admin
        FROM customers c
        INNER JOIN addresses a ON c.customer_id = a.customer_id
        LEFT JOIN admin_users au ON au.customer_id = c.customer_id AND au.is_active = 1
        WHERE c.customer_id = %s AND a.is_default = 1
        """
        cursor.execute(query, (customer_id,))
        result = cursor.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Customer not found")
            
        return result
    finally:
        cursor.close()

def get_all_customers(db):
    try:
        cursor = db.cursor(dictionary=True)
        query = """
        SELECT 
            c.customer_id, c.referred_by, c.primary_mobile, c.alternative_mobile, 
            c.name, c.recipient_name, c.payment_frequency, c.email, c.created_at,
            a.address_id, a.house_apartment_no, a.written_address, a.city, 
            a.pin_code, a.latitude, a.longitude, a.address_type, a.route_assignment,
            COALESCE(o.completed_orders, 0) AS completed_orders,
            COALESCE(p.pending_orders, 0) AS pending_orders,
            CASE WHEN au.admin_id IS NOT NULL THEN 1 ELSE 0 END AS is_admin
        FROM customers c
        INNER JOIN addresses a ON c.customer_id = a.customer_id
        LEFT JOIN admin_users au ON au.customer_id = c.customer_id AND au.is_active = 1
        LEFT JOIN (
            SELECT customer_id, COUNT(*) AS completed_orders
            FROM orders
            WHERE status = 'Completed'
            GROUP BY customer_id
        ) o ON o.customer_id = c.customer_id
        LEFT JOIN (
            SELECT customer_id, COUNT(*) AS pending_orders
            FROM orders
            WHERE status = 'Pending'
            GROUP BY customer_id
        ) p ON p.customer_id = c.customer_id
        WHERE a.is_default = 1
        ORDER BY c.created_at ASC
        """
        cursor.execute(query)
        return cursor.fetchall()
    finally:
        cursor.close()

def update_customer(db, customer_id, customer_data):
    #THIS IS NOT WORKING, PLEASE FIX ME
    try:
        cursor = db.cursor()

        cursor.execute(
            "SELECT address_id FROM addresses WHERE customer_id=%s AND is_default=TRUE LIMIT 1",
            (customer_id,),
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Customer or default address not found")
        
        # Update customer information
        customer_query = """
        UPDATE customers 
        SET referred_by=%s, primary_mobile=%s, alternative_mobile=%s, name=%s, recipient_name=%s, 
            payment_frequency=%s, email=%s 
        WHERE customer_id=%s
        """
        customer_values = (
            customer_data.referred_by,
            customer_data.primary_mobile,
            customer_data.alternative_mobile,
            customer_data.name,
            customer_data.recipient_name,
            customer_data.payment_frequency,
            customer_data.email,
            customer_id,
        )
        
        cursor.execute(customer_query, customer_values)
        
        # Update address information
        address_query = """
        UPDATE addresses 
        SET house_apartment_no=%s, written_address=%s, city=%s, pin_code=%s,
            latitude=%s, longitude=%s, address_type=%s, route_assignment=%s
        WHERE customer_id=%s AND is_default=TRUE
        """
        address_values = (
            customer_data.house_apartment_no,
            customer_data.written_address,
            customer_data.city,
            customer_data.pin_code,
            customer_data.latitude,
            customer_data.longitude,
            customer_data.address_type,
            customer_data.route_assignment,
            customer_id,
        )
        
        cursor.execute(address_query, address_values)
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
        
        # First delete all addresses for this customer
        cursor.execute("DELETE FROM addresses WHERE customer_id = %s", (customer_id,))
        
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

def get_customer_count(db):
    try:
        cursor = db.cursor(dictionary=True)
        query = "SELECT COUNT(*) as total FROM customers"
        cursor.execute(query)
        result = cursor.fetchone()
        return result["total"]
    finally:
        cursor.close()
