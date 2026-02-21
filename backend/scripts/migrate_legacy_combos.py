"""
Utility script to migrate legacy combo rows that still live in the `items` table
into the dedicated `combos` + `combo_items` tables.

Usage:
    python -m backend.scripts.migrate_legacy_combos

Environment variables (all optional, defaults match local dev):
    DB_HOST
    DB_USER
    DB_PASSWORD
    DB_NAME
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Tuple

import mysql.connector
from mysql.connector import Error


DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "fastapi_user"),
    "password": os.getenv("DB_PASSWORD", "password"),
    "database": os.getenv("DB_NAME", "kk_v1"),
}


def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


def ensure_schema(cursor) -> None:
    cursor.execute(
        """
        ALTER TABLE combos
            ADD COLUMN IF NOT EXISTS legacy_item_id INT NULL UNIQUE,
            ADD INDEX IF NOT EXISTS idx_combos_legacy_item_id (legacy_item_id)
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS legacy_combo_map (
            legacy_item_id INT NOT NULL PRIMARY KEY,
            combo_id INT NOT NULL,
            migrated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_legacy_combo FOREIGN KEY (combo_id)
                REFERENCES combos (combo_id) ON DELETE CASCADE
        )
        """
    )


def fetch_legacy_combos(cursor) -> List[Dict[str, Any]]:
    cursor.execute(
        """
        SELECT
            i.item_id,
            i.name,
            i.category_id,
            COALESCE(i.net_price, i.dinner_price, i.lunch_price, i.breakfast_price, 0) AS price
        FROM items i
        WHERE i.is_combo = 1
        ORDER BY i.item_id ASC
        """
    )
    return cursor.fetchall() or []


def ensure_combo(cursor, legacy_combo: Dict[str, Any]) -> Tuple[int, bool]:
    legacy_item_id = legacy_combo["item_id"]
    cursor.execute(
        "SELECT combo_id FROM combos WHERE legacy_item_id = %s LIMIT 1",
        (legacy_item_id,),
    )
    row = cursor.fetchone()
    if row:
        return int(row["combo_id"]), False

    cursor.execute(
        """
        INSERT INTO combos (combo_name, price, category_id, legacy_item_id)
        VALUES (%s, %s, %s, %s)
        """,
        (
            legacy_combo.get("name") or f"Legacy Combo #{legacy_item_id}",
            float(legacy_combo.get("price") or 0),
            legacy_combo.get("category_id"),
            legacy_item_id,
        ),
    )
    combo_id = cursor.lastrowid
    cursor.execute(
        """
        INSERT INTO legacy_combo_map (legacy_item_id, combo_id)
        VALUES (%s, %s)
        ON DUPLICATE KEY UPDATE combo_id = VALUES(combo_id)
        """,
        (legacy_item_id, combo_id),
    )
    return combo_id, True


def fetch_legacy_combo_items(cursor, legacy_item_id: int) -> List[Tuple[int, int]]:
    cursor.execute(
        """
        SELECT included_item_id, quantity
        FROM item_combos
        WHERE combo_item_id = %s AND included_item_id IS NOT NULL
        ORDER BY combo_id ASC
        """,
        (legacy_item_id,),
    )
    rows = cursor.fetchall() or []
    normalized: List[Tuple[int, int]] = []
    for row in rows:
        item_id = row.get("included_item_id")
        quantity = row.get("quantity") or 1
        if item_id is None:
            continue
        normalized.append((int(item_id), int(quantity)))
    return normalized


def migrate():
    db = get_connection()
    cursor = db.cursor(dictionary=True)
    try:
        ensure_schema(cursor)

        legacy_combos = fetch_legacy_combos(cursor)
        if not legacy_combos:
            print("No legacy combos found. Nothing to migrate.")
            return

        created = 0
        updated = 0
        skipped = 0

        for legacy in legacy_combos:
            combo_id, is_new = ensure_combo(cursor, legacy)
            legacy_item_id = legacy["item_id"]
            items = fetch_legacy_combo_items(cursor, legacy_item_id)
            if not items:
                skipped += 1
                continue

            cursor.execute("DELETE FROM combo_items WHERE combo_id = %s", (combo_id,))
            payload = [(combo_id, item_id, quantity) for item_id, quantity in items]
            cursor.executemany(
                "INSERT INTO combo_items (combo_id, item_id, quantity) VALUES (%s, %s, %s)",
                payload,
            )

            if is_new:
                created += 1
            else:
                updated += 1

        db.commit()
        print(
            f"Migrated {created + updated} combos "
            f"(created {created}, refreshed {updated}, combos without items {skipped})."
        )
    except Error as exc:
        db.rollback()
        raise RuntimeError(f"Combo migration failed: {exc}") from exc
    finally:
        cursor.close()
        db.close()


if __name__ == "__main__":
    migrate()
