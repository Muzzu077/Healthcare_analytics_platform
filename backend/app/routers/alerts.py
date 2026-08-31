from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.domain import Alert, User
from app.routers.auth import get_current_user
from app.services.event_service import event_manager
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/alerts", tags=["Clinical & Performance Alerts Center"])

@router.get("")
def get_alerts(
    category: Optional[str] = None,
    severity: Optional[str] = None,
    resolved: Optional[bool] = False,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Retrieve filtered active and historical alert events."""
    query = db.query(Alert)
    
    if resolved is not None:
        query = query.filter(Alert.is_resolved == resolved)
    if category:
        query = query.filter(Alert.category == category)
    if severity:
        query = query.filter(Alert.severity == severity)

    return query.order_by(Alert.created_at.desc()).limit(limit).all()

@router.put("/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark an alert as acknowledged by a clinical staff member."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_acknowledged = True
    alert.acknowledged_by_user_id = current_user.id
    alert.acknowledged_at = datetime.utcnow()
    db.commit()

    log_audit_event(
        db=db,
        action="ACKNOWLEDGE_ALERT",
        resource_type="Alert",
        resource_id=str(alert.id),
        actor_user_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        metadata={"alert_type": alert.alert_type, "severity": alert.severity}
    )

    return {"message": "Alert acknowledged", "alert": alert}

@router.put("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark an alert as resolved and broadcast update over WebSockets."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_resolved = True
    alert.resolved_by_user_id = current_user.id
    alert.resolved_at = datetime.utcnow()
    db.commit()

    log_audit_event(
        db=db,
        action="RESOLVE_ALERT",
        resource_type="Alert",
        resource_id=str(alert.id),
        actor_user_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        metadata={"alert_type": alert.alert_type, "severity": alert.severity}
    )

    await event_manager.broadcast_event(
        event_type="alert_resolved",
        payload={
            "id": alert.id,
            "patient_id": alert.patient_id,
            "alert_type": alert.alert_type,
            "is_resolved": True,
            "resolved_by": current_user.full_name,
            "resolved_at": alert.resolved_at.isoformat()
        },
        patient_id=alert.patient_id,
        actor_user_id=current_user.id
    )

    return {"message": "Alert marked as resolved", "alert": alert}
