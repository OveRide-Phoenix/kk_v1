from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database import get_db

router = APIRouter(prefix="/api/logs", tags=["Admin Logs"])


@router.get("/")
def get_admin_logs(
    admin_id: int | None = Query(None),
    entity_type: str | None = Query(None),
    action_type: str | None = Query(None),
    db: Session = Depends(get_db),
):
    query = (
        "SELECT al.*, cu.name AS admin_name, cu.customer_id "
        "FROM admin_logs al "
        "LEFT JOIN admin_users au ON au.admin_id = al.admin_id "
        "LEFT JOIN customers cu ON au.customer_id = cu.customer_id "
        "WHERE 1=1"
    )
    params: dict[str, object] = {}

    if admin_id is not None:
        query += " AND al.admin_id = :admin_id"
        params["admin_id"] = admin_id
    if entity_type:
        query += " AND al.entity_type = :entity_type"
        params["entity_type"] = entity_type
    if action_type:
        query += " AND al.action_type = :action_type"
        params["action_type"] = action_type

    query += " ORDER BY al.timestamp DESC"

    result = db.execute(text(query), params)
    return [dict(row) for row in result.mappings().all()]
