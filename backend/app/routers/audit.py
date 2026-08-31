from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.domain import AuditLog, User, UserRoleEnum
from app.routers.auth import require_role

router = APIRouter(prefix="/api/audit", tags=["Security & Compliance Audit Logging"])

@router.get("")
def get_audit_logs(
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    actor_username: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.ADMIN.value, UserRoleEnum.ANALYTICS_DBA.value]))
):
    """Retrieve filtered, paginated compliance audit logs (Admin / DBA only)."""
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if actor_username:
        query = query.filter(AuditLog.actor_username.ilike(f"%{actor_username}%"))

    total = query.count()
    items = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": items
    }
