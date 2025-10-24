from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from .gemini_client import GeminiClientError, GeminiSQLClient
from .sql_validator import SQLValidationError, extract_sql, validate_sql

logger = logging.getLogger(__name__)


class SQLGenerationService:
    def __init__(self) -> None:
        self._client: Optional[GeminiSQLClient] = None

    def _client_instance(self) -> GeminiSQLClient:
        if self._client is None:
            self._client = GeminiSQLClient()
        return self._client

    def handle_query(self, *, query: str, db: Session, confirm: bool) -> Dict[str, Any]:
        query_lower = query.lower()
        allow_update = _should_allow_update(query_lower)
        try:
            raw_text = self._client_instance().generate_sql(
                query=query,
                allow_update=allow_update,
            )
        except GeminiClientError as exc:
            raise RuntimeError(str(exc)) from exc
        try:
            sql = extract_sql(raw_text)
            validation = validate_sql(sql, allow_update=allow_update)
        except SQLValidationError as exc:
            return {
                "error": str(exc),
                "sql": strip_sql_fence(raw_text),
                "examples": _fallback_examples(),
            }

        if validation.is_update:
            prepared = self._prepare_update(sql=validation.sql, db=db)
            if isinstance(prepared, dict):
                return prepared
            if not confirm:
                return self._preview_update(prepared)
            return self._apply_update(prepared, db=db)
        return self._execute_select(sql=validation.sql, db=db, original_query=query)

    def _execute_select(self, *, sql: str, db: Session, original_query: str) -> Dict[str, Any]:
        try:
            result = db.execute(text(sql))
            rows = [dict(row) for row in result.mappings().all()]
            intent = infer_intent(sql, original_query)
            display_rows = [_filter_row(row) for row in rows]
            return {
                "intent": intent,
                "sql": sql,
                "rows": display_rows,
            }
        except Exception as exc:  # pragma: no cover - DB errors
            logger.exception("Failed to execute generated SELECT : %s", exc)
            return {
                "error": "Failed to execute generated SQL.",
                "sql": sql,
            }

    def _prepare_update(self, *, sql: str, db: Session) -> "PreparedUpdate | Dict[str, Any]":
        buffer_qty = _extract_buffer_qty(sql)
        if buffer_qty is None:
            return {
                "error": "Unable to resolve buffer quantity in generated SQL.",
                "sql": sql,
            }

        menu_item_id = _extract_menu_item_id(sql)
        if menu_item_id is None:
            subquery = _extract_menu_item_subquery(sql)
            if not subquery:
                return {
                    "error": "Unable to resolve menu item for buffer update.",
                    "sql": sql,
                }
            menu_item_id, resolution_error = _resolve_menu_item_id(db, subquery)
            if menu_item_id is None:
                return {
                    "error": resolution_error
                    or "No matching menu item found for buffer update.",
                    "sql": sql,
                }

        current_rows = _fetch_menu_item(db, menu_item_id)
        sanitized = _filter_row(current_rows[0]) if current_rows else None
        return PreparedUpdate(
            sql=sql,
            buffer_qty=buffer_qty,
            menu_item_id=menu_item_id,
            current_row=sanitized,
        )

    def _preview_update(self, prepared: "PreparedUpdate") -> Dict[str, Any]:
        previous_value = None
        if prepared.current_row is not None:
            previous_value = prepared.current_row.get("buffer_qty")
        return {
            "intent": "SET_MENU_BUFFER",
            "sql": prepared.sql,
            "confirm_required": True,
            "preview": {
                "target": prepared.current_row,
                "changes": {
                    "buffer_qty": {
                        "current": previous_value,
                        "new": _normalize_decimal(prepared.buffer_qty),
                    }
                },
            },
        }

    def _apply_update(self, prepared: "PreparedUpdate", *, db: Session) -> Dict[str, Any]:
        sql = prepared.sql
        try:
            result = db.execute(
                text(
                    """
                    UPDATE menu_items
                    SET buffer_qty = :buffer_qty
                    WHERE menu_item_id = :menu_item_id
                    """
                ),
                {
                    "buffer_qty": prepared.buffer_qty,
                    "menu_item_id": prepared.menu_item_id,
                },
            )
            db.commit()
            affected = result.rowcount
        except Exception as exc:  # pragma: no cover
            logger.exception("Failed to execute buffer UPDATE : %s", exc)
            db.rollback()
            return {
                "error": "Failed to apply buffer update.",
                "sql": sql,
            }

        refreshed = _fetch_menu_item(db, prepared.menu_item_id)
        display_rows = [_filter_row(row) for row in refreshed]
        row_payload: Optional[Dict[str, Any]] = display_rows[0] if display_rows else None
        return {
            "intent": "SET_MENU_BUFFER",
            "sql": sql,
            "affected": affected,
            "row": row_payload,
            "previous": prepared.current_row,
        }


@dataclass
class PreparedUpdate:
    sql: str
    buffer_qty: Decimal
    menu_item_id: int
    current_row: Optional[Dict[str, Any]]


def strip_sql_fence(text: str) -> str:
    return text.replace("```sql", "").replace("```", "").strip()


def _should_allow_update(query: str) -> bool:
    return "update" in query or ("set" in query and "buffer" in query)


def infer_intent(sql: str, original_query: str) -> str:
    upper_sql = sql.upper()
    if "FROM MENU" in upper_sql and "BUFFER_QTY" in upper_sql:
        return "GET_MENU_BUFFER"
    if "FROM MENU" in upper_sql:
        if "B.BLD_TYPE" in upper_sql or "bld_type" in sql:
            return "GET_MENU"
        return "GET_MENU"
    if "FROM ORDERS" in upper_sql and "SUM" in upper_sql:
        return "GET_ORDER_TOTALS"
    if "FROM ORDERS" in upper_sql and "COUNT" in upper_sql:
        return "GET_ORDER_COUNT"
    if "FROM ORDER_ITEMS" in upper_sql:
        return "GET_TOP_ITEMS"
    if "FROM CUSTOMERS" in upper_sql and "ADDRESSES" in upper_sql:
        return "GET_CUSTOMER_ADDRESSES"
    if "FROM ORDERS" in upper_sql and "CUSTOMERS" in upper_sql:
        return "GET_CUSTOMER_ORDERS"
    if "FROM ADMIN_LOGS" in upper_sql:
        return "GET_ADMIN_LOGS_RECENT"
    if "BUFFER" in original_query.lower():
        return "GET_MENU_BUFFER"
    return "unknown"


def _filter_row(row: Dict[str, Any]) -> Dict[str, Any]:
    filtered: Dict[str, Any] = {}
    for key, value in row.items():
        if key.lower().endswith("_id") or key.lower() == "id":
            continue
        if isinstance(value, Decimal):
            filtered[key] = _normalize_decimal(value)
        else:
            filtered[key] = value
    return filtered


def _extract_buffer_qty(sql: str) -> Optional[Decimal]:
    match = re.search(
        r"SET\s+buffer_qty\s*=\s*([0-9]+(?:\.[0-9]+)?)",
        sql,
        flags=re.IGNORECASE,
    )
    if not match:
        return None
    try:
        return Decimal(match.group(1))
    except Exception:
        return None


def _extract_menu_item_id(sql: str) -> Optional[int]:
    direct_match = re.search(
        r"WHERE\s+(?:mi\.)?menu_item_id\s*=\s*(\d+)\b",
        sql,
        flags=re.IGNORECASE,
    )
    if direct_match:
        try:
            return int(direct_match.group(1))
        except ValueError:
            return None
    return None


def _extract_menu_item_subquery(sql: str) -> Optional[str]:
    match = re.search(
        r"WHERE\s+(?:mi\.)?menu_item_id\s*=\s*\((.+)\)\s*$",
        sql,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not match:
        return None
    subquery = match.group(1).strip()
    if ";" in subquery:
        return None
    if not subquery.upper().startswith("SELECT"):
        return None
    return subquery


def _resolve_menu_item_id(db: Session, subquery: str) -> Tuple[Optional[int], Optional[str]]:
    try:
        result = db.execute(text(subquery))
    except Exception:
        return None, "Failed to resolve menu item for buffer update."
    rows = result.fetchall()
    if not rows:
        return None, "No matching menu item found for buffer update."
    if len(rows) > 1:
        return None, (
            "Multiple menu items matched that description. Please specify the meal."
        )
    value = rows[0][0]
    try:
        return int(value), None
    except (TypeError, ValueError):
        return None, "Buffer update target could not be resolved."


def _normalize_decimal(value: Decimal) -> float | int:
    if value == value.to_integral_value():
        return int(value)
    return float(value)


def _fetch_menu_item(db: Session, menu_item_id: int) -> List[Dict[str, Any]]:
    refresh_sql = """
        SELECT
            mi.menu_item_id,
            m.date,
            b.bld_type,
            i.name AS item_name,
            mi.buffer_qty,
            mi.final_qty,
            mi.planned_qty,
            mi.available_qty
        FROM menu_items mi
        JOIN menu m ON m.menu_id = mi.menu_id
        JOIN bld b ON b.bld_id = m.bld_id
        JOIN items i ON i.item_id = mi.item_id
        WHERE mi.menu_item_id = :menu_item_id
    """
    result = db.execute(text(refresh_sql), {"menu_item_id": menu_item_id})
    return [dict(row) for row in result.mappings().all()]


def _fallback_examples() -> List[str]:
    return [
        "what's today's menu?",
        "top items this month 5",
        "update buffer for rasam to 20",
        "orders for customer 9876543210 this month",
    ]
