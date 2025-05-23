import mysql.connector
from fastapi import FastAPI, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional
from fastapi.middleware.cors import CORSMiddleware
from .customer.customer_crud import (
    create_customer,
    get_customer_by_id,
    get_all_customers,
    update_customer,
    delete_customer,
    CustomerUpdate
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this to specific domains if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection function
def get_db():
    return mysql.connector.connect(
        host="localhost",
        user="fastapi_user",
        password="password",
        database="kk_v1"
    )

# Get city by phone number
@app.get("/api/get-city")
def get_city(phone: str):
    db = get_db()
    cursor = db.cursor(dictionary=True, buffered=True)

    try:
        query = """
        SELECT 
            a.city, 
            CASE 
                WHEN u.customer_id IS NOT NULL THEN 1 
                ELSE 0 
            END AS is_admin 
        FROM customers c
        INNER JOIN addresses a ON c.customer_id = a.customer_id
        LEFT JOIN admin_users u ON c.customer_id = u.customer_id
        WHERE c.primary_mobile = %s;
        """

        cursor.execute(query, (phone,))
        result = cursor.fetchone()

        print("Raw DB Result:", result)  # Debugging Output

        if not result:
            raise HTTPException(status_code=404, detail="User does not exist. Please register.")

        # ✅ Ensure conversion to int before bool conversion
        is_admin = int(result["is_admin"]) if result["is_admin"] is not None else 0

        print("Final Processed Result:", {"city": result["city"], "is_admin": bool(is_admin)})

        return {
            "city": result["city"],
            "is_admin": bool(is_admin)  # Ensure True/False conversion
        }

    finally:
        cursor.close()
        db.close()


# Get all available cities
@app.get("/api/get-cities")
def get_available_cities():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT DISTINCT city FROM addresses")
    result = cursor.fetchall()
    db.close()
    return {"cities": [row["city"] for row in result]}

# Pydantic model for user registration
class CustomerCreate(BaseModel):
    referred_by: Optional[str] = None
    primary_mobile: str
    alternative_mobile: Optional[str] = None
    name: str
    recipient_name: str
    payment_frequency: Optional[str] = "Daily"
    email: Optional[str] = None
    house_apartment_no: Optional[str] = None
    written_address: str
    city: str
    pin_code: str
    latitude: float
    longitude: float
    address_type: Optional[str] = None
    route_assignment: Optional[str] = None
    is_default: bool = False

# Register a user (customer + address)
@app.post("/api/register")
def register_user(user: CustomerCreate):
    db = get_db()
    cursor = db.cursor()

    try:
        # Insert into customers
        cursor.execute("""
            INSERT INTO customers (referred_by, primary_mobile, alternative_mobile, name, recipient_name, payment_frequency, email)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (user.referred_by, user.primary_mobile, user.alternative_mobile, user.name, user.recipient_name, user.payment_frequency, user.email))

        customer_id = cursor.lastrowid

        # Insert into addresses
        cursor.execute("""
            INSERT INTO addresses (customer_id, house_apartment_no, written_address, city, pin_code, latitude, longitude, address_type, route_assignment, is_default)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (customer_id, user.house_apartment_no, user.written_address, user.city, user.pin_code, user.latitude, user.longitude, user.address_type, user.route_assignment, user.is_default))

        db.commit()
        return {"success": True}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(err))
    finally:
        db.close()
class CustomerCreate(BaseModel):
    referred_by: Optional[str] = None
    primary_mobile: str
    alternative_mobile: Optional[str] = None
    name: str
    recipient_name: str
    payment_frequency: Optional[str] = "Daily"
    email: Optional[str] = None

    house_apartment_no: Optional[str] = None
    written_address: str
    city: str
    pin_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address_type: Optional[str] = None
    route_assignment: Optional[str] = None
    is_default: bool = False

# Register a new customer and store their address
@app.post("/api/register")
def register_customer(data: CustomerCreate):
    db = get_db()
    cursor = db.cursor()

    try:
        # Check if the mobile number already exists
        cursor.execute("SELECT id FROM customers WHERE primary_mobile = %s", (data.primary_mobile,))
        existing_customer = cursor.fetchone()
        
        if existing_customer:
            raise HTTPException(status_code=400, detail="Mobile number already exists! Please login instead.")

        # Insert customer details
        cursor.execute("""
            INSERT INTO customers (referred_by, primary_mobile, alternative_mobile, name, recipient_name, payment_frequency, email)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (data.referred_by, data.primary_mobile, data.alternative_mobile, data.name, data.recipient_name, data.payment_frequency, data.email))
        
        customer_id = cursor.lastrowid  # Get inserted customer ID

        # Insert address details with address_type from dropdown and is_default set to True
        cursor.execute("""
            INSERT INTO addresses (customer_id, house_apartment_no, written_address, city, pin_code, latitude, longitude, address_type, route_assignment, is_default)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (customer_id, data.house_apartment_no, data.written_address, data.city, data.pin_code, data.latitude, data.longitude, data.address_type, data.route_assignment, True))

        db.commit()
        return {"success": True, "customer_id": customer_id}
    
    except mysql.connector.IntegrityError as err:
        db.rollback()
        if err.errno == 1062:
            raise HTTPException(status_code=400, detail="Duplicate entry: Mobile number already registered")
        raise HTTPException(status_code=400, detail=str(err))
    
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    
    finally:
        db.close()

class LoginRequest(BaseModel):
    phone: str
    admin_password: Optional[str]

#Login
@app.post("/api/login")
def login(data: LoginRequest):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    query = """
    SELECT c.customer_id, a.city, u.admin_password
    FROM customers c
    JOIN addresses a ON c.customer_id = a.customer_id
    LEFT JOIN admin_users u ON c.customer_id = u.customer_id
    WHERE c.primary_mobile = %s;
    """
    cursor.execute(query, (data.phone,))
    result = cursor.fetchone()

    # Debugging output
    print("Query result:", result)  # Check full result
    if result:
        print("Result keys:", result.keys())  # See what keys are present
        print("Stored password in DB:", result.get("admin_password"))  # Check admin password

    if not result:
        cursor.close()
        db.close()
        raise HTTPException(status_code=404, detail="User not found")

    is_admin = bool(result["admin_password"])

    if is_admin:
        if not data.admin_password:
            cursor.close()
            db.close()
            raise HTTPException(status_code=400, detail="Admin password is required")

        if data.admin_password != result["admin_password"]:
            cursor.close()
            db.close()
            raise HTTPException(status_code=401, detail="Invalid admin password")

    cursor.close()
    db.close()

    # Return the is_admin flag in the response
    return {"message": "Login successful", "is_admin": is_admin}


@app.post("/create-customer", response_model=dict)
def add_customer(customer: CustomerCreate, db=Depends(get_db)):
    return create_customer(db, customer)

@app.get("/get-customer/{customer_id}", response_model=dict)
def fetch_customer(customer_id: int, db=Depends(get_db)):
    return get_customer_by_id(db, customer_id)

@app.get("/get-all-customers", response_model=list)
def fetch_all_customers(db=Depends(get_db)):
    return get_all_customers(db)

@app.put("/update-customer/{customer_id}", response_model=dict)
def modify_customer(customer_id: int, customer: CustomerUpdate, db=Depends(get_db)):
    return update_customer(db, customer_id, customer)

@app.delete("/delete-customer/{customer_id}", response_model=dict)
def remove_customer(customer_id: int, db=Depends(get_db)):
    return delete_customer(db, customer_id)

# ---------------- Product Management ----------------
@app.get("/api/products/items", tags=["Products"])
def get_all_items():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                i.item_id, i.name, i.description, i.alias, i.category_id, c.category_name,
                i.uom, i.weight_factor, i.weight_uom, i.item_type, i.hsn_code, i.factor,
                i.quantity_portion, i.buffer_percentage, i.picture_url,
                i.breakfast_price, i.lunch_price, i.dinner_price, i.condiments_price, i.festival_price,
                i.cgst, i.sgst, i.igst, i.net_price
            FROM items i
            LEFT JOIN categories c ON i.category_id = c.category_id
        """)
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

@app.get("/api/products/combos", tags=["Products"])
def get_all_combos():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        # Step 1: Get all combos and their category
        cursor.execute("""
            SELECT 
                c.combo_id,
                c.combo_name,
                c.price,
                c.category_id,
                cat.category_name
            FROM combos c
            LEFT JOIN categories cat ON c.category_id = cat.category_id
        """)
        combos = cursor.fetchall()

        # Step 2: Get all items in each combo
        cursor.execute("""
            SELECT 
                ci.combo_id,
                ci.item_id,
                ci.quantity,
                i.name AS item_name
            FROM combo_items ci
            LEFT JOIN items i ON ci.item_id = i.item_id
        """)
        combo_items = cursor.fetchall()

        # Step 3: Map combo_id → list of items
        combo_item_map = {}
        for item in combo_items:
            combo_id = item["combo_id"]
            if combo_id not in combo_item_map:
                combo_item_map[combo_id] = []
            combo_item_map[combo_id].append({
                "itemId": item["item_id"],
                "name": item["item_name"],
                "quantity": item["quantity"]
            })

        # Step 4: Attach includedItems to each combo
        for combo in combos:
            combo_id = combo["combo_id"]
            combo["includedItems"] = combo_item_map.get(combo_id, [])

        return combos

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

@app.get("/api/products/addons", tags=["Products"])
def get_all_addons():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                ia.add_on_id,
                main_item.name AS main_item_name,
                add_on_item.name AS add_on_item_name,
                ia.is_mandatory,
                ia.max_quantity
            FROM item_add_ons ia
            LEFT JOIN items main_item ON ia.main_item_id = main_item.item_id
            LEFT JOIN items add_on_item ON ia.add_on_item_id = add_on_item.item_id
        """)
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

@app.get("/api/products/categories", tags=["Products"])
def get_all_categories():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT category_id, category_name FROM categories")
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()
