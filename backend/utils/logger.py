from __future__ import annotations

import logging
from typing import Optional

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
        cursor = db.cursor()
        try:
            effective_admin_id = admin_id
            if effective_admin_id is not None:
                cursor.execute(
                    "SELECT admin_id FROM admin_users WHERE admin_id=%s LIMIT 1",
                    (effective_admin_id,),
                )
                if cursor.fetchone() is None:
                    effective_admin_id = None

            if effective_admin_id is None:
                cursor.execute(
                    "SELECT admin_id FROM admin_users ORDER BY admin_id LIMIT 1"
                )
                row = cursor.fetchone()
                if not row:
                    return
                effective_admin_id = row[0]
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
