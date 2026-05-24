"""Developer tools router: schema introspection, menu seeding, order seeding, VPS monitor."""

from __future__ import annotations

import asyncio
import fcntl
import json as _json
import os
import pty
import random
import re
import struct
import termios
import socket as _socket
import time as _time
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import mysql.connector
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from ..city_config import DEFAULT_CITY, normalize_city_code
from ..db import get_raw_db, DATABASE_NAME
from ..utils.auth_deps import developer_required
from ..utils.helpers import (
    MENU_TYPE_CONDIMENTS,
    MENU_TYPE_ONE_DAY,
    ORDER_STATUS_CANCELLED,
    ORDER_STATUS_CONFIRMED,
    ORDER_STATUS_DELIVERED,
    ORDER_STATUS_DISPATCHED,
    _parse_optional_date,
    _resolve_city_context,
    attach_bld_ids,
    filter_items_by_bld,
    resolve_bld_id,
)
from .menu import DailyMenuPayload, MenuItemPayload, upsert_daily_menu, release_menu
from .orders import CreateOrderPayload, OrderItemPayload, create_order

router = APIRouter()

SCHEMA_NAME_PATTERN = re.compile(r"^[A-Za-z0-9_]+$")
MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Condiments"]


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class AutoMenuRequest(BaseModel):
    """Payload for auto-generating or clearing the daily menu."""

    date: Optional[str] = None
    city_code: Optional[str] = None


class DevOrderSeedRequest(BaseModel):
    """Payload for seeding test orders."""

    date: Optional[str] = None
    city_code: Optional[str] = None
    count: int = Field(default=10, ge=0, le=200)
    clear_existing: bool = False


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _normalize_menu_date(raw: Optional[str]) -> str:
    """Parse a date string or return today's date as an ISO string.

    Args:
        raw: Optional date string in YYYY-MM-DD format.

    Returns:
        Date string in YYYY-MM-DD format.
    """
    if raw:
        try:
            return datetime.strptime(raw, "%Y-%m-%d").date().isoformat()
        except ValueError as exc:
            raise HTTPException(
                status_code=400, detail="Invalid date format. Use YYYY-MM-DD."
            ) from exc
    return date.today().isoformat()


def _fetch_items_for_meal(bld_type: str) -> List[Dict[str, Any]]:
    """Fetch all items available for a given meal type.

    Args:
        bld_type: Meal type string (e.g. "Breakfast").

    Returns:
        List of item dicts with pricing and quantity fields.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        bld_id = resolve_bld_id(cursor, bld_type)
        cursor.execute(
            """
            SELECT
                i.item_id,
                i.category_id,
                i.max_qty_breakfast,
                i.max_qty_lunch,
                i.max_qty_dinner,
                i.max_qty_condiments,
                i.breakfast_price,
                i.lunch_price,
                i.dinner_price,
                i.condiments_price,
                i.net_price,
                i.name
            FROM items i
            WHERE EXISTS (
                SELECT 1
                  FROM item_bld_map map
                 WHERE map.item_id = i.item_id
                   AND map.bld_id = %s
            )
            ORDER BY i.name
            """,
            (bld_id,),
        )
        items = cursor.fetchall()
        attach_bld_ids(cursor, items)
        return filter_items_by_bld(items, bld_id)
    finally:
        cursor.close()
        db.close()


def _resolve_item_rate(meal: str, item: Dict[str, Any]) -> float:
    """Resolve the best available price for an item in the given meal context.

    Args:
        meal: Meal type string (e.g. "Lunch").
        item: Item dict with price fields.

    Returns:
        Float price value, or 0.0 if none found.
    """
    meal_key = {
        "Breakfast": "breakfast_price",
        "Lunch": "lunch_price",
        "Dinner": "dinner_price",
        "Condiments": "condiments_price",
    }.get(meal)
    candidates = []
    if meal_key:
        candidates.append(item.get(meal_key))
    candidates.append(item.get("net_price"))
    for value in candidates:
        if value is not None:
            try:
                return float(value)
            except (TypeError, ValueError):
                continue
    return 0.0


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/api/dev/db-schema")
def get_dev_db_schema(
    include_views: bool = Query(True, alias="includeViews"),
    schema: Optional[str] = Query(None),
    user: Any = Depends(developer_required),
) -> Dict[str, Any]:
    """Return read-only schema DDL metadata for developer tooling.

    Args:
        include_views: When True, includes database views in the output.
        schema: Optional schema name to introspect (defaults to kk_v1).
        user: Current developer user (injected).

    Returns:
        Dict with schema name, generated_at timestamp, and list of table/view DDLs.
    """
    db = get_raw_db()
    metadata_cursor = db.cursor()
    ddl_cursor = None
    try:
        try:
            db.start_transaction(readonly=True)
        except Exception:
            pass

        if schema and schema.strip():
            schema_name = schema.strip()
        else:
            schema_name = DATABASE_NAME
        if not SCHEMA_NAME_PATTERN.fullmatch(schema_name):
            raise HTTPException(status_code=400, detail="Invalid schema name")
        metadata_cursor.execute(f"USE `{schema_name}`")
        active_schema = schema_name

        try:
            metadata_cursor.execute("SET SESSION MAX_EXECUTION_TIME=5000")
        except mysql.connector.Error:
            pass

        targets: List[Tuple[str, str]] = []

        metadata_cursor.execute("SHOW FULL TABLES WHERE Table_type='BASE TABLE'")
        base_rows = metadata_cursor.fetchall()
        for row in base_rows:
            if not row:
                continue
            table_name = row[0]
            if table_name:
                targets.append((table_name, "TABLE"))

        if include_views:
            metadata_cursor.execute("SHOW FULL TABLES WHERE Table_type='VIEW'")
            view_rows = metadata_cursor.fetchall()
            for row in view_rows:
                if not row:
                    continue
                view_name = row[0]
                if view_name:
                    targets.append((view_name, "VIEW"))

        seen = set()
        ordered_targets: List[Tuple[str, str]] = []
        for name, kind in targets:
            if name in seen:
                continue
            seen.add(name)
            ordered_targets.append((name, kind))

        ordered_targets.sort(key=lambda item: item[0].lower())

        ddl_cursor = db.cursor()
        tables_payload: List[Dict[str, Any]] = []
        for name, kind in ordered_targets:
            try:
                if kind == "VIEW":
                    ddl_cursor.execute(f"SHOW CREATE VIEW `{name}`")
                else:
                    ddl_cursor.execute(f"SHOW CREATE TABLE `{name}`")
                ddl_row = ddl_cursor.fetchone()
                if not ddl_row or len(ddl_row) < 2:
                    continue
                ddl_text = ddl_row[1]
                columns_list: List[Dict[str, Any]] = []
                try:
                    ddl_cursor.execute(f"SHOW FULL COLUMNS FROM `{name}`")
                    column_rows = ddl_cursor.fetchall()
                    column_fields = [desc[0] for desc in ddl_cursor.description]
                    for col in column_rows:
                        record = dict(zip(column_fields, col))
                        columns_list.append(
                            {
                                "name": record.get("Field"),
                                "type": record.get("Type"),
                                "nullable": record.get("Null"),
                                "key": record.get("Key"),
                                "default": record.get("Default"),
                                "extra": record.get("Extra"),
                                "comment": record.get("Comment"),
                            }
                        )
                except mysql.connector.Error:
                    columns_list = []
                tables_payload.append(
                    {
                        "name": name,
                        "kind": kind,
                        "ddl": ddl_text,
                        "columns": columns_list,
                    }
                )
            except mysql.connector.Error:
                continue

        timestamp = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

        return {
            "schema": active_schema,
            "generated_at": timestamp,
            "tables": tables_payload,
        }
    except HTTPException:
        raise
    except mysql.connector.Error:
        raise HTTPException(status_code=500, detail="Failed to fetch schema metadata")
    finally:
        if ddl_cursor is not None:
            ddl_cursor.close()
        metadata_cursor.close()
        try:
            db.rollback()
        except Exception:
            pass
        db.close()


TABLE_NAME_PATTERN = re.compile(r"^[A-Za-z0-9_]+$")


@router.get("/api/dev/db-table-data")
def get_table_data(
    table: str = Query(...),
    limit: int = Query(200, ge=1, le=1000),
    user: Any = Depends(developer_required),
) -> Dict[str, Any]:
    """Return up to `limit` rows from the given table for developer inspection.

    Args:
        table: Table name to query.
        limit: Maximum number of rows to return (1–1000, default 200).
        user: Current developer user (injected).

    Returns:
        Dict with columns list and rows list.
    """
    if not TABLE_NAME_PATTERN.fullmatch(table):
        raise HTTPException(status_code=400, detail="Invalid table name")
    db = get_raw_db()
    cursor = db.cursor()
    try:
        cursor.execute(f"SELECT * FROM `{DATABASE_NAME}`.`{table}` LIMIT %s", (limit,))
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        rows = [list(row) for row in cursor.fetchall()]
        return {"columns": columns, "rows": rows, "total": len(rows)}
    except mysql.connector.Error as exc:
        raise HTTPException(status_code=500, detail=f"Query failed: {exc.msg}") from exc
    finally:
        cursor.close()
        try:
            db.rollback()
        except Exception:
            pass
        db.close()


@router.post("/api/dev/daily-menu/auto")
def auto_generate_daily_menu(
    payload: AutoMenuRequest, _: Dict[str, Any] = Depends(developer_required)
) -> Dict[str, Any]:
    """Auto-generate daily menus for all meal types and release Breakfast, Lunch, and Condiments.

    Args:
        payload: Optional date and city_code.
        _: Current developer user (injected, unused).

    Returns:
        Dict with date and per-meal results summary.
    """
    target_date = _normalize_menu_date(payload.date)
    target_city = normalize_city_code(payload.city_code or DEFAULT_CITY)
    summary: Dict[str, Any] = {}

    for meal in MEAL_TYPES:
        items = _fetch_items_for_meal(meal)
        limited_items = items[:8]
        if not items:
            summary[meal] = {
                "status": "skipped",
                "reason": "No items configured for this meal.",
            }
            continue

        meal_field = {
            "Breakfast": "max_qty_breakfast",
            "Lunch": "max_qty_lunch",
            "Dinner": "max_qty_dinner",
            "Condiments": "max_qty_condiments",
        }.get(meal, "max_qty_breakfast")

        allow_default = meal != "Dinner"
        is_condiments_meal = meal == "Condiments"
        menu_items: List[MenuItemPayload] = []
        for index, item in enumerate(limited_items, start=1):
            item_max_qty = item.get(meal_field)
            try:
                resolved_max_qty = int(item_max_qty) if item_max_qty is not None else 0
            except (TypeError, ValueError):
                resolved_max_qty = 0

            menu_items.append(
                MenuItemPayload(
                    item_id=item["item_id"],
                    category_id=item.get("category_id"),
                    max_qty=resolved_max_qty,
                    available_qty=resolved_max_qty,
                    rate=_resolve_item_rate(meal, item),
                    is_default=bool(allow_default and index == 1),
                    sort_order=index,
                )
            )

        menu_payload = DailyMenuPayload(
            date=None if is_condiments_meal else target_date,
            bld_type=meal,
            is_festival=False,
            period_type=None if is_condiments_meal else "one_day",
            items=menu_items,
            city_code=target_city,
            menu_type=MENU_TYPE_CONDIMENTS if is_condiments_meal else MENU_TYPE_ONE_DAY,
        )

        menu_data = upsert_daily_menu(menu_payload)
        menu_id = menu_data["menu_id"]
        released = False

        if meal in ("Breakfast", "Lunch") or is_condiments_meal:
            release_menu(menu_id)
            released = True

        summary[meal] = {
            "status": "created",
            "menu_id": menu_id,
            "items": len(menu_items),
            "released": released,
        }

    return {
        "date": target_date,
        "results": summary,
    }


@router.post("/api/dev/daily-menu/clear")
def clear_daily_menu(
    payload: AutoMenuRequest, _: Dict[str, Any] = Depends(developer_required)
) -> Dict[str, Any]:
    """Delete all menus for the given date and city across all meal types.

    Args:
        payload: Optional date and city_code.
        _: Current developer user (injected, unused).

    Returns:
        Dict with date and per-meal deletion results summary.
    """
    target_date = _normalize_menu_date(payload.date)
    target_city = normalize_city_code(payload.city_code or DEFAULT_CITY)
    summary: Dict[str, Any] = {}

    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        for meal in MEAL_TYPES:
            try:
                bld_id = resolve_bld_id(cursor, meal)
            except HTTPException as exc:
                if exc.status_code == 404:
                    summary[meal] = {
                        "status": "skipped",
                        "reason": "BLD configuration missing.",
                    }
                    continue
                raise
            is_condiments_meal = meal == "Condiments"
            if is_condiments_meal:
                cursor.execute(
                    """
                    SELECT menu_id
                      FROM menu
                     WHERE bld_id = %s
                       AND city_code = %s
                       AND menu_type = %s
                       AND date IS NULL
                     LIMIT 1
                    """,
                    (bld_id, target_city, MENU_TYPE_CONDIMENTS),
                )
            else:
                cursor.execute(
                    """
                    SELECT menu_id
                      FROM menu
                     WHERE date = %s
                       AND bld_id = %s
                       AND city_code = %s
                       AND menu_type = %s
                     LIMIT 1
                    """,
                    (target_date, bld_id, target_city, MENU_TYPE_ONE_DAY),
                )
            menu_row = cursor.fetchone()
            if not menu_row:
                summary[meal] = {"status": "absent"}
                continue

            menu_id = menu_row["menu_id"]
            cursor.execute("DELETE FROM menu_items WHERE menu_id = %s", (menu_id,))
            cursor.execute("DELETE FROM menu WHERE menu_id = %s", (menu_id,))
            summary[meal] = {
                "status": "deleted",
                "menu_id": menu_id,
            }

        db.commit()
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

    return {
        "date": target_date,
        "results": summary,
    }


@router.delete("/api/dev/orders")
def purge_all_orders(user: Dict[str, Any] = Depends(developer_required)) -> Dict[str, Any]:
    """Permanently delete all orders and order items from the database.

    Args:
        user: Current developer user (injected).

    Returns:
        Dict with deleted_orders count.
    """
    db = get_raw_db()
    cursor = db.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM orders")
        total_orders = int((cursor.fetchone() or [0])[0] or 0)
        cursor.execute("DELETE FROM order_items")
        cursor.execute("DELETE FROM orders")
        db.commit()
        return {"deleted_orders": total_orders}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to purge orders: {err.msg}")
    finally:
        cursor.close()
        db.close()


@router.post("/api/dev/orders/seed")
def seed_orders_for_testing(
    payload: DevOrderSeedRequest,
    user: Dict[str, Any] = Depends(developer_required),
) -> Dict[str, Any]:
    """Seed randomized test orders for the given date and city.

    Useful for populating a dev/staging environment with realistic order data.
    Optionally clears existing orders for the target date before creating new ones.

    Args:
        payload: Date, city_code, count, and clear_existing flag.
        user: Current developer user (injected).

    Returns:
        Dict with date, city_code, cleared_orders, created_orders, and sample_order_ids.
    """
    target_date = _parse_optional_date(payload.date) or date.today()
    target_city = _resolve_city_context(payload.city_code, user)

    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        deleted_orders = 0
        if payload.clear_existing:
            cursor.execute(
                """
                SELECT o.order_id
                  FROM orders o
                  JOIN addresses a ON o.address_id = a.address_id
                 WHERE DATE(o.created_at) = %s
                   AND a.city_code = %s
                """,
                (target_date, target_city),
            )
            rows = cursor.fetchall() or []
            order_ids = [row["order_id"] for row in rows]
            if order_ids:
                placeholders = ", ".join(["%s"] * len(order_ids))
                cursor.execute(
                    f"DELETE FROM order_items WHERE order_id IN ({placeholders})",
                    tuple(order_ids),
                )
                cursor.execute(
                    f"DELETE FROM orders WHERE order_id IN ({placeholders})",
                    tuple(order_ids),
                )
                deleted_orders = len(order_ids)
            db.commit()

        if payload.count == 0:
            db.commit()
            return {
                "date": target_date.isoformat(),
                "city_code": target_city,
                "cleared_orders": deleted_orders,
                "created_orders": 0,
                "sample_order_ids": [],
            }

        cursor.execute(
            """
            SELECT DISTINCT c.customer_id,
                            c.name,
                            a.address_id
              FROM customers c
              JOIN addresses a ON c.customer_id = a.customer_id
             WHERE a.city_code = %s
            """,
            (target_city,),
        )
        candidates = cursor.fetchall() or []
        if not candidates:
            raise HTTPException(status_code=400, detail="No customers found for target city")

        cursor.execute(
            """
            SELECT
                mi.menu_item_id,
                mi.item_id,
                mi.available_qty,
                COALESCE(
                    mi.rate,
                    i.net_price,
                    i.breakfast_price,
                    i.lunch_price,
                    i.dinner_price,
                    i.condiments_price,
                    0
                ) AS price,
                b.bld_type
              FROM menu m
              JOIN bld b ON m.bld_id = b.bld_id
              JOIN menu_items mi ON m.menu_id = mi.menu_id
              JOIN items i ON mi.item_id = i.item_id
             WHERE m.date = %s
               AND m.city_code = %s
               AND COALESCE(m.is_released, 0) = 1
            """,
            (target_date, target_city),
        )
        released_rows = cursor.fetchall() or []
        released_items = [
            row
            for row in released_rows
            if row.get("price") is not None and float(row.get("price") or 0) > 0
        ]
        if not released_items:
            raise HTTPException(
                status_code=400,
                detail="No released menus found for the selected date. Generate and release menus first.",
            )

        created_ids: List[int] = []
        payment_methods = ["Cash", "UPI", "Card"]
        seeded_status_counts: Dict[str, int] = {
            ORDER_STATUS_CONFIRMED: 0,
            ORDER_STATUS_DISPATCHED: 0,
            ORDER_STATUS_DELIVERED: 0,
            ORDER_STATUS_CANCELLED: 0,
        }
        status_choices: List[Tuple[str, int]] = [
            (ORDER_STATUS_CONFIRMED, 4),
            (ORDER_STATUS_DISPATCHED, 3),
            (ORDER_STATUS_DELIVERED, 3),
            (ORDER_STATUS_CANCELLED, 1),
        ]

        for _ in range(payload.count):
            customer = random.choice(candidates)
            payment_method = random.choice(payment_methods)
            seeded_status = random.choices(
                [status for status, _ in status_choices],
                weights=[weight for _, weight in status_choices],
                k=1,
            )[0]

            item_count = random.randint(1, min(3, len(released_items)))
            if item_count == 0:
                break
            selected_items = random.sample(released_items, item_count)
            order_items: List[OrderItemPayload] = []
            for item in selected_items:
                available_qty = item.get("available_qty")
                max_allowed = 3
                if isinstance(available_qty, (int, float)) and available_qty is not None:
                    if available_qty <= 0:
                        continue
                    max_allowed = max(1, min(3, int(available_qty)))
                qty = random.randint(1, max_allowed)
                order_items.append(
                    OrderItemPayload(
                        item_id=item["item_id"],
                        quantity=qty,
                        price=float(item["price"]),
                        menu_item_id=item["menu_item_id"],
                        meal_type=item["bld_type"].lower(),
                    )
                )

            if not order_items:
                continue

            order_payload = CreateOrderPayload(
                customer_id=customer["customer_id"],
                address_id=customer["address_id"],
                payment_method=payment_method,
                items=order_items,
                order_type="one_time",
            )
            result = create_order(order_payload)
            order_id = result["order_id"]
            created_time = datetime.combine(
                target_date,
                datetime.min.time(),
            ) + timedelta(hours=random.randint(6, 12), minutes=random.randint(0, 59))
            paid_flag = payment_method.lower() in {"upi", "card", "online"}
            if seeded_status == ORDER_STATUS_DELIVERED:
                paid_flag = random.random() < 0.8
            elif seeded_status == ORDER_STATUS_CANCELLED:
                paid_flag = random.random() < 0.35
            cursor.execute(
                "UPDATE orders SET created_at = %s, status = %s, paid = %s WHERE order_id = %s",
                (created_time, seeded_status, int(paid_flag), order_id),
            )
            created_ids.append(order_id)
            seeded_status_counts[seeded_status] += 1

        db.commit()
        return {
            "date": target_date.isoformat(),
            "city_code": target_city,
            "cleared_orders": deleted_orders,
            "created_orders": len(created_ids),
            "sample_order_ids": created_ids[:5],
            "status_counts": seeded_status_counts,
        }
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to seed orders: {err.msg}")
    finally:
        cursor.close()
        db.close()


# ---------------------------------------------------------------------------
# VPS Monitor — Hostinger API + PTY terminal
# ---------------------------------------------------------------------------

import subprocess as _subprocess

import psutil as _psutil

# SSH config — set VPS_SSH_HOST in backend/.env to collect metrics from the remote VPS.
# Leave unset on the VPS itself so it reads local psutil directly.
_VPS_SSH_HOST: str = os.getenv("VPS_SSH_HOST", "")
_VPS_SSH_USER: str = os.getenv("VPS_SSH_USER", "root")
_VPS_SSH_KEY_PATH: str = os.getenv("VPS_SSH_KEY_PATH", "")
_VPS_PYTHON_PATH: str = os.getenv("VPS_PYTHON_PATH", "python3")

# Optional plan-limit overrides to match the Hostinger panel (e.g. VPS_PLAN_DISK_GB=10).
_VPS_PLAN_DISK_MB: int = int(os.getenv("VPS_PLAN_DISK_GB", "0")) * 1024
_VPS_PLAN_RAM_MB: int = int(os.getenv("VPS_PLAN_RAM_GB", "0")) * 1024

# Rolling history buffer — keyed by metric name → {unix_ts_str: value}
_VPS_HISTORY: Dict[str, Dict[str, float]] = {
    k: {}
    for k in (
        "cpu_usage",
        "ram_usage",
        "disk_space",
        "incoming_traffic",
        "outgoing_traffic",
        "uptime",
    )
}
_VPS_HISTORY_MAX = 30

_REMOTE_PSUTIL_SCRIPT = (
    "import psutil,json,time,socket;"
    "m=psutil.virtual_memory();"
    'd=psutil.disk_usage("/");'
    "n=psutil.net_io_counters();"
    'print(json.dumps({"cpu":psutil.cpu_percent(interval=0.1),'
    '"ram_used":m.used,"ram_total":m.total,'
    '"disk_used":d.used,"disk_total":d.total,'
    '"net_recv":n.bytes_recv,"net_sent":n.bytes_sent,'
    '"uptime":time.time()-psutil.boot_time(),'
    '"hostname":socket.gethostname(),'
    '"cpus":psutil.cpu_count(logical=True) or 1}))'
)


def _remote_snapshot() -> Optional[Dict[str, Any]]:
    """Collect metrics from the VPS via SSH subprocess.

    Uses the system ssh binary so existing key/agent auth just works.
    Returns None if VPS_SSH_HOST is unset or the command fails.

    Returns:
        Parsed metrics dict, or None on failure.
    """
    if not _VPS_SSH_HOST:
        return None
    ssh_cmd = [
        "ssh",
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=5",
    ]
    if _VPS_SSH_KEY_PATH:
        ssh_cmd += ["-i", os.path.expanduser(_VPS_SSH_KEY_PATH)]
    remote_cmd = f"{_VPS_PYTHON_PATH} -c '{_REMOTE_PSUTIL_SCRIPT}'"
    ssh_cmd += [f"{_VPS_SSH_USER}@{_VPS_SSH_HOST}", remote_cmd]
    try:
        result = _subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=10)
        if result.returncode == 0 and result.stdout.strip():
            return _json.loads(result.stdout)
    except Exception:
        pass
    return None


def _local_snapshot() -> Dict[str, Any]:
    """Collect metrics from the local machine via psutil."""
    mem = _psutil.virtual_memory()
    disk = _psutil.disk_usage("/")
    net = _psutil.net_io_counters()
    return {
        "cpu": _psutil.cpu_percent(interval=0.1),
        "ram_used": float(mem.used),
        "ram_total": float(mem.total),
        "disk_used": float(disk.used),
        "disk_total": float(disk.total),
        "net_recv": float(net.bytes_recv),
        "net_sent": float(net.bytes_sent),
        "uptime": _time.time() - _psutil.boot_time(),
        "hostname": _socket.gethostname(),
        "cpus": _psutil.cpu_count(logical=True) or 1,
    }


def _record_snapshot(snap: Dict[str, Any]) -> None:
    """Append a metrics snapshot to the rolling history buffer."""
    now = str(int(_time.time()))
    mapping = {
        "cpu_usage": snap["cpu"],
        "ram_usage": snap["ram_used"],
        "disk_space": snap["disk_used"],
        "incoming_traffic": snap["net_recv"],
        "outgoing_traffic": snap["net_sent"],
        "uptime": snap["uptime"],
    }
    for key, value in mapping.items():
        _VPS_HISTORY[key][now] = value
        if len(_VPS_HISTORY[key]) > _VPS_HISTORY_MAX:
            del _VPS_HISTORY[key][min(_VPS_HISTORY[key])]


@router.get("/api/dev/vps/metrics")
def get_vps_metrics(user: Any = Depends(developer_required)) -> Dict[str, Any]:
    """Return VPS performance metrics.

    When VPS_SSH_HOST is set in backend/.env the metrics are collected from
    the remote VPS over SSH (used for local development). Otherwise metrics
    are read from the local machine via psutil (used when the backend itself
    runs on the VPS).  A 30-point rolling history is maintained so the
    frontend can render sparklines.

    Args:
        user: Current developer user (injected).

    Returns:
        Dict with ``vm_id``, ``vm_info``, and ``metrics`` keys.
    """
    snap = _remote_snapshot() or _local_snapshot()
    _record_snapshot(snap)
    return _build_metrics_payload(snap)


def _build_metrics_payload(snap: Dict[str, Any]) -> Dict[str, Any]:
    """Build the metrics response dict from a snapshot.

    Args:
        snap: Raw metrics snapshot from _local_snapshot or _remote_snapshot.

    Returns:
        Dict suitable for the VPS metrics API/WebSocket response.
    """
    disk_total_mb = _VPS_PLAN_DISK_MB or int(snap["disk_total"]) // (1024 * 1024)
    ram_total_mb = _VPS_PLAN_RAM_MB or int(snap["ram_total"]) // (1024 * 1024)
    return {
        "vm_id": snap["hostname"],
        "vm_info": {
            "id": 0,
            "hostname": snap["hostname"],
            "state": "running",
            "plan": "VPS",
            "cpus": snap["cpus"],
            "memory": ram_total_mb,
            "disk": disk_total_mb,
            "bandwidth": 0,
        },
        "metrics": {
            "cpu_usage": {"unit": "%", "usage": dict(_VPS_HISTORY["cpu_usage"])},
            "ram_usage": {"unit": "bytes", "usage": dict(_VPS_HISTORY["ram_usage"])},
            "disk_space": {"unit": "bytes", "usage": dict(_VPS_HISTORY["disk_space"])},
            "incoming_traffic": {"unit": "bytes", "usage": dict(_VPS_HISTORY["incoming_traffic"])},
            "outgoing_traffic": {"unit": "bytes", "usage": dict(_VPS_HISTORY["outgoing_traffic"])},
            "uptime": {"unit": "s", "usage": dict(_VPS_HISTORY["uptime"])},
        },
    }


@router.websocket("/api/dev/vps/metrics/stream")
async def vps_metrics_stream(websocket: WebSocket, token: str = Query(...)) -> None:
    """Stream live VPS metrics over WebSocket, pushing a snapshot every few seconds.

    Collects metrics via SSH (if VPS_SSH_HOST is configured) or local psutil,
    appends to the rolling history, and pushes the full payload to the client.
    Uses asyncio.to_thread so the blocking SSH subprocess does not stall the
    event loop.

    Args:
        websocket: FastAPI WebSocket connection.
        token: JWT access token passed as a query parameter.
    """
    from ..utils.auth_deps import decode_token, _user_has_role, DEVELOPER_ROLE_CODE

    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise ValueError("wrong token type")
        if not _user_has_role(payload["sub"], DEVELOPER_ROLE_CODE):
            raise ValueError("developer role required")
    except Exception:
        await websocket.close(code=4003)
        return

    await websocket.accept()
    interval = 3 if _VPS_SSH_HOST else 2

    try:
        while True:
            snap = (await asyncio.to_thread(_remote_snapshot)) or _local_snapshot()
            _record_snapshot(snap)
            await websocket.send_json(_build_metrics_payload(snap))
            await asyncio.sleep(interval)
    except (WebSocketDisconnect, Exception):
        pass


def _set_pty_size(fd: int, rows: int, cols: int) -> None:
    """Resize the PTY window to the given dimensions.

    Args:
        fd: Master PTY file descriptor.
        rows: Terminal row count.
        cols: Terminal column count.
    """
    try:
        winsize = struct.pack("HHHH", rows, cols, 0, 0)
        fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)
    except OSError:
        pass


@router.websocket("/api/dev/vps/terminal")
async def vps_terminal_ws(websocket: WebSocket, token: str = Query(...)) -> None:
    """WebSocket endpoint that provides a live PTY bash session.

    Accepts a JWT access token as a query parameter (required because the
    standard Authorization header cannot be set for WebSocket upgrades from
    the browser). Verifies the developer role, then spawns /bin/bash with a
    PTY and bridges data between the socket and the pseudo-terminal.

    Binary frames from the client are written directly to the PTY master.
    Text frames are parsed as JSON control messages; ``{"type":"resize",
    "cols":N,"rows":M}`` triggers a TIOCSWINSZ ioctl on the master fd.

    Args:
        websocket: FastAPI WebSocket connection.
        token: JWT access token passed as a query parameter.
    """
    from ..utils.auth_deps import decode_token, _user_has_role, DEVELOPER_ROLE_CODE

    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise ValueError("wrong token type")
        user_sub = payload["sub"]
        if not _user_has_role(user_sub, DEVELOPER_ROLE_CODE):
            raise ValueError("developer role required")
    except Exception:
        await websocket.close(code=4003)
        return

    await websocket.accept()

    master_fd, slave_fd = pty.openpty()
    _set_pty_size(master_fd, 24, 80)

    env = dict(os.environ)
    env["TERM"] = "xterm-256color"

    def _preexec() -> None:
        os.setsid()
        try:
            fcntl.ioctl(slave_fd, termios.TIOCSCTTY, 0)
        except OSError:
            pass

    if _VPS_SSH_HOST:
        ssh_args = ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ServerAliveInterval=30"]
        if _VPS_SSH_KEY_PATH:
            ssh_args += ["-i", os.path.expanduser(_VPS_SSH_KEY_PATH)]
        ssh_args.append(f"{_VPS_SSH_USER}@{_VPS_SSH_HOST}")
        cmd = ssh_args
    else:
        cmd = ["/bin/bash", "--login"]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdin=slave_fd,
        stdout=slave_fd,
        stderr=slave_fd,
        preexec_fn=_preexec,
        env=env,
        pass_fds=(slave_fd,),
    )
    os.close(slave_fd)

    loop = asyncio.get_event_loop()

    async def _pty_to_ws() -> None:
        while True:
            try:
                data = await loop.run_in_executor(None, lambda: os.read(master_fd, 4096))
                if not data:
                    break
                await websocket.send_bytes(data)
            except (OSError, WebSocketDisconnect, RuntimeError):
                break

    reader = asyncio.create_task(_pty_to_ws())

    try:
        while True:
            msg = await websocket.receive()
            if msg.get("type") == "websocket.disconnect":
                break
            raw_bytes = msg.get("bytes")
            raw_text = msg.get("text")
            if raw_bytes:
                await loop.run_in_executor(None, os.write, master_fd, raw_bytes)
            elif raw_text:
                try:
                    ctrl = _json.loads(raw_text)
                    if ctrl.get("type") == "resize":
                        _set_pty_size(
                            master_fd,
                            int(ctrl.get("rows", 24)),
                            int(ctrl.get("cols", 80)),
                        )
                except _json.JSONDecodeError:
                    await loop.run_in_executor(
                        None, os.write, master_fd, raw_text.encode("utf-8", errors="replace")
                    )
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        reader.cancel()
        try:
            proc.terminate()
            await asyncio.wait_for(proc.wait(), timeout=3)
        except Exception:
            pass
        try:
            os.close(master_fd)
        except OSError:
            pass
