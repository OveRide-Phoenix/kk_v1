from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DECIMAL,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    TIMESTAMP,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

from .city_config import DEFAULT_CITY

Base = declarative_base()


class Customer(Base):
    __tablename__ = "customers"

    customer_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    referred_by = Column(String(100), nullable=True)
    primary_mobile = Column(String(15), unique=True, nullable=False)
    alternative_mobile = Column(String(15), nullable=True)
    name = Column(String(100), nullable=False)
    recipient_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    payment_frequency = Column(String(50), nullable=True, default="Daily")
    email = Column(String(100), nullable=True)
    created_at = Column(TIMESTAMP, nullable=True)
    is_admin = Column(Boolean, nullable=False, default=False)
    roles = Column(JSON, nullable=True)
    admin_password_hash = Column(String(255), nullable=True)
    admin_is_active = Column(Boolean, nullable=False, default=True)

    addresses = relationship("Address", back_populates="customer")
    orders = relationship("Order", back_populates="customer")
    admin_logs = relationship("AdminLog", back_populates="admin")


class Address(Base):
    __tablename__ = "addresses"

    address_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=False)
    house_apartment_no = Column(String(255), nullable=True)
    written_address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    city_code = Column(String(3), nullable=False, default=DEFAULT_CITY)
    pin_code = Column(String(10), nullable=False)
    latitude = Column(DECIMAL(10, 8), nullable=False)
    longitude = Column(DECIMAL(11, 8), nullable=False)
    address_type = Column(String(50), nullable=True)
    route_id = Column(Integer, ForeignKey("delivery_routes.route_id"), nullable=True)
    is_default = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)

    customer = relationship("Customer", back_populates="addresses")
    orders = relationship("Order", back_populates="address")


class Role(Base):
    __tablename__ = "roles"

    role_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    is_system = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP, nullable=False)


class ComponentType(Base):
    __tablename__ = "component_types"

    component_type_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.category_id"), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, nullable=False)

    category = relationship("Category")


class Constant(Base):
    __tablename__ = "constants"

    constant_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    constant_code = Column(String(50), unique=True, nullable=False)
    constant_type = Column(String(20), nullable=False)
    constant_value = Column(DECIMAL(5, 2), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    description = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, nullable=False)
    updated_at = Column(TIMESTAMP, nullable=False)


class BLD(Base):
    __tablename__ = "bld"

    bld_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    bld_type = Column(
        Enum("Breakfast", "Lunch", "Dinner", "Condiments", name="bld_type_enum"),
        nullable=False,
    )

    menus = relationship("Menu", back_populates="bld")
    item_links = relationship("ItemBLDMap", back_populates="bld")
    combo_links = relationship("ComboBLDMap", back_populates="bld")
    items = relationship("Item", secondary="item_bld_map", back_populates="blds", viewonly=True)
    combos = relationship("Combo", secondary="combo_bld_map", back_populates="blds", viewonly=True)


class Category(Base):
    __tablename__ = "categories"

    category_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category_name = Column(String(100), unique=True, nullable=False)

    items = relationship("Item", back_populates="category")
    combos = relationship("Combo", back_populates="category")
    menu_items = relationship("MenuItem", back_populates="category")


class DeliveryRoute(Base):
    __tablename__ = "delivery_routes"

    route_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    city_code = Column(String(10), nullable=False)
    route_code = Column(String(50), nullable=False)
    route_name = Column(String(150), nullable=False)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(TIMESTAMP, nullable=False)
    updated_at = Column(TIMESTAMP, nullable=False)


class TripSheet(Base):
    __tablename__ = "trip_sheets"

    trip_sheet_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    service_date = Column(Date, nullable=False)
    city_code = Column(String(10), nullable=False)
    meal_type = Column(String(50), nullable=False, default="")
    payload = Column(JSON, nullable=False)
    generated_at = Column(TIMESTAMP, nullable=False)
    updated_at = Column(TIMESTAMP, nullable=False)


class Item(Base):
    __tablename__ = "items"

    item_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    alias = Column(String(100), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.category_id"), nullable=True)
    component_type_id = Column(Integer, nullable=True)
    uom_customer = Column(String(50), nullable=False)
    unit_packing = Column(DECIMAL(10, 3), nullable=True)
    uom_packing = Column(String(50), nullable=True)
    item_type = Column(String(50), nullable=True)
    hsn_code = Column(String(50), nullable=True)
    uom_production = Column(String(50), nullable=True)
    packing_to_production_rate = Column(DECIMAL(10, 6), nullable=True, default=1)
    buffer_percentage = Column(DECIMAL(5, 2), nullable=True)
    max_qty_breakfast = Column(Integer, nullable=True)
    max_qty_lunch = Column(Integer, nullable=True)
    max_qty_dinner = Column(Integer, nullable=True)
    max_qty_condiments = Column(Integer, nullable=True)
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

    category = relationship("Category", back_populates="items")
    order_items = relationship("OrderItem", back_populates="item")
    menu_items = relationship("MenuItem", back_populates="item")
    price_history = relationship("ItemPriceHistory", back_populates="item")
    item_bld_links = relationship("ItemBLDMap", back_populates="item")
    combo_item_links = relationship("ComboItem", back_populates="item")
    plated_items = relationship("PlatedItem", back_populates="item")
    plated_component_links = relationship(
        "PlatedItemComponent",
        back_populates="component_item",
        foreign_keys="PlatedItemComponent.component_item_id",
    )
    blds = relationship("BLD", secondary="item_bld_map", back_populates="items", viewonly=True)


class Combo(Base):
    __tablename__ = "combos"

    combo_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    combo_name = Column(String(50), nullable=False)
    price = Column(DECIMAL(10, 2), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.category_id"), nullable=False)

    category = relationship("Category", back_populates="combos")
    combo_items = relationship("ComboItem", back_populates="combo")
    menu_items = relationship("MenuItem", back_populates="combo")
    order_items = relationship("OrderItem", back_populates="combo")
    combo_bld_links = relationship("ComboBLDMap", back_populates="combo")
    legacy_mappings = relationship("LegacyComboMap", back_populates="combo")
    blds = relationship("BLD", secondary="combo_bld_map", back_populates="combos", viewonly=True)


class Menu(Base):
    __tablename__ = "menu"

    menu_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(Date, nullable=True)
    is_festival = Column(Boolean, nullable=False, default=False)
    is_released = Column(Boolean, nullable=False, default=False)
    period_type = Column(
        Enum("one_day", "subscription", "all_days", name="period_type_enum"),
        nullable=True,
    )
    city_code = Column(String(3), nullable=False, default=DEFAULT_CITY)
    bld_id = Column(Integer, ForeignKey("bld.bld_id"), nullable=False)
    is_production_generated = Column(Boolean, nullable=True, default=False)
    buffer_override_pct = Column(DECIMAL(5, 2), nullable=True)
    menu_type = Column(String(20), nullable=False, default="ONE_DAY")
    delivers_by = Column(String(20), nullable=True)

    bld = relationship("BLD", back_populates="menus")
    menu_items = relationship("MenuItem", back_populates="menu")


class ItemPriceHistory(Base):
    __tablename__ = "item_price_history"

    history_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("items.item_id"), nullable=False)
    from_date = Column(Date, nullable=False)
    to_date = Column(Date, nullable=True)
    breakfast_price = Column(DECIMAL(10, 2), nullable=True)
    lunch_price = Column(DECIMAL(10, 2), nullable=True)
    dinner_price = Column(DECIMAL(10, 2), nullable=True)
    condiments_price = Column(DECIMAL(10, 2), nullable=True)
    festival_price = Column(DECIMAL(10, 2), nullable=True)
    cgst = Column(DECIMAL(5, 2), nullable=True)
    sgst = Column(DECIMAL(5, 2), nullable=True)
    igst = Column(DECIMAL(5, 2), nullable=True)
    net_price = Column(DECIMAL(10, 2), nullable=True)

    item = relationship("Item", back_populates="price_history")


class ItemBLDMap(Base):
    __tablename__ = "item_bld_map"

    item_id = Column(Integer, ForeignKey("items.item_id", ondelete="CASCADE"), primary_key=True)
    bld_id = Column(Integer, ForeignKey("bld.bld_id", ondelete="CASCADE"), primary_key=True)

    item = relationship("Item", back_populates="item_bld_links")
    bld = relationship("BLD", back_populates="item_links")


class ComboItem(Base):
    __tablename__ = "combo_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    combo_id = Column(Integer, ForeignKey("combos.combo_id", ondelete="CASCADE"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.item_id"), nullable=True)
    component_type_id = Column(Integer, nullable=True)
    quantity = Column(Integer, nullable=True, default=1)

    combo = relationship("Combo", back_populates="combo_items")
    item = relationship("Item", back_populates="combo_item_links")


class ComboBLDMap(Base):
    __tablename__ = "combo_bld_map"

    combo_id = Column(Integer, ForeignKey("combos.combo_id", ondelete="CASCADE"), primary_key=True)
    bld_id = Column(Integer, ForeignKey("bld.bld_id", ondelete="CASCADE"), primary_key=True)

    combo = relationship("Combo", back_populates="combo_bld_links")
    bld = relationship("BLD", back_populates="combo_links")


class LegacyComboMap(Base):
    __tablename__ = "legacy_combo_map"

    legacy_item_id = Column(Integer, primary_key=True)
    combo_id = Column(Integer, ForeignKey("combos.combo_id", ondelete="CASCADE"), nullable=False)
    migrated_at = Column(TIMESTAMP, nullable=False)

    combo = relationship("Combo", back_populates="legacy_mappings")


class Order(Base):
    __tablename__ = "orders"

    order_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=False)
    address_id = Column(Integer, ForeignKey("addresses.address_id"), nullable=False)
    total_price = Column(DECIMAL(10, 2), nullable=False)
    status = Column(String(50), nullable=True, default="Confirmed")
    payment_method = Column(String(50), nullable=False)
    order_date = Column(Date, nullable=True)
    discount = Column(DECIMAL(10, 2), nullable=True, default=0.00)
    cgst = Column(DECIMAL(10, 2), nullable=True, default=0.00)
    sgst = Column(DECIMAL(10, 2), nullable=True, default=0.00)
    delivery_charge = Column(DECIMAL(10, 2), nullable=False, default=0.00)
    created_at = Column(TIMESTAMP, nullable=True)
    order_type = Column(String(50), nullable=True, default="one_time")
    paid = Column(Boolean, nullable=True)

    customer = relationship("Customer", back_populates="orders")
    address = relationship("Address", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order")


class MenuItem(Base):
    __tablename__ = "menu_items"

    menu_item_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    menu_id = Column(Integer, ForeignKey("menu.menu_id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.item_id"), nullable=True)
    combo_id = Column(Integer, ForeignKey("combos.combo_id"), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.category_id"), nullable=True)
    max_qty = Column(Integer, nullable=True)
    rate = Column(DECIMAL(10, 2), nullable=False)
    discount_pct = Column(DECIMAL(5, 2), nullable=True)
    is_default = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=True)
    available_qty = Column(Integer, nullable=False, default=0)
    buffer_qty = Column(DECIMAL(10, 2), nullable=True, default=0)
    final_qty = Column(DECIMAL(10, 2), nullable=True, default=0)

    menu = relationship("Menu", back_populates="menu_items")
    item = relationship("Item", back_populates="menu_items")
    combo = relationship("Combo", back_populates="menu_items")
    category = relationship("Category", back_populates="menu_items")
    order_items = relationship("OrderItem", back_populates="menu_item")


class OrderItem(Base):
    __tablename__ = "order_items"

    order_item_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.order_id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.item_id"), nullable=True)
    combo_id = Column(Integer, ForeignKey("combos.combo_id"), nullable=True)
    menu_item_id = Column(
        Integer,
        ForeignKey("menu_items.menu_item_id", ondelete="SET NULL"),
        nullable=True,
    )
    meal_type = Column(String(50), nullable=True)
    quantity = Column(Integer, nullable=False)
    price = Column(DECIMAL(10, 2), nullable=False)

    order = relationship("Order", back_populates="order_items")
    item = relationship("Item", back_populates="order_items")
    combo = relationship("Combo", back_populates="order_items")
    menu_item = relationship("MenuItem", back_populates="order_items")


class PlatedItem(Base):
    __tablename__ = "plated_items"

    plated_item_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("items.item_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False)

    item = relationship("Item", back_populates="plated_items")
    components = relationship("PlatedItemComponent", back_populates="plated_item")


class PlatedItemComponent(Base):
    __tablename__ = "plated_item_components"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    plated_item_id = Column(
        Integer,
        ForeignKey("plated_items.plated_item_id", ondelete="CASCADE"),
        nullable=False,
    )
    component_item_id = Column(Integer, ForeignKey("items.item_id"), nullable=True)
    component_type_id = Column(Integer, nullable=True)
    quantity = Column(DECIMAL(10, 3), nullable=False, default=1.000)
    sort_order = Column(Integer, nullable=True)
    created_at = Column(TIMESTAMP, nullable=False)

    plated_item = relationship("PlatedItem", back_populates="components")
    component_item = relationship(
        "Item",
        back_populates="plated_component_links",
        foreign_keys=[component_item_id],
    )


class AdminLog(Base):
    __tablename__ = "admin_logs"

    log_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    admin_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=False)
    action_type = Column(
        Enum("ADD", "UPDATE", "DELETE", name="admin_log_action_type_enum"),
        nullable=False,
    )
    entity_type = Column(
        Enum("ITEM", "COMBO", "ADDON", "CATEGORY", name="admin_log_entity_type_enum"),
        nullable=False,
    )
    entity_id = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    timestamp = Column(TIMESTAMP, nullable=True)

    admin = relationship("Customer", back_populates="admin_logs")


class ItemDiscount(Base):
    __tablename__ = "item_discounts"

    discount_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("items.item_id"), nullable=False)
    city_code = Column(String(20), nullable=False)
    from_date = Column(Date, nullable=False)
    to_date = Column(Date, nullable=True)
    discount_pct = Column(DECIMAL(5, 2), nullable=False)
    created_at = Column(TIMESTAMP, nullable=True)

    item = relationship("Item")


class DiscountCode(Base):
    """Discount code — one code per rule, applied optionally at order time."""

    __tablename__ = "discount_codes"

    code_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(50), nullable=False)
    name = Column(String(200), nullable=False)
    discount_pct = Column(DECIMAL(5, 2), nullable=False)
    city_code = Column(String(20), nullable=False)
    from_date = Column(Date, nullable=False)
    to_date = Column(Date, nullable=True)
    max_uses = Column(Integer, nullable=True)
    use_count = Column(Integer, nullable=False, default=0)
    is_active = Column(Integer, nullable=False, default=1)
    created_at = Column(TIMESTAMP, nullable=True)
    updated_at = Column(TIMESTAMP, nullable=True)

    conditions = relationship(
        "DiscountCodeCondition", back_populates="discount_code", cascade="all, delete-orphan"
    )


class DiscountCodeCondition(Base):
    """Targeting condition for a discount code (OR logic — any match fires the discount)."""

    __tablename__ = "discount_code_conditions"

    condition_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code_id = Column(Integer, ForeignKey("discount_codes.code_id"), nullable=False)
    dimension = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=True)
    entity_label = Column(String(100), nullable=True)

    discount_code = relationship("DiscountCode", back_populates="conditions")
