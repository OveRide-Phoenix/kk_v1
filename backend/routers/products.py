"""Products router: items, combos, plated-items, addons, categories, component-types."""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional, Set

import mysql.connector
from mysql.connector import errorcode
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from ..db import get_raw_db
from ..utils.auth_deps import admin_required
from ..utils.helpers import (
    CONDIMENTS_BLD_TYPE,
    _is_condiment_from_blds,
    _ensure_valid_meal_combination,
    _validate_bld_ids,
    get_item_blds,
    set_item_blds,
    attach_bld_ids,
    get_combo_blds,
    set_combo_blds,
    attach_combo_bld_ids,
    attach_plated_flags,
    resolve_bld_id,
    _resolve_category_id_by_name,
    ensure_component_type_ids_exist,
    _ensure_component_type_required_for_item,
    _fetch_item_detail,
    _normalize_item_payload_data,
    _item_column_field_map,
)
from ..utils.combos import (
    ensure_category_exists,
    ensure_item_ids_exist,
    fetch_combo_detail,
    fetch_combos_with_items,
    normalize_combo_items,
)
from ..utils.plated_items import (
    fetch_plated_item_detail,
    fetch_plated_items_with_components,
    normalize_plated_components,
)
from ..utils.logger import log_admin_action

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class ItemCreatePayload(BaseModel):
    """Payload for creating a new product item."""

    name: str
    uom_customer: str
    bld_ids: List[int]
    description: Optional[str] = None
    alias: Optional[str] = None
    category_id: Optional[int] = None
    component_type_id: Optional[int] = None
    unit_packing: Optional[float] = None
    uom_packing: Optional[str] = None
    hsn_code: Optional[str] = None
    uom_production: Optional[str] = None
    packing_to_production_rate: Optional[float] = None
    buffer_percentage: Optional[float] = None
    max_qty_breakfast: Optional[int] = None
    max_qty_lunch: Optional[int] = None
    max_qty_dinner: Optional[int] = None
    max_qty_condiments: Optional[int] = None
    picture_url: Optional[str] = None
    breakfast_price: Optional[float] = None
    lunch_price: Optional[float] = None
    dinner_price: Optional[float] = None
    condiments_price: Optional[float] = None
    festival_price: Optional[float] = None
    cgst: Optional[float] = None
    sgst: Optional[float] = None
    igst: Optional[float] = None
    net_price: Optional[float] = None
    is_combo: Optional[bool] = None


class ItemUpdatePayload(BaseModel):
    """Payload for updating an existing product item (all fields optional)."""

    name: Optional[str] = None
    description: Optional[str] = None
    alias: Optional[str] = None
    category_id: Optional[int] = None
    component_type_id: Optional[int] = None
    uom_customer: Optional[str] = None
    unit_packing: Optional[float] = None
    uom_packing: Optional[str] = None
    hsn_code: Optional[str] = None
    uom_production: Optional[str] = None
    packing_to_production_rate: Optional[float] = None
    buffer_percentage: Optional[float] = None
    max_qty_breakfast: Optional[int] = None
    max_qty_lunch: Optional[int] = None
    max_qty_dinner: Optional[int] = None
    max_qty_condiments: Optional[int] = None
    picture_url: Optional[str] = None
    breakfast_price: Optional[float] = None
    lunch_price: Optional[float] = None
    dinner_price: Optional[float] = None
    condiments_price: Optional[float] = None
    festival_price: Optional[float] = None
    cgst: Optional[float] = None
    sgst: Optional[float] = None
    igst: Optional[float] = None
    net_price: Optional[float] = None
    is_combo: Optional[bool] = None
    bld_ids: Optional[List[int]] = None


class ComboItemPayload(BaseModel):
    """Payload for a single item entry within a combo."""

    item_id: Optional[int] = None
    component_type_id: Optional[int] = None
    quantity: int = Field(1, ge=1)


class ComboCreatePayload(BaseModel):
    """Payload for creating a new combo product."""

    combo_name: str
    price: float = Field(ge=0)
    category_id: int
    bld_ids: List[int] = Field(default_factory=list)
    items: List[ComboItemPayload] = Field(default_factory=list)


class ComboUpdatePayload(BaseModel):
    """Payload for updating an existing combo (all fields optional)."""

    combo_name: Optional[str] = None
    price: Optional[float] = Field(default=None, ge=0)
    category_id: Optional[int] = None
    bld_ids: Optional[List[int]] = None
    items: Optional[List[ComboItemPayload]] = None


class PlatedItemComponentPayload(BaseModel):
    """Payload for a single component within a plated item."""

    item_id: Optional[int] = None
    component_type_id: Optional[int] = None
    quantity: float = Field(1, gt=0)


class PlatedItemCreatePayload(BaseModel):
    """Payload for creating a new plated item with components."""

    name: str
    uom_customer: str
    bld_ids: List[int]
    components: List[PlatedItemComponentPayload] = Field(default_factory=list)
    description: Optional[str] = None
    alias: Optional[str] = None
    category_id: Optional[int] = None
    unit_packing: Optional[float] = None
    uom_packing: Optional[str] = None
    hsn_code: Optional[str] = None
    uom_production: Optional[str] = None
    packing_to_production_rate: Optional[float] = None
    buffer_percentage: Optional[float] = None
    max_qty_breakfast: Optional[int] = None
    max_qty_lunch: Optional[int] = None
    max_qty_dinner: Optional[int] = None
    max_qty_condiments: Optional[int] = None
    picture_url: Optional[str] = None
    breakfast_price: Optional[float] = None
    lunch_price: Optional[float] = None
    dinner_price: Optional[float] = None
    condiments_price: Optional[float] = None
    festival_price: Optional[float] = None
    cgst: Optional[float] = None
    sgst: Optional[float] = None
    igst: Optional[float] = None
    net_price: Optional[float] = None


class PlatedItemUpdatePayload(BaseModel):
    """Payload for updating an existing plated item (all fields optional)."""

    name: Optional[str] = None
    uom_customer: Optional[str] = None
    bld_ids: Optional[List[int]] = None
    components: Optional[List[PlatedItemComponentPayload]] = None
    description: Optional[str] = None
    alias: Optional[str] = None
    category_id: Optional[int] = None
    unit_packing: Optional[float] = None
    uom_packing: Optional[str] = None
    hsn_code: Optional[str] = None
    uom_production: Optional[str] = None
    packing_to_production_rate: Optional[float] = None
    buffer_percentage: Optional[float] = None
    max_qty_breakfast: Optional[int] = None
    max_qty_lunch: Optional[int] = None
    max_qty_dinner: Optional[int] = None
    max_qty_condiments: Optional[int] = None
    picture_url: Optional[str] = None
    breakfast_price: Optional[float] = None
    lunch_price: Optional[float] = None
    dinner_price: Optional[float] = None
    condiments_price: Optional[float] = None
    festival_price: Optional[float] = None
    cgst: Optional[float] = None
    sgst: Optional[float] = None
    igst: Optional[float] = None
    net_price: Optional[float] = None


class CategoryCreatePayload(BaseModel):
    """Payload for creating a new product category."""

    category_name: str = Field(..., min_length=1, max_length=100)


class CategoryUpdatePayload(BaseModel):
    """Payload for updating an existing product category."""

    category_name: str = Field(..., min_length=1, max_length=100)


class ComponentTypeCreatePayload(BaseModel):
    """Payload for creating a new component type."""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class ComponentTypeUpdatePayload(BaseModel):
    """Payload for updating an existing component type."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


# ---------------------------------------------------------------------------
# Items endpoints
# ---------------------------------------------------------------------------


@router.get("/api/products/items")
def get_all_items(
    only_condiments: Optional[bool] = Query(
        None,
        description="When true, returns only condiment items",
        alias="only_condiments",
    ),
    include_plated: Optional[bool] = Query(
        False,
        description="When true, includes plated items in the items response",
        alias="include_plated",
    ),
) -> List[Dict[str, Any]]:
    """Return all product items, with optional filters for condiments and plated items.

    Args:
        only_condiments: When true, returns only condiment items.
        include_plated: When true, includes plated items in the response.

    Returns:
        List of item dicts with bld_ids, is_condiment, and is_plated flags.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SHOW COLUMNS FROM items")
        available_columns = {row["Field"] for row in cursor.fetchall()}
        try:
            condiments_bld_id = resolve_bld_id(cursor, CONDIMENTS_BLD_TYPE)
        except HTTPException:
            condiments_bld_id = None

        has_meal_specific_max = {
            "max_qty_breakfast",
            "max_qty_lunch",
            "max_qty_dinner",
        }.issubset(available_columns)
        has_legacy_max = "max_qty" in available_columns
        has_condiment_max = "max_qty_condiments" in available_columns

        max_columns_sql: List[str] = []
        if has_meal_specific_max:
            max_columns_sql.extend(
                [
                    "i.max_qty_breakfast",
                    "i.max_qty_lunch",
                    "i.max_qty_dinner",
                ]
            )
        elif has_legacy_max:
            max_columns_sql.extend(
                [
                    "i.max_qty AS max_qty_breakfast",
                    "i.max_qty AS max_qty_lunch",
                    "i.max_qty AS max_qty_dinner",
                ]
            )
        else:
            max_columns_sql.extend(
                [
                    "NULL AS max_qty_breakfast",
                    "NULL AS max_qty_lunch",
                    "NULL AS max_qty_dinner",
                ]
            )

        if has_condiment_max:
            max_columns_sql.append("i.max_qty_condiments")
        elif has_meal_specific_max:
            max_columns_sql.append("i.max_qty_dinner AS max_qty_condiments")
        elif has_legacy_max:
            max_columns_sql.append("i.max_qty AS max_qty_condiments")
        else:
            max_columns_sql.append("NULL AS max_qty_condiments")

        select_columns = [
            "i.item_id",
            "i.name",
            "i.description",
            "i.alias",
            "i.category_id",
            "c.category_name",
            "i.component_type_id",
            "ct.name AS component_type_name",
            "i.uom_customer",
            "i.uom_customer AS uom",
            "i.unit_packing",
            "i.uom_packing",
            "i.hsn_code",
            "i.uom_production",
            "i.packing_to_production_rate",
            "i.buffer_percentage",
            *max_columns_sql,
            "i.picture_url",
            "i.breakfast_price",
            "i.lunch_price",
            "i.dinner_price",
            "i.condiments_price",
            "i.festival_price",
            "i.cgst",
            "i.sgst",
            "i.igst",
            "i.net_price",
        ]

        select_sql = ",\n                    ".join(select_columns)
        cursor.execute(
            f"""
                SELECT
                    {select_sql}
                FROM items i
                LEFT JOIN categories c ON i.category_id = c.category_id
                LEFT JOIN component_types ct ON i.component_type_id = ct.component_type_id
            """
        )
        records = cursor.fetchall()

        attach_bld_ids(cursor, records)
        attach_plated_flags(cursor, records)
        normalized_records = []
        for row in records:
            row["is_condiment"] = _is_condiment_from_blds(row.get("bld_ids"), condiments_bld_id)
            if row.get("is_plated") and not include_plated:
                continue
            if only_condiments and not row["is_condiment"]:
                continue
            normalized_records.append(row)
        return normalized_records
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.post("/api/products/items")
def create_item(
    payload: ItemCreatePayload,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Create a new product item with meal assignments (BLD IDs).

    Args:
        payload: Item creation payload including name, uom_customer, bld_ids, and optional fields.
        user: Current admin user (injected).

    Returns:
        Dict with success flag, item_id, and created item object.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SHOW COLUMNS FROM items")
        available_columns = {row["Field"] for row in cursor.fetchall()}

        data = payload.model_dump()
        raw_bld_ids = data.pop("bld_ids", [])
        normalized_bld_ids = _validate_bld_ids(cursor, raw_bld_ids)

        try:
            condiments_bld_id = resolve_bld_id(cursor, CONDIMENTS_BLD_TYPE)
        except HTTPException:
            condiments_bld_id = None

        cleaned = _normalize_item_payload_data(data)

        if not cleaned.get("name"):
            raise HTTPException(status_code=400, detail="name is required")
        if not cleaned.get("uom_customer"):
            raise HTTPException(status_code=400, detail="uom_customer is required")

        is_condiment_item = _is_condiment_from_blds(normalized_bld_ids, condiments_bld_id)
        _ensure_valid_meal_combination(normalized_bld_ids, condiments_bld_id)

        if is_condiment_item and not cleaned.get("category_id"):
            snacks_category_id = _resolve_category_id_by_name(cursor, "Snacks")
            if snacks_category_id is not None:
                cleaned["category_id"] = snacks_category_id

        _ensure_component_type_required_for_item(
            is_condiment_item=is_condiment_item,
            component_type_id=cleaned.get("component_type_id"),
        )

        if cleaned.get("component_type_id") is not None:
            ensure_component_type_ids_exist(cursor, [cleaned.get("component_type_id")])

        if not normalized_bld_ids:
            raise HTTPException(status_code=400, detail="At least one meal assignment is required")

        field_map = _item_column_field_map(available_columns)

        columns: List[str] = []
        placeholders: List[str] = []
        values: List[Any] = []

        for field, column in field_map.items():
            if field not in cleaned:
                continue
            columns.append(column)
            placeholders.append("%s")
            values.append(cleaned[field])

        insert_query = (
            f"INSERT INTO items ({', '.join(columns)}) VALUES ({', '.join(placeholders)})"
        )
        cursor.execute(insert_query, values)
        item_id = cursor.lastrowid

        set_item_blds(cursor, item_id, normalized_bld_ids)

        created_item = _fetch_item_detail(cursor, item_id, available_columns)
        if created_item:
            created_item["bld_ids"] = get_item_blds(cursor, item_id)
            created_item["is_combo"] = bool(created_item.get("is_combo", False))
            created_item["is_condiment"] = _is_condiment_from_blds(
                created_item.get("bld_ids"), condiments_bld_id
            )

        db.commit()
        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="ADD",
            entity_type="ITEM",
            entity_id=item_id,
            description=f"Created item {item_id}",
        )

        return {
            "success": True,
            "item_id": item_id,
            "item": created_item,
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.put("/api/products/items/{item_id}")
def update_item(
    item_id: int,
    payload: ItemUpdatePayload,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Update an existing product item's fields and/or meal assignments.

    Args:
        item_id: ID of the item to update.
        payload: Fields to update (all optional).
        user: Current admin user (injected).

    Returns:
        Dict with success flag, updated item object, and list of updated fields.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SHOW COLUMNS FROM items")
        available_columns = {row["Field"] for row in cursor.fetchall()}

        cursor.execute(
            "SELECT item_id, component_type_id FROM items WHERE item_id = %s", (item_id,)
        )
        existing_item = cursor.fetchone()
        if not existing_item:
            raise HTTPException(status_code=404, detail="Item not found")

        try:
            condiments_bld_id = resolve_bld_id(cursor, CONDIMENTS_BLD_TYPE)
        except HTTPException:
            condiments_bld_id = None

        data = payload.model_dump(exclude_unset=True)
        raw_bld_ids = data.pop("bld_ids", [])
        normalized_bld_ids = _validate_bld_ids(cursor, raw_bld_ids)

        cleaned = _normalize_item_payload_data(data)

        is_condiment_item = _is_condiment_from_blds(
            (
                normalized_bld_ids
                if "bld_ids" in payload.model_fields_set
                else get_item_blds(cursor, item_id)
            ),
            condiments_bld_id,
        )
        if is_condiment_item and not cleaned.get("category_id"):
            snacks_category_id = _resolve_category_id_by_name(cursor, "Snacks")
            if snacks_category_id is not None:
                cleaned["category_id"] = snacks_category_id

        effective_component_type_id = (
            cleaned.get("component_type_id")
            if "component_type_id" in cleaned
            else existing_item.get("component_type_id")
        )
        _ensure_component_type_required_for_item(
            is_condiment_item=is_condiment_item,
            component_type_id=effective_component_type_id,
        )

        if cleaned.get("component_type_id") is not None:
            ensure_component_type_ids_exist(cursor, [cleaned.get("component_type_id")])

        field_map = _item_column_field_map(available_columns)

        set_clauses: List[str] = []
        values: List[Any] = []
        updated_fields: List[str] = []

        for field, column in field_map.items():
            if field not in cleaned:
                continue
            set_clauses.append(f"{column} = %s")
            values.append(cleaned[field])
            updated_fields.append(column)

        if set_clauses:
            values.append(item_id)
            update_query = f"UPDATE items SET {', '.join(set_clauses)} WHERE item_id = %s"
            cursor.execute(update_query, values)
            if cursor.rowcount == 0:
                cursor.execute("SELECT 1 FROM items WHERE item_id = %s", (item_id,))
                exists = cursor.fetchone()
                if not exists:
                    db.rollback()
                    raise HTTPException(status_code=404, detail="Item not found")
        else:
            cursor.execute("SELECT 1 FROM items WHERE item_id = %s", (item_id,))
            exists = cursor.fetchone()
            if not exists:
                db.rollback()
                raise HTTPException(status_code=404, detail="Item not found")

        set_item_blds(cursor, item_id, normalized_bld_ids)
        if "bld_ids" not in updated_fields:
            updated_fields.append("bld_ids")

        db.commit()

        updated_item = _fetch_item_detail(cursor, item_id, available_columns)

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="UPDATE",
            entity_type="ITEM",
            entity_id=item_id,
            description=f"Updated item {item_id}: {', '.join(updated_fields)}",
        )

        if updated_item:
            updated_item["bld_ids"] = get_item_blds(cursor, item_id)
        else:
            return {
                "success": True,
                "item_id": item_id,
                "updated_fields": updated_fields,
            }

        updated_item["is_combo"] = bool(updated_item.get("is_combo", False))
        updated_item["is_condiment"] = _is_condiment_from_blds(
            updated_item.get("bld_ids"), condiments_bld_id
        )

        return {
            "success": True,
            "item": updated_item,
            "updated_fields": updated_fields,
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


# ---------------------------------------------------------------------------
# Combos endpoints
# ---------------------------------------------------------------------------


@router.get("/api/products/combos")
def get_all_combos() -> List[Dict[str, Any]]:
    """Return all combo products with their items and BLD assignments.

    Returns:
        List of combo dicts with nested items and bld_ids.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        combos = fetch_combos_with_items(cursor)
        attach_combo_bld_ids(cursor, combos)
        return combos
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.post("/api/products/combos")
def create_combo(
    payload: ComboCreatePayload,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Create a new combo product with items and meal assignments.

    Args:
        payload: Combo creation payload including combo_name, price, category_id, bld_ids, items.
        user: Current admin user (injected).

    Returns:
        Created combo dict with nested items and bld_ids.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        normalized_name = payload.combo_name.strip()
        if not normalized_name:
            raise HTTPException(status_code=400, detail="combo_name is required")
        normalized_bld_ids = _validate_bld_ids(cursor, payload.bld_ids)
        if not normalized_bld_ids:
            raise HTTPException(status_code=400, detail="At least one meal assignment is required")
        try:
            condiments_bld_id = resolve_bld_id(cursor, CONDIMENTS_BLD_TYPE)
        except HTTPException:
            condiments_bld_id = None
        _ensure_valid_meal_combination(normalized_bld_ids, condiments_bld_id)
        ensure_category_exists(cursor, payload.category_id)
        normalized_items = normalize_combo_items(payload.items)
        ensure_item_ids_exist(
            cursor,
            (item["item_id"] for item in normalized_items if item.get("item_id") is not None),
        )
        ensure_component_type_ids_exist(
            cursor,
            (
                item["component_type_id"]
                for item in normalized_items
                if item.get("component_type_id") is not None
            ),
        )

        cursor.execute(
            "INSERT INTO combos (combo_name, price, category_id) VALUES (%s, %s, %s)",
            (normalized_name, float(payload.price), payload.category_id),
        )
        combo_id = cursor.lastrowid

        if normalized_items:
            values = [
                (combo_id, entry.get("item_id"), entry.get("component_type_id"), entry["quantity"])
                for entry in normalized_items
            ]
            cursor.executemany(
                "INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity) VALUES (%s, %s, %s, %s)",
                values,
            )

        set_combo_blds(cursor, combo_id, normalized_bld_ids)

        db.commit()

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="ADD",
            entity_type="COMBO",
            entity_id=combo_id,
            description=f"Created combo {combo_id}",
        )

        combo = fetch_combo_detail(cursor, combo_id)
        if combo:
            combo["bld_ids"] = get_combo_blds(cursor, combo_id)
        return combo or {"combo_id": combo_id}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.put("/api/products/combos/{combo_id}")
def update_combo(
    combo_id: int,
    payload: ComboUpdatePayload,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Update an existing combo product's fields, items, or meal assignments.

    Args:
        combo_id: ID of the combo to update.
        payload: Fields to update (all optional).
        user: Current admin user (injected).

    Returns:
        Updated combo dict with nested items and bld_ids.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT 1 FROM combos WHERE combo_id = %s", (combo_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Combo not found")

        fields: List[str] = []
        values: List[Any] = []

        if payload.combo_name is not None:
            normalized_name = payload.combo_name.strip()
            if not normalized_name:
                raise HTTPException(status_code=400, detail="combo_name cannot be empty")
            fields.append("combo_name = %s")
            values.append(normalized_name)
        if payload.price is not None:
            fields.append("price = %s")
            values.append(float(payload.price))
        if payload.category_id is not None:
            ensure_category_exists(cursor, payload.category_id)
            fields.append("category_id = %s")
            values.append(payload.category_id)

        normalized_bld_ids = None
        if payload.bld_ids is not None:
            normalized_bld_ids = _validate_bld_ids(cursor, payload.bld_ids)
            if not normalized_bld_ids:
                raise HTTPException(
                    status_code=400, detail="At least one meal assignment is required"
                )
            try:
                condiments_bld_id = resolve_bld_id(cursor, CONDIMENTS_BLD_TYPE)
            except HTTPException:
                condiments_bld_id = None
            _ensure_valid_meal_combination(normalized_bld_ids, condiments_bld_id)

        if fields:
            values.append(combo_id)
            cursor.execute(
                f"UPDATE combos SET {', '.join(fields)} WHERE combo_id = %s",
                values,
            )

        if payload.items is not None:
            normalized_items = normalize_combo_items(payload.items)
            ensure_item_ids_exist(
                cursor,
                (item["item_id"] for item in normalized_items if item.get("item_id") is not None),
            )
            ensure_component_type_ids_exist(
                cursor,
                (
                    item["component_type_id"]
                    for item in normalized_items
                    if item.get("component_type_id") is not None
                ),
            )
            cursor.execute("DELETE FROM combo_items WHERE combo_id = %s", (combo_id,))
            item_values = [
                (combo_id, entry.get("item_id"), entry.get("component_type_id"), entry["quantity"])
                for entry in normalized_items
            ]
            cursor.executemany(
                "INSERT INTO combo_items (combo_id, item_id, component_type_id, quantity) VALUES (%s, %s, %s, %s)",
                item_values,
            )

        if normalized_bld_ids is not None:
            set_combo_blds(cursor, combo_id, normalized_bld_ids)

        db.commit()

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="UPDATE",
            entity_type="COMBO",
            entity_id=combo_id,
            description=f"Updated combo {combo_id}",
        )

        combo = fetch_combo_detail(cursor, combo_id)
        if combo:
            combo["bld_ids"] = get_combo_blds(cursor, combo_id)
        return combo or {"combo_id": combo_id}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.delete("/api/products/combos/{combo_id}")
def delete_combo(
    combo_id: int,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Delete an existing combo product.

    Args:
        combo_id: ID of the combo to delete.
        user: Current admin user (injected).

    Returns:
        Dict with status and combo_id.
    """
    db = get_raw_db()
    cursor = db.cursor()
    try:
        cursor.execute("SELECT 1 FROM combos WHERE combo_id = %s", (combo_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Combo not found")

        cursor.execute("DELETE FROM combos WHERE combo_id = %s", (combo_id,))
        db.commit()

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="DELETE",
            entity_type="COMBO",
            entity_id=combo_id,
            description=f"Deleted combo {combo_id}",
        )

        return {"status": "deleted", "combo_id": combo_id}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


# ---------------------------------------------------------------------------
# Plated items endpoints
# ---------------------------------------------------------------------------


@router.get("/api/products/plated-items")
def get_all_plated_items() -> List[Dict[str, Any]]:
    """Return all plated items with their components, BLD assignments, and condiment flags.

    Returns:
        List of plated item dicts with nested components, bld_ids, and is_condiment.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        records = fetch_plated_items_with_components(cursor)
        attach_bld_ids(cursor, records)
        try:
            condiments_bld_id = resolve_bld_id(cursor, CONDIMENTS_BLD_TYPE)
        except HTTPException:
            condiments_bld_id = None
        for row in records:
            row["is_condiment"] = _is_condiment_from_blds(row.get("bld_ids"), condiments_bld_id)
        return records
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.post("/api/products/plated-items")
def create_plated_item(
    payload: PlatedItemCreatePayload,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Create a new plated item with components and meal assignments.

    Args:
        payload: Plated item payload including name, uom_customer, bld_ids, and components.
        user: Current admin user (injected).

    Returns:
        Dict with success flag, item_id, and created plated item object.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SHOW COLUMNS FROM items")
        available_columns = {row["Field"] for row in cursor.fetchall()}

        data = payload.model_dump()
        raw_bld_ids = data.pop("bld_ids", [])
        raw_components = data.pop("components", [])
        normalized_bld_ids = _validate_bld_ids(cursor, raw_bld_ids)
        normalized_components = normalize_plated_components(raw_components)
        ensure_item_ids_exist(
            cursor,
            (item["item_id"] for item in normalized_components if item.get("item_id") is not None),
        )
        ensure_component_type_ids_exist(
            cursor,
            (
                item["component_type_id"]
                for item in normalized_components
                if item.get("component_type_id") is not None
            ),
        )

        cleaned = _normalize_item_payload_data(data)
        cleaned["is_combo"] = 0

        if not cleaned.get("name"):
            raise HTTPException(status_code=400, detail="name is required")
        if not cleaned.get("uom_customer"):
            raise HTTPException(status_code=400, detail="uom_customer is required")
        if not normalized_bld_ids:
            raise HTTPException(status_code=400, detail="At least one meal assignment is required")

        try:
            condiments_bld_id = resolve_bld_id(cursor, CONDIMENTS_BLD_TYPE)
        except HTTPException:
            condiments_bld_id = None
        _ensure_valid_meal_combination(normalized_bld_ids, condiments_bld_id)

        field_map = _item_column_field_map(available_columns)
        columns: List[str] = []
        placeholders: List[str] = []
        values: List[Any] = []
        for field, column in field_map.items():
            if field not in cleaned:
                continue
            columns.append(column)
            placeholders.append("%s")
            values.append(cleaned[field])

        cursor.execute(
            f"INSERT INTO items ({', '.join(columns)}) VALUES ({', '.join(placeholders)})",
            values,
        )
        item_id = cursor.lastrowid
        set_item_blds(cursor, item_id, normalized_bld_ids)

        cursor.execute(
            "INSERT INTO plated_items (item_id) VALUES (%s)",
            (item_id,),
        )
        plated_item_id = cursor.lastrowid

        cursor.executemany(
            """
            INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity)
            VALUES (%s, %s, %s, %s)
            """,
            [
                (
                    plated_item_id,
                    component.get("item_id"),
                    component.get("component_type_id"),
                    component["quantity"],
                )
                for component in normalized_components
            ],
        )

        db.commit()

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="ADD",
            entity_type="ITEM",
            entity_id=item_id,
            description=f"Created plated item {item_id}",
        )

        plated_item = fetch_plated_item_detail(cursor, item_id)
        if plated_item:
            plated_item["bld_ids"] = get_item_blds(cursor, item_id)
            plated_item["is_condiment"] = _is_condiment_from_blds(
                plated_item.get("bld_ids"), condiments_bld_id
            )

        return {
            "success": True,
            "item_id": item_id,
            "item": plated_item,
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.put("/api/products/plated-items/{item_id}")
def update_plated_item(
    item_id: int,
    payload: PlatedItemUpdatePayload,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Update an existing plated item's fields, components, or meal assignments.

    Args:
        item_id: ID of the plated item to update.
        payload: Fields to update (all optional).
        user: Current admin user (injected).

    Returns:
        Dict with success flag, updated plated item object, and list of updated fields.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SHOW COLUMNS FROM items")
        available_columns = {row["Field"] for row in cursor.fetchall()}
        cursor.execute(
            "SELECT plated_item_id FROM plated_items WHERE item_id = %s LIMIT 1",
            (item_id,),
        )
        plated_row = cursor.fetchone()
        if not plated_row:
            raise HTTPException(status_code=404, detail="Plated item not found")

        data = payload.model_dump(exclude_unset=True)
        raw_bld_ids = data.pop("bld_ids", None)
        raw_components = data.pop("components", None)
        normalized_bld_ids = (
            _validate_bld_ids(cursor, raw_bld_ids) if raw_bld_ids is not None else None
        )
        normalized_components = (
            normalize_plated_components(raw_components) if raw_components is not None else None
        )
        if normalized_components is not None:
            ensure_item_ids_exist(
                cursor,
                (
                    item["item_id"]
                    for item in normalized_components
                    if item.get("item_id") is not None
                ),
            )
            ensure_component_type_ids_exist(
                cursor,
                (
                    item["component_type_id"]
                    for item in normalized_components
                    if item.get("component_type_id") is not None
                ),
            )

        cleaned = _normalize_item_payload_data(data)
        field_map = _item_column_field_map(available_columns)

        assignments: List[str] = []
        values: List[Any] = []
        updated_fields: List[str] = []
        for field, column in field_map.items():
            if field not in cleaned:
                continue
            assignments.append(f"{column} = %s")
            values.append(cleaned[field])
            updated_fields.append(column)

        if assignments:
            values.append(item_id)
            cursor.execute(
                f"UPDATE items SET {', '.join(assignments)} WHERE item_id = %s",
                values,
            )

        try:
            condiments_bld_id = resolve_bld_id(cursor, CONDIMENTS_BLD_TYPE)
        except HTTPException:
            condiments_bld_id = None
        if normalized_bld_ids is not None:
            _ensure_valid_meal_combination(normalized_bld_ids, condiments_bld_id)
            set_item_blds(cursor, item_id, normalized_bld_ids)
            updated_fields.append("bld_ids")

        if normalized_components is not None:
            cursor.execute(
                "DELETE FROM plated_item_components WHERE plated_item_id = %s",
                (plated_row["plated_item_id"],),
            )
            cursor.executemany(
                """
                INSERT INTO plated_item_components (plated_item_id, component_item_id, component_type_id, quantity)
                VALUES (%s, %s, %s, %s)
                """,
                [
                    (
                        plated_row["plated_item_id"],
                        component.get("item_id"),
                        component.get("component_type_id"),
                        component["quantity"],
                    )
                    for component in normalized_components
                ],
            )
            updated_fields.append("components")

        db.commit()

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="UPDATE",
            entity_type="ITEM",
            entity_id=item_id,
            description=f"Updated plated item {item_id}: {', '.join(updated_fields) if updated_fields else 'no fields'}",
        )

        plated_item = fetch_plated_item_detail(cursor, item_id)
        if plated_item:
            plated_item["bld_ids"] = get_item_blds(cursor, item_id)
            plated_item["is_condiment"] = _is_condiment_from_blds(
                plated_item.get("bld_ids"), condiments_bld_id
            )

        return {
            "success": True,
            "item": plated_item,
            "updated_fields": updated_fields,
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.delete("/api/products/plated-items/{item_id}")
def delete_plated_item(
    item_id: int,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Delete an existing plated item and its base item record.

    Args:
        item_id: ID of the plated item to delete.
        user: Current admin user (injected).

    Returns:
        Dict with status and item_id.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT plated_item_id FROM plated_items WHERE item_id = %s LIMIT 1",
            (item_id,),
        )
        plated_row = cursor.fetchone()
        if not plated_row:
            raise HTTPException(status_code=404, detail="Plated item not found")

        cursor.execute(
            "DELETE FROM plated_items WHERE plated_item_id = %s",
            (plated_row["plated_item_id"],),
        )
        cursor.execute("DELETE FROM items WHERE item_id = %s", (item_id,))

        db.commit()

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="DELETE",
            entity_type="ITEM",
            entity_id=item_id,
            description=f"Deleted plated item {item_id}",
        )

        return {"status": "deleted", "item_id": item_id}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


# ---------------------------------------------------------------------------
# Addons endpoint
# ---------------------------------------------------------------------------


@router.get("/api/products/addons")
def get_all_addons() -> List[Dict[str, Any]]:
    """Return all item add-ons with their main and add-on item names.

    Returns:
        List of add-on dicts with add_on_id, main_item_name, add_on_item_name,
        is_mandatory, and max_quantity.
    """
    db = get_raw_db()
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


# ---------------------------------------------------------------------------
# Categories endpoints
# ---------------------------------------------------------------------------


@router.get("/api/products/categories")
def get_all_categories() -> List[Dict[str, Any]]:
    """Return all product categories.

    Returns:
        List of category dicts with category_id and category_name.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT category_id, category_name FROM categories")
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.post("/api/products/categories")
def create_category(
    payload: CategoryCreatePayload,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Create a new product category.

    Args:
        payload: Category creation payload with category_name.
        user: Current admin user (injected).

    Returns:
        Dict with category_id and category_name.
    """
    db = get_raw_db()
    cursor = db.cursor()
    try:
        normalized_name = payload.category_name.strip()
        if not normalized_name:
            raise HTTPException(status_code=400, detail="category_name is required")

        cursor.execute(
            "INSERT INTO categories (category_name) VALUES (%s)",
            (normalized_name,),
        )
        category_id = cursor.lastrowid
        db.commit()

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="ADD",
            entity_type="CATEGORY",
            entity_id=category_id,
            description=f"Created category {category_id}",
        )

        return {"category_id": category_id, "category_name": normalized_name}
    except mysql.connector.Error as err:
        db.rollback()
        if err.errno == errorcode.ER_DUP_ENTRY:
            raise HTTPException(status_code=400, detail="Category already exists")
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.put("/api/products/categories/{category_id}")
def update_category(
    category_id: int,
    payload: CategoryUpdatePayload,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Update an existing product category's name.

    Args:
        category_id: ID of the category to update.
        payload: Payload with new category_name.
        user: Current admin user (injected).

    Returns:
        Dict with category_id and updated category_name.
    """
    db = get_raw_db()
    cursor = db.cursor()
    try:
        cursor.execute("SELECT 1 FROM categories WHERE category_id = %s", (category_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Category not found")

        normalized_name = payload.category_name.strip()
        if not normalized_name:
            raise HTTPException(status_code=400, detail="category_name is required")

        cursor.execute(
            "UPDATE categories SET category_name = %s WHERE category_id = %s",
            (normalized_name, category_id),
        )
        db.commit()

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="UPDATE",
            entity_type="CATEGORY",
            entity_id=category_id,
            description=f"Updated category {category_id}",
        )

        return {"category_id": category_id, "category_name": normalized_name}
    except mysql.connector.Error as err:
        db.rollback()
        if err.errno == errorcode.ER_DUP_ENTRY:
            raise HTTPException(status_code=400, detail="Category already exists")
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.delete("/api/products/categories/{category_id}")
def delete_category(
    category_id: int,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Delete an existing product category.

    Args:
        category_id: ID of the category to delete.
        user: Current admin user (injected).

    Returns:
        Dict with status and category_id.
    """
    db = get_raw_db()
    cursor = db.cursor()
    try:
        cursor.execute("SELECT 1 FROM categories WHERE category_id = %s", (category_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Category not found")

        cursor.execute("DELETE FROM categories WHERE category_id = %s", (category_id,))
        db.commit()

        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="DELETE",
            entity_type="CATEGORY",
            entity_id=category_id,
            description=f"Deleted category {category_id}",
        )

        return {"status": "deleted", "category_id": category_id}
    except mysql.connector.Error as err:
        db.rollback()
        if (
            err.errno == errorcode.ER_ROW_IS_REFERENCED
            or err.errno == errorcode.ER_ROW_IS_REFERENCED_2
        ):
            raise HTTPException(status_code=400, detail="Category is in use and cannot be deleted")
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


# ---------------------------------------------------------------------------
# Component types endpoints
# ---------------------------------------------------------------------------


@router.get("/api/products/component-types")
def get_all_component_types() -> List[Dict[str, Any]]:
    """Return all active component types.

    Returns:
        List of component type dicts with component_type_id, name, description, is_active.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT component_type_id, name, description, is_active
              FROM component_types
             WHERE is_active = 1
             ORDER BY name ASC
            """)
        rows = cursor.fetchall() or []
        for row in rows:
            row["is_active"] = bool(row.get("is_active", True))
        return rows
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.post("/api/products/component-types")
def create_component_type(
    payload: ComponentTypeCreatePayload,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Create a new component type.

    Args:
        payload: Component type payload with name and optional description.
        user: Current admin user (injected).

    Returns:
        Dict with component_type_id, name, description, and is_active.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        name = (payload.name or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="name is required")
        description = (payload.description or "").strip() or None
        cursor.execute(
            """
            INSERT INTO component_types (name, description, is_active)
            VALUES (%s, %s, 1)
            """,
            (name, description),
        )
        component_type_id = cursor.lastrowid
        db.commit()
        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="ADD",
            entity_type="COMPONENT_TYPE",
            entity_id=component_type_id,
            description=f"Created component type {component_type_id}",
        )
        return {
            "component_type_id": component_type_id,
            "name": name,
            "description": description,
            "is_active": True,
        }
    except mysql.connector.Error as err:
        db.rollback()
        if err.errno == errorcode.ER_DUP_ENTRY:
            raise HTTPException(status_code=400, detail="Component type already exists")
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.put("/api/products/component-types/{component_type_id}")
def update_component_type(
    component_type_id: int,
    payload: ComponentTypeUpdatePayload,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Update an existing component type's name, description, or active status.

    Args:
        component_type_id: ID of the component type to update.
        payload: Fields to update (name, description, is_active — all optional).
        user: Current admin user (injected).

    Returns:
        Updated component type dict.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT 1 FROM component_types WHERE component_type_id = %s",
            (component_type_id,),
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Component type not found")

        updates: List[str] = []
        values: List[Any] = []
        if payload.name is not None:
            name = payload.name.strip()
            if not name:
                raise HTTPException(status_code=400, detail="name is required")
            updates.append("name = %s")
            values.append(name)
        if payload.description is not None:
            updates.append("description = %s")
            values.append((payload.description or "").strip() or None)
        if payload.is_active is not None:
            updates.append("is_active = %s")
            values.append(1 if payload.is_active else 0)
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        values.append(component_type_id)
        cursor.execute(
            f"UPDATE component_types SET {', '.join(updates)} WHERE component_type_id = %s",
            values,
        )
        db.commit()
        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="UPDATE",
            entity_type="COMPONENT_TYPE",
            entity_id=component_type_id,
            description=f"Updated component type {component_type_id}",
        )
        cursor.execute(
            """
            SELECT component_type_id, name, description, is_active
              FROM component_types
             WHERE component_type_id = %s
            """,
            (component_type_id,),
        )
        row = cursor.fetchone()
        if row:
            row["is_active"] = bool(row.get("is_active", True))
        return row or {"component_type_id": component_type_id}
    except mysql.connector.Error as err:
        db.rollback()
        if err.errno == errorcode.ER_DUP_ENTRY:
            raise HTTPException(status_code=400, detail="Component type already exists")
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()


@router.delete("/api/products/component-types/{component_type_id}")
def delete_component_type(
    component_type_id: int,
    user: Dict[str, Any] = Depends(admin_required),
) -> Dict[str, Any]:
    """Delete a component type if it is not referenced by any items, plated items, or combos.

    Args:
        component_type_id: ID of the component type to delete.
        user: Current admin user (injected).

    Returns:
        Dict with status and component_type_id.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT 1 FROM component_types WHERE component_type_id = %s",
            (component_type_id,),
        )
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Component type not found")
        cursor.execute(
            "SELECT 1 FROM items WHERE component_type_id = %s LIMIT 1",
            (component_type_id,),
        )
        if cursor.fetchone() is not None:
            raise HTTPException(
                status_code=400,
                detail="Component type is still assigned to one or more items",
            )
        cursor.execute(
            "SELECT 1 FROM plated_item_components WHERE component_type_id = %s LIMIT 1",
            (component_type_id,),
        )
        if cursor.fetchone() is not None:
            raise HTTPException(
                status_code=400,
                detail="Component type is still used in one or more plated items",
            )
        cursor.execute(
            "SELECT 1 FROM combo_items WHERE component_type_id = %s LIMIT 1",
            (component_type_id,),
        )
        if cursor.fetchone() is not None:
            raise HTTPException(
                status_code=400,
                detail="Component type is still used in one or more combos",
            )

        cursor.execute(
            "DELETE FROM component_types WHERE component_type_id = %s",
            (component_type_id,),
        )
        db.commit()
        log_admin_action(
            db,
            admin_id=user.get("admin_id") if isinstance(user, dict) else None,
            action_type="DELETE",
            entity_type="COMPONENT_TYPE",
            entity_id=component_type_id,
            description=f"Deleted component type {component_type_id}",
        )
        return {"status": "deleted", "component_type_id": component_type_id}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()
