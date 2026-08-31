from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, Dict, Any
from app.models.domain import AuditLog, User

def log_audit_event(
    db: Session,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    actor_user_id: Optional[int] = None,
    actor_username: Optional[str] = None,
    actor_role: Optional[str] = None,
    ip_address: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> AuditLog:
    """Centralized audit logging for healthcare compliance and query governance."""
    try:
        # If actor details are not supplied but user_id is, look up user
        if actor_user_id and not actor_username:
            u = db.query(User).filter(User.id == actor_user_id).first()
            if u:
                actor_username = u.username
                actor_role = u.role

        audit_entry = AuditLog(
            actor_user_id=actor_user_id,
            actor_username=actor_username or "system",
            actor_role=actor_role or "system",
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            ip_address=ip_address,
            metadata_json=metadata or {},
            timestamp=datetime.utcnow()
        )
        db.add(audit_entry)
        db.commit()
        return audit_entry
    except Exception as e:
        db.rollback()
        print(f"Failed to record audit log: {e}")
        return None
