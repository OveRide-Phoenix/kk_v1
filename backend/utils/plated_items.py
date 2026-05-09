from typing import Any, Dict, Iterable, List, Optional, Sequence

from fastapi import HTTPException


def _resolve_value(entry: Any, key: str) -> Any:
    if isinstance(entry, dict):
        return entry.get(key)
    return getattr(entry, key, None)


def _parse_positive_number(value: Any, field_name: str) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=400, detail=f"{field_name} must be a positive number"
        ) from None
    if parsed <= 0:
        raise HTTPException(status_code=400, detail=f"{field_name} must be a positive number")
    return parsed


def normalize_plated_components(
    items: Optional[Iterable[Any]],
    *,
    require_items: bool = True,
) -> List[Dict[str, Any]]:
    if items is None:
        return []

    normalized: List[Dict[str, Any]] = []
    seen: set[tuple[str, int]] = set()

    for index, entry in enumerate(items):
        item_id = _resolve_value(entry, "item_id")
        component_type_id = _resolve_value(entry, "component_type_id")
        quantity = _resolve_value(entry, "quantity")

        has_item_id = item_id is not None
        has_component_type_id = component_type_id is not None
        if has_item_id == has_component_type_id:
            raise HTTPException(
                status_code=400,
                detail=f"items[{index}] must include exactly one of item_id or component_type_id",
            )

        normalized_quantity = _parse_positive_number(
            1 if quantity is None else quantity,
            f"items[{index}].quantity",
        )

        if has_item_id:
            try:
                normalized_item_id = int(item_id)
            except (TypeError, ValueError):
                raise HTTPException(
                    status_code=400,
                    detail=f"items[{index}].item_id must be a positive integer",
                ) from None
            if normalized_item_id <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"items[{index}].item_id must be a positive integer",
                )
            dedupe_key = ("item", normalized_item_id)
            if dedupe_key in seen:
                raise HTTPException(
                    status_code=400,
                    detail=f"Duplicate item_id {normalized_item_id} in plated item payload",
                )
            seen.add(dedupe_key)
            normalized.append(
                {
                    "item_id": normalized_item_id,
                    "component_type_id": None,
                    "quantity": normalized_quantity,
                }
            )
            continue

        try:
            normalized_component_type_id = int(component_type_id)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=400,
                detail=f"items[{index}].component_type_id must be a positive integer",
            ) from None
        if normalized_component_type_id <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"items[{index}].component_type_id must be a positive integer",
            )
        dedupe_key = ("type", normalized_component_type_id)
        if dedupe_key in seen:
            raise HTTPException(
                status_code=400,
                detail=f"Duplicate component_type_id {normalized_component_type_id} in plated item payload",
            )
        seen.add(dedupe_key)
        normalized.append(
            {
                "item_id": None,
                "component_type_id": normalized_component_type_id,
                "quantity": normalized_quantity,
            }
        )

    if not normalized and require_items:
        raise HTTPException(
            status_code=400, detail="A plated item must include at least one component"
        )

    return normalized


def _fetch_plated_components(cursor, plated_ids: Sequence[int]) -> Dict[int, List[Dict[str, Any]]]:
    if not plated_ids:
        return {}
    placeholders = ", ".join(["%s"] * len(plated_ids))
    cursor.execute(
        f"""
        SELECT pic.plated_item_id,
               pic.component_item_id,
               pic.component_type_id,
               pic.quantity,
               i.name AS item_name,
               i.uom_customer,
               i.unit_packing,
               i.uom_packing,
               i.uom_production,
               ct.name AS component_type_name
          FROM plated_item_components pic
          LEFT JOIN items i ON pic.component_item_id = i.item_id
          LEFT JOIN component_types ct ON pic.component_type_id = ct.component_type_id
         WHERE pic.plated_item_id IN ({placeholders})
         ORDER BY pic.plated_item_id ASC, pic.id ASC
        """,
        tuple(plated_ids),
    )
    rows = cursor.fetchall() or []
    plated_component_map: Dict[int, List[Dict[str, Any]]] = {}
    for row in rows:
        plated_item_id = row.get("plated_item_id")
        component_item_id = row.get("component_item_id")
        component_type_id = row.get("component_type_id")
        if plated_item_id is None:
            continue
        plated_component_map.setdefault(plated_item_id, []).append(
            {
                "kind": "item" if component_item_id is not None else "type",
                "itemId": int(component_item_id) if component_item_id is not None else None,
                "componentTypeId": (
                    int(component_type_id) if component_type_id is not None else None
                ),
                "name": row.get("item_name") or row.get("component_type_name"),
                "componentTypeName": row.get("component_type_name"),
                "quantity": float(row.get("quantity") or 0),
                "uomCustomer": row.get("uom_customer"),
                "unitPacking": (
                    float(row.get("unit_packing") or 0)
                    if row.get("unit_packing") is not None
                    else None
                ),
                "uomPacking": row.get("uom_packing"),
                "uomProduction": row.get("uom_production"),
            }
        )
    return plated_component_map


def fetch_plated_item_detail(cursor, item_id: int) -> Optional[Dict[str, Any]]:
    cursor.execute(
        """
        SELECT pi.plated_item_id,
               pi.item_id,
               i.name,
               i.description,
               i.alias,
               i.category_id,
               c.category_name,
               i.component_type_id,
               ct.name AS component_type_name,
               i.uom_customer,
               i.unit_packing,
               i.uom_packing,
               i.hsn_code,
               i.uom_production,
               i.packing_to_production_rate,
               i.buffer_percentage,
               i.max_qty_breakfast,
               i.max_qty_lunch,
               i.max_qty_dinner,
               i.max_qty_condiments,
               i.picture_url,
               i.breakfast_price,
               i.lunch_price,
               i.dinner_price,
               i.condiments_price,
               i.festival_price,
               i.cgst,
               i.sgst,
               i.igst,
               i.net_price
          FROM plated_items pi
          JOIN items i ON pi.item_id = i.item_id
          LEFT JOIN categories c ON i.category_id = c.category_id
          LEFT JOIN component_types ct ON i.component_type_id = ct.component_type_id
         WHERE pi.item_id = %s
         LIMIT 1
        """,
        (item_id,),
    )
    plated_item = cursor.fetchone()
    if not plated_item:
        return None

    plated_item["is_plated"] = True
    plated_item["uom"] = plated_item.get("uom_customer")
    plated_item["packing_to_production_rate"] = (
        float(plated_item["packing_to_production_rate"])
        if plated_item.get("packing_to_production_rate") is not None
        else None
    )
    if plated_item.get("unit_packing") is not None:
        plated_item["unit_packing"] = float(plated_item["unit_packing"])
    plated_item["platedComponents"] = _fetch_plated_components(
        cursor, [int(plated_item["plated_item_id"])]
    ).get(int(plated_item["plated_item_id"]), [])
    return plated_item


def fetch_plated_items_with_components(cursor) -> List[Dict[str, Any]]:
    cursor.execute("""
        SELECT pi.plated_item_id,
               pi.item_id,
               i.name,
               i.description,
               i.alias,
               i.category_id,
               c.category_name,
               i.component_type_id,
               ct.name AS component_type_name,
               i.uom_customer,
               i.unit_packing,
               i.uom_packing,
               i.hsn_code,
               i.uom_production,
               i.packing_to_production_rate,
               i.buffer_percentage,
               i.max_qty_breakfast,
               i.max_qty_lunch,
               i.max_qty_dinner,
               i.max_qty_condiments,
               i.picture_url,
               i.breakfast_price,
               i.lunch_price,
               i.dinner_price,
               i.condiments_price,
               i.festival_price,
               i.cgst,
               i.sgst,
               i.igst,
               i.net_price
          FROM plated_items pi
          JOIN items i ON pi.item_id = i.item_id
          LEFT JOIN categories c ON i.category_id = c.category_id
          LEFT JOIN component_types ct ON i.component_type_id = ct.component_type_id
         ORDER BY i.name ASC
        """)
    plated_items = cursor.fetchall() or []
    plated_ids = [
        int(row["plated_item_id"]) for row in plated_items if row.get("plated_item_id") is not None
    ]
    component_map = _fetch_plated_components(cursor, plated_ids)
    for row in plated_items:
        row["is_plated"] = True
        row["uom"] = row.get("uom_customer")
        row["packing_to_production_rate"] = (
            float(row["packing_to_production_rate"])
            if row.get("packing_to_production_rate") is not None
            else None
        )
        if row.get("unit_packing") is not None:
            row["unit_packing"] = float(row["unit_packing"])
        row["platedComponents"] = component_map.get(int(row["plated_item_id"]), [])
    return plated_items


def expand_plated_quantities(
    cursor,
    quantities_by_item_id: Dict[int, float],
) -> Dict[str, Any]:
    if not quantities_by_item_id:
        return {"item_quantities": {}, "unresolved_component_types": []}

    item_ids = sorted({int(item_id) for item_id in quantities_by_item_id})
    placeholders = ", ".join(["%s"] * len(item_ids))
    cursor.execute(
        f"""
        SELECT pi.item_id,
               pic.component_item_id,
               pic.component_type_id,
               pic.quantity
          FROM plated_items pi
          JOIN plated_item_components pic ON pic.plated_item_id = pi.plated_item_id
         WHERE pi.item_id IN ({placeholders})
        """,
        tuple(item_ids),
    )
    rows = cursor.fetchall() or []

    components_by_parent: Dict[int, List[Dict[str, Any]]] = {}
    for row in rows:
        parent_item_id = row.get("item_id")
        component_item_id = row.get("component_item_id")
        component_type_id = row.get("component_type_id")
        if parent_item_id is None:
            continue
        components_by_parent.setdefault(int(parent_item_id), []).append(
            {
                "component_item_id": (
                    int(component_item_id) if component_item_id is not None else None
                ),
                "component_type_id": (
                    int(component_type_id) if component_type_id is not None else None
                ),
                "quantity": float(row.get("quantity") or 0),
            }
        )

    expanded: Dict[int, float] = {}
    unresolved_component_types: Dict[int, float] = {}
    for item_id, ordered_qty in quantities_by_item_id.items():
        normalized_item_id = int(item_id)
        normalized_ordered_qty = float(ordered_qty or 0)
        components = components_by_parent.get(normalized_item_id)
        if not components:
            expanded[normalized_item_id] = (
                expanded.get(normalized_item_id, 0.0) + normalized_ordered_qty
            )
            continue
        for component in components:
            component_qty = normalized_ordered_qty * float(component["quantity"])
            component_item_id = component.get("component_item_id")
            component_type_id = component.get("component_type_id")
            if component_item_id is not None:
                normalized_component_item_id = int(component_item_id)
                expanded[normalized_component_item_id] = (
                    expanded.get(normalized_component_item_id, 0.0) + component_qty
                )
            elif component_type_id is not None:
                normalized_component_type_id = int(component_type_id)
                unresolved_component_types[normalized_component_type_id] = (
                    unresolved_component_types.get(normalized_component_type_id, 0.0)
                    + component_qty
                )

    unresolved_rows: List[Dict[str, Any]] = []
    if unresolved_component_types:
        type_ids = sorted(unresolved_component_types.keys())
        type_placeholders = ", ".join(["%s"] * len(type_ids))
        cursor.execute(
            f"""
            SELECT component_type_id, name
              FROM component_types
             WHERE component_type_id IN ({type_placeholders})
             ORDER BY name ASC
            """,
            tuple(type_ids),
        )
        type_rows = {
            int(row["component_type_id"]): row
            for row in (cursor.fetchall() or [])
            if row.get("component_type_id") is not None
        }
        for component_type_id in type_ids:
            row = type_rows.get(component_type_id, {})
            unresolved_rows.append(
                {
                    "component_type_id": component_type_id,
                    "component_type_name": row.get("name"),
                    "quantity": float(unresolved_component_types[component_type_id]),
                }
            )

    return {"item_quantities": expanded, "unresolved_component_types": unresolved_rows}
