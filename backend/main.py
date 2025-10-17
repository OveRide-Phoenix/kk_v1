from calendar import month
import mysql.connector
from fastapi import FastAPI, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from decimal import Decimal
from typing import List, Dict, Optional
from fastapi.middleware.cors import CORSMiddleware
from .customer.customer_crud import (
    create_customer,
    get_customer_by_id,
    get_all_customers,
    update_customer,
    delete_customer,
    CustomerUpdate,
    get_customer_count  # Add this line
)
import os, time, uuid, jwt, bcrypt
from fastapi import Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:8000",  # swagger same-origin
    ],
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

from .config import (
    SECRET_KEY, ALGORITHM,
    ACCESS_TOKEN_TTL_SEC, REFRESH_TOKEN_TTL_SEC,
    COOKIE_SECURE, COOKIE_SAMESITE, COOKIE_DOMAIN
)

def _create_jwt(payload: dict, ttl: int) -> str:
    now = int(time.time())
    body = dict(payload)
    body["iat"] = now
    body["exp"] = now + ttl
    return jwt.encode(body, SECRET_KEY, algorithm=ALGORITHM)

def create_access_token(sub: dict) -> str:
    return _create_jwt({"sub": sub, "type": "access"}, ACCESS_TOKEN_TTL_SEC)

def create_refresh_token(sub: dict, jti: str) -> str:
    return _create_jwt({"sub": sub, "type": "refresh", "jti": jti}, REFRESH_TOKEN_TTL_SEC)

def decode_token(token: str) -> dict:
    # Disable "sub must be string" validation
    return jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM],
        options={"verify_sub": False},
    )


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

def set_cookie(resp: Response, name: str, value: str, max_age: int):
    resp.set_cookie(
        key=name,
        value=value,
        max_age=max_age,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        path="/",
    )

def clear_cookie(resp: Response, name: str):
    resp.delete_cookie(key=name, domain=COOKIE_DOMAIN, path="/")

bearer = HTTPBearer(auto_error=False)

def _read_access_token(req: Request, creds: HTTPAuthorizationCredentials | None):
    if creds and creds.scheme.lower() == "bearer":
        return creds.credentials
    return req.cookies.get("access_token")

def get_current_user(request: Request, creds: HTTPAuthorizationCredentials | None = Depends(bearer)):
    token = _read_access_token(request, creds)

    if not token:

        raise HTTPException(status_code=401, detail="Not authenticated")
    try:

        payload = decode_token(token)

        if payload.get("type") != "access":
            raise ValueError("wrong token type")

        return payload["sub"]
    except Exception:

        raise HTTPException(status_code=401, detail="Invalid or expired token")

def admin_required(user = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user

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


#Login
class LoginRequest(BaseModel):
    phone: str
    admin_password: Optional[str]

# --- LOGIN: return tokens in JSON for localStorage ---
@app.post("/api/login")
def login(data: LoginRequest, response: Response):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                c.customer_id,
                c.name AS customer_name,
                c.primary_mobile AS phone_number,
                au.admin_id,
                au.password_hash,
                au.role,
                au.is_active
            FROM customers c
            LEFT JOIN admin_users au ON au.customer_id = c.customer_id
            WHERE c.primary_mobile = %s
            LIMIT 1
        """, (data.phone,))
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="User not found. Please register.")

        is_admin = bool(result["admin_id"])

        # If admin, validate password and build tokens
        access = None
        refresh = None
        user_payload = None

        if is_admin:
            if not data.admin_password:
                raise HTTPException(status_code=400, detail="Admin password is required")
            if not result["is_active"]:
                raise HTTPException(status_code=403, detail="Admin account disabled")
            if not verify_password(data.admin_password, result["password_hash"]):
                raise HTTPException(status_code=401, detail="Invalid admin password")

            user_payload = {
                "admin_id": result["admin_id"],
                "customer_id": result["customer_id"],
                "phone": result["phone_number"],
                "role": result["role"],
                "name": result.get("customer_name"),
            }
            access  = create_access_token(user_payload)
            refresh = create_refresh_token(user_payload, str(uuid.uuid4()))

        # IMPORTANT: do NOT set cookies — tokens are returned in JSON
        # set_cookie(response, "access_token",  access,  60 * 15)
        # set_cookie(response, "refresh_token", refresh, 60 * 60 * 24 * 7)

        return {
            "message": "Login successful",
            "is_admin": is_admin,
            "user": user_payload,           # null if not admin
            "access_token": access,         # null if not admin
            "refresh_token": refresh        # null if not admin
        }
    finally:
        cursor.close()
        db.close()


@app.post("/auth/refresh")
def refresh(request: Request, response: Response, creds: HTTPAuthorizationCredentials | None = Depends(bearer)):
    # Try Authorization: Bearer <refresh_token> first
    token = None
    if creds and creds.scheme.lower() == "bearer":
        token = creds.credentials

    # Fallback: JSON body with {"refresh_token": "..."}
    if not token:
        try:
            body = request.json() if hasattr(request, "json") else None
        except Exception:
            body = None
        if body and isinstance(body, dict):
            token = body.get("refresh_token")

    # Fallback: legacy cookie (if you still keep it set somewhere)
    if not token:
        token = request.cookies.get("refresh_token")

    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")

    try:
        payload = decode_token(token)  # your helper already configured
        if payload.get("type") != "refresh":
            raise ValueError("wrong token type")
        sub = payload["sub"] if "sub" in payload else payload.get("usr")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    new_access = create_access_token(sub)

    return {"access_token": new_access}

@app.post("/auth/logout")
def logout(response: Response):
    clear_cookie(response, "access_token")
    clear_cookie(response, "refresh_token")
    return {"ok": True}

@app.get("/auth/me")
def me(user = Depends(get_current_user)):
    return user



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

# 1. Fetch available items for a given meal (BLD)
@app.get("/api/menu/available-items", tags=["Daily Menu"])
def get_available_items(bld_type: str = Query(..., description="BLD type: Breakfast, Lunch, Dinner, Condiments")):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        # 1) Find the corresponding bld_id (integer) by matching bld_type (case-insensitive)
        cursor.execute(
            "SELECT bld_id FROM bld WHERE LOWER(bld_type) = LOWER(%s) LIMIT 1",
            (bld_type,)
        )
        bld_row = cursor.fetchone()
        if not bld_row:
            raise HTTPException(status_code=404, detail="BLD type not found")

        bld_id = bld_row["bld_id"]

        # 2) Fetch all items whose bld_id matches that integer
        query = """
            SELECT 
                item_id,
                bld_id,
                name,
                description,
                alias,
                category_id,
                uom,
                weight_factor,
                weight_uom,
                item_type,
                hsn_code,
                factor,
                quantity_portion,
                buffer_percentage,
                picture_url,
                breakfast_price,
                lunch_price,
                dinner_price,
                condiments_price,
                festival_price,
                cgst,
                sgst,
                igst,
                net_price
            FROM items
            WHERE bld_id = %s
        """
        cursor.execute(query, (bld_id,))
        items = cursor.fetchall()
        return items

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()



# 2. Fetch existing menu by date and BLD
@app.get("/api/menu", tags=["Daily Menu"])
def get_daily_menu(
    date: str = Query(..., description="Date in YYYY-MM-DD"),
    bld_type: str = Query(..., description="BLD type: Breakfast, Lunch, Dinner, Condiments"),
    period_type: Optional[str] = Query(None, description="Period type: one_day, subscription, all_days, or null for festivals")
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        # Find bld_id from bld_type
        cursor.execute("SELECT bld_id FROM bld WHERE LOWER(bld_type)=LOWER(%s) LIMIT 1", (bld_type,))
        bld_row = cursor.fetchone()
        if not bld_row:
            raise HTTPException(status_code=404, detail="BLD type not found")

        bld_id = bld_row["bld_id"]

        # Fetch menu row for that date and bld_id
        menu_query = """
            SELECT
                menu_id,
                date,
                is_festival,
                is_released,
                is_production_generated,
                period_type,
                bld_id
            FROM menu
            WHERE date = %s
              AND bld_id = %s
              AND (
                    (period_type IS NULL AND %s IS NULL)
                    OR (period_type = %s)
                  )
            LIMIT 1
        """
        # pass the same period_type string twice; if it’s “festivals” we expect period_type IS NULL
        param_period = None if period_type == "festivals" else period_type
        cursor.execute(menu_query, (date, bld_id, param_period, param_period))
        menu_row = cursor.fetchone()
        if not menu_row:
            raise HTTPException(status_code=404, detail="Menu not found")

        menu_id = menu_row["menu_id"]

        # Fetch associated menu_items
        items_query = """
            SELECT
                mi.menu_item_id,
                mi.item_id,
                i.name AS item_name,
                mi.category_id,
                mi.planned_qty,
                mi.available_qty,
                mi.buffer_qty,
                mi.final_qty,
                mi.rate,
                mi.is_default,
                mi.sort_order
            FROM menu_items mi
            JOIN items i ON mi.item_id = i.item_id
            WHERE mi.menu_id = %s
            ORDER BY mi.sort_order ASC
        """
        cursor.execute(items_query, (menu_id,))
        menu_items = cursor.fetchall()

        return {
            "menu_id": menu_id,
            "date": menu_row["date"],
            "is_festival": bool(menu_row["is_festival"]),
            "is_released": bool(menu_row["is_released"]),
            "is_production_generated": bool(menu_row["is_production_generated"]),
            "period_type": menu_row["period_type"],
            "bld_id": menu_row["bld_id"],
            "bld_type": bld_type,
            "items": [
                {
                    "menu_item_id": it["menu_item_id"],
                    "item_id": it["item_id"],
                    "item_name": it["item_name"],
                    "category_id": it["category_id"],
                    "planned_qty": it["planned_qty"],
                    "available_qty": it["available_qty"],
                    "buffer_qty": float(it["buffer_qty"] or 0),
                    "final_qty": float(it["final_qty"] or 0),
                    "rate": float(it["rate"]),
                    "is_default": bool(it["is_default"]),
                    "sort_order": it["sort_order"],
                }
                for it in menu_items
            ]
        }
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


# 3. Create or update (upsert) a daily menu using BLD
class MenuItemPayload(BaseModel):
    item_id: int
    category_id: Optional[int] = None
    planned_qty: Optional[int] = None
    available_qty: Optional[int] = None
    rate: float
    is_default: bool = False
    sort_order: Optional[int] = None

class DailyMenuPayload(BaseModel):
    date: str
    bld_type: str
    is_festival: bool = False
    period_type: Optional[str] = None
    items: List[MenuItemPayload]

@app.post("/api/menu", tags=["Daily Menu"])
def upsert_daily_menu(payload: DailyMenuPayload):
    db = get_db()
    cursor = db.cursor()
    try:
        # Find bld_id from bld_type
        cursor.execute("SELECT bld_id FROM bld WHERE LOWER(bld_type)=LOWER(%s) LIMIT 1", (payload.bld_type,))
        bld_row = cursor.fetchone()
        if not bld_row:
            raise HTTPException(status_code=404, detail="BLD type not found")
        bld_id = bld_row[0]

        # Check if a menu exists for date + bld_id
        find_query = "SELECT menu_id FROM menu WHERE date = %s AND bld_id = %s"
        cursor.execute(find_query, (payload.date, bld_id))
        existing = cursor.fetchone()

        if existing:
            menu_id = existing[0]
            # Update existing menu row
            update_query = """
                UPDATE menu
                   SET is_festival = %s,
                       period_type = %s
                 WHERE menu_id = %s
            """
            cursor.execute(update_query, (int(payload.is_festival), payload.period_type, menu_id))
        else:
            # Insert new menu row
            insert_query = """
                INSERT INTO menu (date, is_festival, is_released, period_type, bld_id)
                VALUES (%s, %s, 0, %s, %s)
            """
            cursor.execute(insert_query, (payload.date, int(payload.is_festival), payload.period_type, bld_id))
            menu_id = cursor.lastrowid

        # Delete existing menu_items for this menu
        delete_items_query = "DELETE FROM menu_items WHERE menu_id = %s"
        cursor.execute(delete_items_query, (menu_id,))

        # Insert each item from payload
        for idx, mi in enumerate(payload.items, start=1):
            insert_item_query = """
                INSERT INTO menu_items
                    (menu_id, item_id, category_id, planned_qty, available_qty, rate, is_default, sort_order)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(
                insert_item_query,
                (
                    menu_id,
                    mi.item_id,
                    mi.category_id,
                    mi.planned_qty,
                    mi.available_qty,
                    mi.rate,
                    int(mi.is_default),
                    mi.sort_order or idx,
                )
            )

        db.commit()
        return get_daily_menu(date=payload.date, bld_type=payload.bld_type, period_type=payload.period_type)
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


# 4. Release a menu by menu_id
@app.patch("/api/menu/{menu_id}/release", tags=["Daily Menu"])
def release_menu(menu_id: int):
    db = get_db()
    cursor = db.cursor()
    try:
        # Verify that menu exists
        cursor.execute("SELECT menu_id FROM menu WHERE menu_id = %s", (menu_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Menu not found")

        # Mark is_released = TRUE
        update_query = "UPDATE menu SET is_released = 1 WHERE menu_id = %s"
        cursor.execute(update_query, (menu_id,))
        db.commit()
        return {"status": "released", "menu_id": menu_id}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

# 5. Un-Release a menu by menu_id
@app.patch("/api/menu/{menu_id}/unrelease", tags=["Daily Menu"])
def unrelease_menu(menu_id: int):
    db = get_db()
    cursor = db.cursor()
    try:
        # Verify that menu exists
        cursor.execute("SELECT menu_id FROM menu WHERE menu_id = %s", (menu_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Menu not found")

        # Mark is_released = FALSE
        update_query = "UPDATE menu SET is_released = 0 WHERE menu_id = %s"
        cursor.execute(update_query, (menu_id,))
        db.commit()
        return {"status": "unreleased", "menu_id": menu_id}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

@app.get("/api/dashboard/metrics")
def get_dashboard_metrics():
    db = get_db()
    try:
        total_customers = get_customer_count(db)
        total_orders = 128
        todays_revenue = 24850
        monthly_revenue = 345200
        popularItems = [
            {"name": "Anna 350 gms", "orders": 42},
            {"name": "Masala Dosa", "orders": 38},
            {"name": "South Indian Thali", "orders": 31},
            {"name": "Mysore Pak", "orders": 27},
        ]
        recentOrders = [
            {"id": "ORD-1234", "customer": "Rahul Sharma", "items": 3, "total": 450, "status": "Delivered"},
            {"id": "ORD-1235", "customer": "Priya Patel", "items": 2, "total": 320, "status": "In Progress"},
            {"id": "ORD-1236", "customer": "Amit Kumar", "items": 5, "total": 780, "status": "Pending"},
            {"id": "ORD-1237", "customer": "Sneha Reddy", "items": 1, "total": 150, "status": "Delivered"},
        ]
        
        return {
            "totalCustomers": total_customers,
            "totalOrders": total_orders,
            "todaysRevenue": todays_revenue,
            "monthlyRevenue": monthly_revenue,
            "popularItems": popularItems,
            "recentOrders": recentOrders,
        }
    finally:
        db.close()


class ProductionPlanItem(BaseModel):
    item_name: str
    buffer_quantity: float
    final_quantity: float

class ProductionPlanRequest(BaseModel):
    date: str
    menu_type: str
    plans: List[ProductionPlanItem]

class PlannedQtyUpdate(BaseModel):
    item_name: str
    additional_qty: float = Field(..., gt=0)

class UpdatePlannedRequest(BaseModel):
    date: str
    menu_type: str
    updates: List[PlannedQtyUpdate]

@app.post("/api/production/generate", tags=["Production"])
def generate_production_plan(payload: ProductionPlanRequest):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    updated = 0
    try:
        # Get bld_id from menu_type
        cursor.execute(
            "SELECT bld_id FROM bld WHERE LOWER(bld_type)=LOWER(%s) LIMIT 1",
            (payload.menu_type,)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Invalid menu_type")
        bld_id = row["bld_id"]

        # Find menu_id for that date + bld_id
        cursor.execute(
            "SELECT menu_id FROM menu WHERE date=%s AND bld_id=%s LIMIT 1",
            (payload.date, bld_id)
        )
        menu = cursor.fetchone()
        if not menu:
            raise HTTPException(status_code=404, detail="Menu not found for that date/type")
        menu_id = menu["menu_id"]

        # Update buffer and final quantities for each menu item
        for plan in payload.plans:
            buffer_value = int(round(plan.buffer_quantity))
            final_value = float(plan.final_quantity)
            cursor.execute(
                """
                UPDATE menu_items mi
                JOIN items i ON mi.item_id = i.item_id
                SET mi.buffer_qty = %s,
                    mi.final_qty = %s
                WHERE mi.menu_id = %s
                AND LOWER(i.name) = LOWER(%s)
                """,
                (buffer_value, final_value, menu_id, plan.item_name)
            )
            updated += cursor.rowcount


        # Mark plan as generated
        cursor.execute(
            "UPDATE menu SET is_production_generated = 1 WHERE menu_id=%s", (menu_id,)
        )
        db.commit()

        return {
            "success": True,
            "updated_items": updated,
            "menu_type": payload.menu_type,
            "message": "Production plan saved successfully"
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

@app.patch("/api/production/update-planned", tags=["Production"])
def update_planned_quantities(payload: UpdatePlannedRequest):
    if not payload.updates:
        raise HTTPException(status_code=400, detail="No updates provided")

    db = get_db()
    cursor = db.cursor(dictionary=True)
    updated_items: List[Dict[str, float]] = []

    try:
        cursor.execute(
            "SELECT bld_id FROM bld WHERE LOWER(bld_type)=LOWER(%s) LIMIT 1",
            (payload.menu_type,),
        )
        bld_row = cursor.fetchone()
        if not bld_row:
            raise HTTPException(status_code=404, detail="Invalid menu_type")
        bld_id = bld_row["bld_id"]

        cursor.execute(
            "SELECT menu_id FROM menu WHERE date=%s AND bld_id=%s LIMIT 1",
            (payload.date, bld_id),
        )
        menu_row = cursor.fetchone()
        if not menu_row:
            raise HTTPException(status_code=404, detail="Menu not found for that date/type")
        menu_id = menu_row["menu_id"]

        for adjustment in payload.updates:
            cursor.execute(
                """
                UPDATE menu_items mi
                JOIN items i ON mi.item_id = i.item_id
                   SET mi.planned_qty = mi.planned_qty + %s
                 WHERE mi.menu_id = %s
                   AND LOWER(i.name) = LOWER(%s)
                """,
                (adjustment.additional_qty, menu_id, adjustment.item_name),
            )
            if cursor.rowcount == 0:
                continue

            cursor.execute(
                """
                SELECT mi.planned_qty
                  FROM menu_items mi
                  JOIN items i ON mi.item_id = i.item_id
                 WHERE mi.menu_id = %s
                   AND LOWER(i.name) = LOWER(%s)
                 LIMIT 1
                """,
                (menu_id, adjustment.item_name),
            )
            planned_row = cursor.fetchone()
            if planned_row:
                updated_items.append(
                    {
                        "item_name": adjustment.item_name,
                        "new_planned_qty": float(planned_row["planned_qty"]),
                    }
                )

        if not updated_items:
            raise HTTPException(status_code=404, detail="No matching menu items were updated")

        db.commit()

        return {
            "success": True,
            "message": "Planned quantities updated successfully",
            "updated_items": updated_items,
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

@app.get("/api/production/status", tags=["Production"])
def get_production_plan_status(date: str):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT m.bld_id, b.bld_type,
                   MAX(mi.is_production_generated) AS is_generated
              FROM menu m
              JOIN menu_items mi ON m.menu_id = mi.menu_id
              JOIN bld b ON m.bld_id = b.bld_id
             WHERE m.date = %s
          GROUP BY m.bld_id, b.bld_type
            """,
            (date,),
        )
        rows = cursor.fetchall()
        return {
            "date": date,
            "status": [
                {"bld_id": r["bld_id"], "menu_type": r["bld_type"], "is_generated": bool(r["is_generated"])}
                for r in rows
            ],
        }
    finally:
        cursor.close()
        db.close()
