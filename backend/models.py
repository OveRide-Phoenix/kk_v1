from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DECIMAL,
    Date,
    Boolean,
    ForeignKey,
    Enum,
    TIMESTAMP,
)
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# ─────────────────────────────────────────────────────────────────────────────
# CUSTOMERS
# ─────────────────────────────────────────────────────────────────────────────
class Customer(Base):
    __tablename__ = "customers"
    customer_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    referred_by = Column(String(100), nullable=True)
    primary_mobile = Column(String(15), unique=True, nullable=False)
    alternative_mobile = Column(String(15), nullable=True)
    name = Column(String(100), nullable=False)
    recipient_name = Column(String(100), nullable=False)
    payment_frequency = Column(String(50), nullable=True, default="Daily")
    email = Column(String(100), unique=True, nullable=True)
    created_at = Column(TIMESTAMP, nullable=True)

    addresses = relationship("Address", back_populates="customer")
    orders = relationship("Order", back_populates="customer")


# ─────────────────────────────────────────────────────────────────────────────
# ADDRESSES
# ─────────────────────────────────────────────────────────────────────────────
class Address(Base):
    __tablename__ = "addresses"
    address_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=False)
    house_apartment_no = Column(String(255), nullable=True)
    written_address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    pin_code = Column(String(10), nullable=False)
    latitude = Column(DECIMAL(10, 8), nullable=False)
    longitude = Column(DECIMAL(11, 8), nullable=False)
    address_type = Column(String(50), nullable=True)
    route_assignment = Column(String(50), nullable=True)
    is_default = Column(Boolean, nullable=False, default=False)

    customer = relationship("Customer", back_populates="addresses")
    orders = relationship("Order", back_populates="address")


# ─────────────────────────────────────────────────────────────────────────────
# ORDERS
# ─────────────────────────────────────────────────────────────────────────────
class Order(Base):
    __tablename__ = "orders"
    order_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=False)
    address_id = Column(Integer, ForeignKey("addresses.address_id"), nullable=False)
    total_price = Column(DECIMAL(10, 2), nullable=False)
    status = Column(String(50), nullable=True, default="Pending")
    payment_method = Column(String(50), nullable=False)
    order_type = Column(String(50), nullable=True, default="one_time")
    discount = Column(DECIMAL(10, 2), nullable=True, default=0.00)
    created_at = Column(TIMESTAMP, nullable=True)

    customer = relationship("Customer", back_populates="orders")
    address = relationship("Address", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order")


# ─────────────────────────────────────────────────────────────────────────────
# ORDER ITEMS
# ─────────────────────────────────────────────────────────────────────────────
class OrderItem(Base):
    __tablename__ = "order_items"
    order_item_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.order_id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.item_id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(DECIMAL(10, 2), nullable=False)

    order = relationship("Order", back_populates="order_items")
    item = relationship("Item", back_populates="order_items")


# ─────────────────────────────────────────────────────────────────────────────
# BLD (Breakfast/Lunch/Dinner/Condiments)
# ─────────────────────────────────────────────────────────────────────────────
class BLD(Base):
    __tablename__ = "bld"

    bld_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    bld_type = Column(
        Enum("Breakfast", "Lunch", "Dinner", "Condiments", name="bld_type_enum"),
        nullable=False,
        unique=True,
    )

    menus = relationship("Menu", back_populates="bld")
    items = relationship("Item", back_populates="bld")


# ─────────────────────────────────────────────────────────────────────────────
# MENU
# ─────────────────────────────────────────────────────────────────────────────
class Menu(Base):
    __tablename__ = "menu"

    menu_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(Date, nullable=False)
    is_festival = Column(Boolean, nullable=False, default=False)
    is_released = Column(Boolean, nullable=False, default=False)
    is_production_generated = Column(Boolean, nullable=False, default=False)
    period_type = Column(
        Enum("one_day", "subscription", "all_days", name="period_type_enum"),
        nullable=True,
    )

    bld_id = Column(Integer, ForeignKey("bld.bld_id"), nullable=False)
    bld = relationship("BLD", back_populates="menus")

    menu_items = relationship("MenuItem", back_populates="menu")


# ─────────────────────────────────────────────────────────────────────────────
# CATEGORIES
# ─────────────────────────────────────────────────────────────────────────────
class Category(Base):
    __tablename__ = "categories"
    category_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category_name = Column(String(100), unique=True, nullable=False)

    items = relationship("Item", back_populates="category")
    menu_items = relationship("MenuItem", back_populates="category")


# ─────────────────────────────────────────────────────────────────────────────
# ITEMS
# ─────────────────────────────────────────────────────────────────────────────
class Item(Base):
    __tablename__ = "items"

    item_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    alias = Column(String(100), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.category_id"), nullable=True)
    uom = Column(String(50), nullable=False)
    weight_factor = Column(DECIMAL(5, 3), nullable=True)
    weight_uom = Column(String(50), nullable=True)
    item_type = Column(String(50), nullable=True)
    hsn_code = Column(String(50), nullable=True)
    factor = Column(DECIMAL(5, 3), nullable=True, default=1)
    quantity_portion = Column(Integer, nullable=True)
    buffer_percentage = Column(DECIMAL(5, 2), nullable=True)
    picture_url = Column(String(255), nullable=True)

    breakfast_price = Column(DECIMAL(10, 2), nullable=True)
    lunch_price = Column(DECIMAL(10, 2), nullable=True)
    dinner_price = Column(DECIMAL(10, 2), nullable=True)
    condiments_price = Column(DECIMAL(10, 2), nullable=True)
    festival_price = Column(DECIMAL(10, 2), nullable=True)

    cgst = Column(DECIMAL(5, 2), nullable=True)
    sgst = Column(DECIMAL(5, 2), nullable=True)
    igst = Column(DECIMAL(5, 2), nullable=True)
    net_price = Column(DECIMAL(10, 2), nullable=True)
    is_combo = Column(Boolean, nullable=False, default=False)

    bld_id = Column(Integer, ForeignKey("bld.bld_id"), nullable=True)
    bld = relationship("BLD", back_populates="items")

    category = relationship("Category", back_populates="items")
    order_items = relationship("OrderItem", back_populates="item")


# ─────────────────────────────────────────────────────────────────────────────
# MENU ITEMS
# ─────────────────────────────────────────────────────────────────────────────
class MenuItem(Base):
    __tablename__ = "menu_items"
    menu_item_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    menu_id = Column(Integer, ForeignKey("menu.menu_id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.item_id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.category_id"), nullable=True)

    planned_qty = Column(Integer, nullable=True)
    available_qty = Column(Integer, nullable=True)
    buffer_qty = Column(DECIMAL(10, 2), nullable=True, default=0)
    final_qty = Column(DECIMAL(10, 2), nullable=True, default=0)
    rate = Column(DECIMAL(10, 2), nullable=False)
    is_default = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=True)

    menu = relationship("Menu", back_populates="menu_items")
    item = relationship("Item")
    category = relationship("Category", back_populates="menu_items")


# ─────────────────────────────────────────────────────────────────────────────
# ITEM COMBO
# ─────────────────────────────────────────────────────────────────────────────
class ItemCombo(Base):
    __tablename__ = "item_combos"
    combo_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    combo_item_id = Column(Integer, ForeignKey("items.item_id"), nullable=False)
    included_item_id = Column(Integer, ForeignKey("items.item_id"), nullable=True)
    included_category_id = Column(Integer, ForeignKey("categories.category_id"), nullable=True)
    quantity = Column(Integer, nullable=False, default=1)


# ─────────────────────────────────────────────────────────────────────────────
# ITEM ADD-ON
# ─────────────────────────────────────────────────────────────────────────────
class ItemAddOn(Base):
    __tablename__ = "item_add_ons"
    add_on_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    main_item_id = Column(Integer, ForeignKey("items.item_id"), nullable=False)
    add_on_item_id = Column(Integer, ForeignKey("items.item_id"), nullable=False)
    is_mandatory = Column(Boolean, nullable=False, default=False)
    max_quantity = Column(Integer, nullable=False, default=1)


# ─────────────────────────────────────────────────────────────────────────────
# ITEM PRICE HISTORY
# ─────────────────────────────────────────────────────────────────────────────
class ItemPriceHistory(Base):
    __tablename__ = "item_price_history"
    history_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("items.item_id"), nullable=False)
    effect_date = Column(Date, nullable=False)
    breakfast_price = Column(DECIMAL(10, 2), nullable=True)
    lunch_price = Column(DECIMAL(10, 2), nullable=True)
    dinner_price = Column(DECIMAL(10, 2), nullable=True)
    condiments_price = Column(DECIMAL(10, 2), nullable=True)
    festival_price = Column(DECIMAL(10, 2), nullable=True)
    cgst = Column(DECIMAL(5, 2), nullable=True)
    sgst = Column(DECIMAL(5, 2), nullable=True)
    igst = Column(DECIMAL(5, 2), nullable=True)
    net_price = Column(DECIMAL(10, 2), nullable=True)
