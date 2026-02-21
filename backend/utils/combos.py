from typing import Any, Dict, Iterable, List, Optional, Sequence

from fastapi import HTTPException


def ensure_category_exists(cursor, category_id: int) -> None:
    """Verify the referenced category exists before touching combos."""
    cursor.execute(
        "SELECT 1 FROM categories WHERE category_id = %s LIMIT 1",
        (category_id,),
    )
    if cursor.fetchone() is None:
        raise HTTPException(status_code=400, detail="Invalid category_id")


def ensure_item_ids_exist(cursor, item_ids: Iterable[int]) -> List[int]:
    """Ensure every referenced item exists before saving combo items."""
    normalized = sorted({int(item_id) for item_id in item_ids if item_id is not None})
    if not normalized:
        raise HTTPException(status_code=400, detail="A combo must include at least one item")

    placeholders = ", ".join(["%s"] * len(normalized))
    cursor.execute(
        f"SELECT item_id FROM items WHERE item_id IN ({placeholders})",
        tuple(normalized),
    )
    rows = cursor.fetchall() or []
    found = {int(row["item_id"]) for row in rows if row.get("item_id") is not None}
    missing = [item_id for item_id in normalized if item_id not in found]
    if missing:
        raise HTTPException(status_code=400, detail=f"Unknown item_ids: {missing}")
    return normalized


def _resolve_value(entry: Any, key: str) -> Any:
    if isinstance(entry, dict):
        return entry.get(key)
    return getattr(entry, key, None)


def _parse_positive_int(value: Any, field_name: str) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail=f"{field_name} must be a positive integer") from None
    if parsed <= 0:
        raise HTTPException(status_code=400, detail=f"{field_name} must be a positive integer")
    return parsed


def normalize_combo_items(
    items: Optional[Iterable[Any]],
    *,
    require_items: bool = True,
) -> List[Dict[str, int]]:
    """Sanitize combo items, ensuring unique item_ids and positive quantities."""
    if items is None:
        return []

    normalized: List[Dict[str, int]] = []
    seen: set[int] = set()

    for index, entry in enumerate(items):
        item_id = _resolve_value(entry, "item_id")
        quantity = _resolve_value(entry, "quantity")
        normalized_item_id = _parse_positive_int(item_id, f"items[{index}].item_id")
        normalized_quantity = _parse_positive_int(
            1 if quantity is None else quantity,
            f"items[{index}].quantity",
        )
        if normalized_item_id in seen:
            raise HTTPException(
                status_code=400,
                detail=f"Duplicate item_id {normalized_item_id} in combo payload",
            )
        seen.add(normalized_item_id)
        normalized.append({"item_id": normalized_item_id, "quantity": normalized_quantity})

    if not normalized and require_items:
        raise HTTPException(status_code=400, detail="A combo must include at least one item")

    return normalized


def _fetch_combo_items(cursor, combo_ids: Sequence[int]) -> Dict[int, List[Dict[str, Any]]]:
    if not combo_ids:
        return {}
    placeholders = ", ".join(["%s"] * len(combo_ids))
    cursor.execute(
        f"""
        SELECT ci.combo_id,
               ci.item_id,
               ci.quantity,
               i.name AS item_name
          FROM combo_items ci
          LEFT JOIN items i ON ci.item_id = i.item_id
         WHERE ci.combo_id IN ({placeholders})
         ORDER BY ci.combo_id ASC, ci.id ASC
        """,
        tuple(combo_ids),
    )
    rows = cursor.fetchall() or []
    combo_item_map: Dict[int, List[Dict[str, Any]]] = {}
    for row in rows:
        combo_id = row.get("combo_id")
        item_id = row.get("item_id")
        if combo_id is None or item_id is None:
            continue
        combo_item_map.setdefault(combo_id, []).append(
            {
                "itemId": item_id,
                "name": row.get("item_name"),
                "quantity": row.get("quantity", 1),
            }
        )
    return combo_item_map


def fetch_combo_detail(cursor, combo_id: int) -> Optional[Dict[str, Any]]:
    cursor.execute(
        """
        SELECT c.combo_id,
               c.combo_name,
               c.price,
               c.category_id,
               cat.category_name
          FROM combos c
          LEFT JOIN categories cat ON c.category_id = cat.category_id
         WHERE c.combo_id = %s
         LIMIT 1
        """,
        (combo_id,),
    )
    combo = cursor.fetchone()
    if not combo:
        return None

    combo["price"] = float(combo.get("price") or 0)
    included_items = _fetch_combo_items(cursor, [combo_id]).get(combo_id, [])
    combo["includedItems"] = included_items
    return combo


def fetch_combos_with_items(cursor) -> List[Dict[str, Any]]:
    cursor.execute(
        """
        SELECT c.combo_id,
               c.combo_name,
               c.price,
               c.category_id,
               cat.category_name
          FROM combos c
          LEFT JOIN categories cat ON c.category_id = cat.category_id
         ORDER BY c.combo_id ASC
        """
    )
    combos = cursor.fetchall() or []
    combo_ids = [combo["combo_id"] for combo in combos if combo.get("combo_id") is not None]
    combo_item_map = _fetch_combo_items(cursor, combo_ids)
    for combo in combos:
        combo["price"] = float(combo.get("price") or 0)
        combo["includedItems"] = combo_item_map.get(combo.get("combo_id"), [])
    return combos
