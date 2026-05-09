from __future__ import annotations

import logging
from typing import Optional

from .rbac import get_role_id, parse_role_ids

logger = logging.getLogger(__name__)


def log_admin_action(
    db,
    *,
    admin_id: Optional[int],
    action_type: str,
    entity_type: str,
    entity_id: int,
    description: Optional[str] = None,
) -> None:
    """Persist an admin action to the admin_logs table without impacting the main flow."""
    try:
        cursor = db.cursor(dictionary=True)
        try:
            effective_admin_id = admin_id
            admin_role_id = get_role_id(cursor, "admin")

            def is_valid_admin(candidate: Optional[int]) -> bool:
                if candidate is None or admin_role_id is None:
                    return False
                cursor.execute(
                    """
                    SELECT roles, admin_is_active
                    FROM customers
                    WHERE customer_id=%s
                    LIMIT 1
                    """,
                    (candidate,),
                )
                row = cursor.fetchone()
                if not row:
                    return False
                if not bool(row.get("admin_is_active", True)):
                    return False
                roles = parse_role_ids(row.get("roles"))
                return admin_role_id in roles

            if not is_valid_admin(effective_admin_id):
                cursor.execute("""
                    SELECT customer_id, roles
                    FROM customers
                    WHERE admin_is_active = 1
                    ORDER BY customer_id ASC
                    """)
                for row in cursor.fetchall():
                    roles = parse_role_ids(row.get("roles"))
                    if admin_role_id and admin_role_id in roles:
                        effective_admin_id = row["customer_id"]
                        break
                else:
                    effective_admin_id = None

            if effective_admin_id is None:
                return
            cursor.execute(
                """
                INSERT INTO admin_logs (admin_id, action_type, entity_type, entity_id, description)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (effective_admin_id, action_type, entity_type, entity_id, description),
            )
            db.commit()
        finally:
            cursor.close()
    except Exception as exc:  # pragma: no cover - logging failure should not break flow
        try:
            db.rollback()
        except Exception:  # pragma: no cover
            pass
        logger.warning("Failed to write admin log: %s", exc)
