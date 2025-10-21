from calendar import month
from datetime import date, datetime
import mysql.connector
from mysql.connector import errorcode
from fastapi import FastAPI, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from decimal import Decimal
from typing import List, Dict, Optional, Tuple
from fastapi.middleware.cors import CORSMiddleware
import csv
import io
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


def _format_datetime(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    return dt.isoformat()


def _parse_optional_date(value: Optional[str]) -> Optional[date]:
    if value is None:
        return None
    stripped = value.strip()
    if not stripped:
        return None
    try:
        return datetime.strptime(stripped, "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.") from exc

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

        is_admin_account = bool(result["admin_id"])
        admin_password_provided = bool(data.admin_password)

        access = None
        refresh = None
        user_payload = None
        admin_login = False

        if is_admin_account and admin_password_provided:
            if not result["is_active"]:
                raise HTTPException(status_code=403, detail="Admin account disabled")
            if not verify_password(data.admin_password, result["password_hash"]):
                raise HTTPException(status_code=401, detail="Invalid admin password")

            admin_login = True
            user_payload = {
                "admin_id": result["admin_id"],
                "customer_id": result["customer_id"],
                "phone": result["phone_number"],
                "role": result["role"] or "admin",
                "is_admin": True,
                "name": result.get("customer_name"),
            }
            access = create_access_token(user_payload)
            refresh = create_refresh_token(user_payload, str(uuid.uuid4()))
        else:
            user_payload = {
                "customer_id": result["customer_id"],
                "phone": result["phone_number"],
                "role": "customer",
                "is_admin": False,
                "name": result.get("customer_name"),
            }
            access = create_access_token(user_payload)
            refresh = create_refresh_token(user_payload, str(uuid.uuid4()))

        # IMPORTANT: do NOT set cookies — tokens are returned in JSON
        # set_cookie(response, "access_token",  access,  60 * 15)
        # set_cookie(response, "refresh_token", refresh, 60 * 60 * 24 * 7)

        return {
            "message": "Login successful",
            "is_admin": admin_login,
            "is_admin_account": is_admin_account,
            "user": user_payload,
            "access_token": access,
            "refresh_token": refresh,
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
    cursor = db.cursor(dictionary=True)
    try:
        today = date.today()
        today_str = today.isoformat()

        total_customers = get_customer_count(db)

        cursor.execute("SELECT COUNT(*) AS total_orders FROM orders")
        total_orders_record = cursor.fetchone() or {"total_orders": 0}
        total_orders = int(total_orders_record.get("total_orders") or 0)

        cursor.execute(
            """
            SELECT COUNT(*) AS pending_orders
              FROM orders
             WHERE LOWER(COALESCE(status, '')) IN ('pending', 'in progress', 'processing')
            """
        )
        pending_record = cursor.fetchone() or {"pending_orders": 0}
        pending_orders = int(pending_record.get("pending_orders") or 0)
        completed_orders = max(total_orders - pending_orders, 0)

        cursor.execute("SELECT COUNT(*) AS total_blds FROM bld")
        bld_record = cursor.fetchone() or {"total_blds": 0}
        total_blds = int(bld_record.get("total_blds") or 0)

        cursor.execute(
            """
            SELECT 
                COUNT(*) AS menu_count,
                SUM(CASE WHEN m.is_released = 1 THEN 1 ELSE 0 END) AS released_count,
                SUM(CASE WHEN m.is_production_generated = 1 THEN 1 ELSE 0 END) AS production_count
            FROM menu m
            WHERE m.date = %s
            """,
            (today_str,),
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
            """,
            (today_str,),
        )
        menu_items_record = cursor.fetchone() or {"menu_items_count": 0}
        menu_items_count = int(menu_items_record.get("menu_items_count") or 0)

        cursor.execute(
            """
            SELECT 
                COUNT(*) AS total_today,
                SUM(CASE WHEN LOWER(COALESCE(status, '')) IN ('delivered', 'completed') THEN 1 ELSE 0 END) AS delivered_today,
                SUM(CASE WHEN LOWER(COALESCE(status, '')) IN ('pending', 'in progress', 'processing') THEN 1 ELSE 0 END) AS pending_today
            FROM orders
            WHERE DATE(created_at) = %s
            """,
            (today_str,),
        )
        daily_orders_record = cursor.fetchone() or {
            "total_today": 0,
            "delivered_today": 0,
            "pending_today": 0,
        }
        daily_orders_total = int(daily_orders_record.get("total_today") or 0)
        daily_orders_pending = int(daily_orders_record.get("pending_today") or 0)
        daily_orders_delivered = int(daily_orders_record.get("delivered_today") or 0)

        daily_menu_completed = (
            total_blds > 0 and menu_count >= total_blds and menu_items_count > 0
        )
        release_completed = total_blds > 0 and released_count >= total_blds
        production_completed = total_blds > 0 and production_count >= total_blds
        deliveries_completed = (
            daily_orders_total > 0 and daily_orders_pending == 0
        )

        deliveries_status = "Done" if deliveries_completed else (
            "In Progress" if daily_orders_delivered > 0 else "Pending"
        )

        daily_menu_status = "Done" if daily_menu_completed else (
            "In Progress" if total_blds > 0 and menu_count > 0 else "Pending"
        )
        menu_release_status = "Done" if release_completed else (
            "In Progress" if total_blds > 0 and released_count > 0 else "Pending"
        )
        production_status = "Done" if production_completed else (
            "In Progress" if total_blds > 0 and production_count > 0 else "Pending"
        )

        checklist = [
            {
                "key": "daily_menu",
                "label": "Daily Menu Setup",
                "completed": daily_menu_completed,
                "status": daily_menu_status,
                "detail": f"{menu_count}/{total_blds} menus ready" if total_blds else None,
            },
            {
                "key": "menu_release",
                "label": "Menu Release",
                "completed": release_completed,
                "status": menu_release_status,
                "detail": f"{released_count}/{total_blds} released" if total_blds else None,
            },
            {
                "key": "production_plan",
                "label": "Kitchen Production Planning",
                "completed": production_completed,
                "status": production_status,
                "detail": f"{production_count}/{total_blds} planned" if total_blds else None,
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
                c.name AS customer_name,
                COALESCE(SUM(oi.quantity), 0) AS item_count
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            GROUP BY o.order_id, o.created_at, o.total_price, o.status, c.name
            ORDER BY o.created_at DESC, o.order_id DESC
            LIMIT 5
            """
        )
        recent_rows = cursor.fetchall() or []
        recent_orders = []
        for row in recent_rows:
            order_id = int(row.get("order_id") or 0)
            created_at = row.get("created_at")
            status_raw = (row.get("status") or "Pending").strip()
            status_formatted = " ".join(
                word.capitalize() for word in status_raw.split()
            ) or "Pending"
            recent_orders.append(
                {
                    "id": f"ORD-{order_id:05d}" if order_id else str(row.get("order_id") or ""),
                    "orderId": order_id,
                    "customer": row.get("customer_name") or "Unknown Customer",
                    "items": int(row.get("item_count") or 0),
                    "total": float(row.get("total_price") or 0),
                    "status": status_formatted,
                    "createdAt": created_at.isoformat() if created_at else None,
                }
            )

        todays_revenue = 24850
        monthly_revenue = 345200

        return {
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


def _apply_order_filters(
    base_where: List[str],
    params: List,
    status: Optional[str],
    customer: Optional[str],
    product: Optional[str],
) -> None:
    if status:
        normalized = status.strip().lower()
        if normalized and normalized != "all":
            base_where.append("LOWER(COALESCE(o.status, '')) = %s")
            params.append(normalized)
    if customer:
        term = f"%{customer.strip()}%"
        base_where.append("(c.name LIKE %s OR c.primary_mobile LIKE %s)")
        params.extend([term, term])
    if product:
        term = f"%{product.strip()}%"
        base_where.append("i.name LIKE %s")
        params.append(term)


@app.get("/api/admin/orders/history")
def admin_order_history(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    customer: Optional[str] = None,
    product: Optional[str] = None,
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
    export: Optional[str] = None,
):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
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

        _apply_order_filters(where_clauses, params, status, customer, product)
        where_sql = " AND ".join(where_clauses)
        where_fragment = f"WHERE {where_sql}" if where_sql else ""

        count_query = f"""
            SELECT COUNT(DISTINCT o.order_id) AS total
              FROM orders o
              JOIN customers c ON o.customer_id = c.customer_id
              LEFT JOIN order_items oi ON o.order_id = oi.order_id
              LEFT JOIN items i ON oi.item_id = i.item_id
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
            {where_fragment}
            GROUP BY
                o.order_id,
                o.created_at,
                o.total_price,
                o.status,
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

        data_params = list(params)
        if export != "csv":
            data_query += " LIMIT %s OFFSET %s"
            data_params.extend([limit, offset])

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
                    i.name AS item_name
                FROM order_items oi
                JOIN items i ON oi.item_id = i.item_id
                WHERE oi.order_id IN ({placeholders})
                ORDER BY oi.order_id ASC, i.name ASC
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
                        "line_total": float(row.get("quantity") or 0) * float(row.get("price") or 0),
                    }
                )

        if export == "csv":
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(
                [
                    "Order ID",
                    "Placed At",
                    "Customer",
                    "Phone",
                    "Status",
                    "Payment Method",
                    "Item",
                    "Quantity",
                    "Price",
                    "Line Total",
                    "Order Total",
                ]
            )

            for record in orders:
                order_items = items_by_order.get(record["order_id"], []) or [
                    {"name": "", "quantity": 0, "price": 0.0, "line_total": 0.0}
                ]
                for item in order_items:
                    writer.writerow(
                        [
                            record["order_id"],
                            record["created_at"].strftime("%Y-%m-%d %H:%M:%S") if record.get("created_at") else "",
                            record.get("customer_name") or "",
                            record.get("primary_mobile") or "",
                            record.get("status") or "",
                            record.get("payment_method") or "",
                            item["name"],
                            item["quantity"],
                            item["price"],
                            item["line_total"],
                            float(record.get("total_price") or 0),
                        ]
                    )

            output.seek(0)
            response = Response(
                content=output.getvalue(),
                media_type="text/csv",
                headers={
                    "Content-Disposition": "attachment; filename=order-history.csv",
                },
            )
            return response

        result = []
        for record in orders:
            order_id = record["order_id"]
            result.append(
                {
                    "order_id": order_id,
                    "created_at": _format_datetime(record.get("created_at")),
                    "status": record.get("status") or "Pending",
                    "payment_method": record.get("payment_method") or "Unknown",
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
        cursor.close()
        db.close()


@app.get("/api/admin/orders/{order_id}/invoice")
def admin_order_invoice(order_id: int):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
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
                a.pin_code
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            LEFT JOIN addresses a ON o.address_id = a.address_id
            WHERE o.order_id = %s
            """,
            (order_id,),
        )
        order_row = cursor.fetchone()
        if not order_row:
            raise HTTPException(status_code=404, detail="Order not found")

        cursor.execute(
            """
            SELECT 
                oi.quantity,
                oi.price,
                i.name AS item_name
            FROM order_items oi
            JOIN items i ON oi.item_id = i.item_id
            WHERE oi.order_id = %s
            ORDER BY i.name ASC
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

        invoice_response = {
            "invoice_number": f"INV-{order_id:05d}",
            "issued_at": _format_datetime(datetime.now()),
            "due_date": None,
            "order": {
                "order_id": order_id,
                "created_at": _format_datetime(order_row.get("created_at")),
                "status": order_row.get("status") or "Pending",
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

        return invoice_response
    finally:
        cursor.close()
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

class OrderItemPayload(BaseModel):
    item_id: int
    quantity: int
    price: float
    menu_item_id: Optional[int] = None
    meal_type: Optional[str] = None

class CreateOrderPayload(BaseModel):
    customer_id: int
    address_id: Optional[int] = None
    payment_method: str
    items: List[OrderItemPayload]
    order_date: Optional[str] = None
    order_type: Optional[str] = None


class AddressPayload(BaseModel):
    address_type: Optional[str] = None
    house_apartment_no: Optional[str] = None
    written_address: str
    city: str
    pin_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    route_assignment: Optional[str] = None
    is_default: bool = False

@app.get("/api/customers/{customer_id}/addresses", tags=["Customers"])
def get_customer_addresses(customer_id: int):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT
                address_id,
                address_type,
                house_apartment_no,
                written_address,
                city,
                pin_code,
                is_default,
                latitude,
                longitude,
                route_assignment
            FROM addresses
            WHERE customer_id = %s
            ORDER BY is_default DESC, address_id ASC
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
                "pin_code": row.get("pin_code") or "",
                "is_default": bool(row.get("is_default")),
                "latitude": float(row["latitude"]) if row.get("latitude") is not None else None,
                "longitude": float(row["longitude"]) if row.get("longitude") is not None else None,
                "route_assignment": row.get("route_assignment"),
            }
            for row in rows
        ]
    finally:
        cursor.close()
        db.close()


def _resolve_coordinates(cursor, customer_id: int, latitude: Optional[float], longitude: Optional[float]) -> Tuple[float, float]:
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


@app.post("/api/customers/{customer_id}/addresses", tags=["Customers"])
def create_customer_address(customer_id: int, payload: AddressPayload):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT customer_id FROM customers WHERE customer_id=%s LIMIT 1", (customer_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Customer not found")

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
                pin_code,
                latitude,
                longitude,
                address_type,
                route_assignment,
                is_default
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                customer_id,
                payload.house_apartment_no,
                payload.written_address.strip(),
                payload.city.strip(),
                payload.pin_code.strip(),
                lat,
                lng,
                payload.address_type.strip() if payload.address_type else "Address",
                payload.route_assignment,
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


@app.put("/api/customers/{customer_id}/addresses/{address_id}", tags=["Customers"])
def update_customer_address(customer_id: int, address_id: int, payload: AddressPayload):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT latitude, longitude FROM addresses WHERE address_id=%s AND customer_id=%s LIMIT 1",
            (address_id, customer_id),
        )
        existing = cursor.fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Address not found")

        lat_input = payload.latitude if payload.latitude is not None else existing.get("latitude")
        lng_input = payload.longitude if payload.longitude is not None else existing.get("longitude")
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
                   pin_code=%s,
                   latitude=%s,
                   longitude=%s,
                   address_type=%s,
                   route_assignment=%s,
                   is_default=%s
             WHERE address_id=%s AND customer_id=%s
            """,
            (
                payload.house_apartment_no,
                payload.written_address.strip(),
                payload.city.strip(),
                payload.pin_code.strip(),
                lat,
                lng,
                payload.address_type.strip() if payload.address_type else "Address",
                payload.route_assignment,
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


@app.post("/api/customers/{customer_id}/addresses/{address_id}/default", tags=["Customers"])
def set_default_customer_address(customer_id: int, address_id: int):
    db = get_db()
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

@app.post("/api/orders/create", tags=["Orders"])
def create_order(payload: CreateOrderPayload):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must include at least one item")

    db = get_db()
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

        total_price = sum(item.price * item.quantity for item in payload.items)

        cursor.execute(
            """
            INSERT INTO orders (customer_id, address_id, total_price, payment_method, status, order_type)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                payload.customer_id,
                address_id,
                float(total_price),
                payload.payment_method,
                "Pending",
                payload.order_type or "one_time",
            ),
        )
        order_id = cursor.lastrowid

        cursor.executemany(
            """
            INSERT INTO order_items (order_id, item_id, quantity, price)
            VALUES (%s, %s, %s, %s)
            """,
            [
            (order_id, item.item_id, item.quantity, float(item.price))
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
            "total_price": float(total_price),
            "status": "Pending",
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@app.get("/api/customers/{customer_id}/orders", tags=["Customers"])
def list_customer_orders(customer_id: int, limit: int = Query(50, ge=1, le=200)):
    db = get_db()
    cursor = db.cursor(dictionary=True)
    try:
        try:
            cursor.execute(
                """
                SELECT o.order_id,
                       o.created_at,
                       o.total_price,
                       o.status,
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
                   i.name AS item_name
              FROM order_items oi
              JOIN items i ON oi.item_id = i.item_id
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
            result.append(
                {
                    "order_id": order_id,
                    "created_at": created.isoformat() if created else None,
                    "total_price": float(order.get("total_price") or 0),
                    "status": order.get("status") or "Pending",
                    "payment_method": order.get("payment_method") or "Cash",
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
