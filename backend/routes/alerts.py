from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database import get_db
from backend.models.models import Alert, User, UserRole
from backend.auth.jwt_handler import get_current_user

router = APIRouter()

@router.get("/")
async def list_alerts(resolved: bool = None, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(Alert).order_by(Alert.timestamp.desc()).limit(200)
    if resolved is not None:
        query = query.where(Alert.resolved == resolved)
    result = await db.execute(query)
    alerts = result.scalars().all()
    return [{"id": a.id, "employee_id": a.employee_id, "message": a.message, "severity": a.severity, "timestamp": a.timestamp.isoformat(), "resolved": a.resolved, "resolved_by": a.resolved_by} for a in alerts]

@router.post("/{alert_id}/resolve")
async def resolve_alert(alert_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in (UserRole.ADMIN, UserRole.ANALYST):
        raise HTTPException(status_code=403, detail="Analyst or Admin required")
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.resolved = True
    alert.resolved_by = current_user.username
    alert.resolved_at = datetime.utcnow()
    await db.commit()
    return {"message": "Alert resolved"}
