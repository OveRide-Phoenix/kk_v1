from datetime import datetime
from pydantic import BaseModel


class AdminLog(BaseModel):
    log_id: int
    admin_id: int
    action_type: str
    entity_type: str
    entity_id: int
    description: str | None = None
    timestamp: datetime
