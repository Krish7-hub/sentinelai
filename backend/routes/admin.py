from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.database import get_db
from backend.models.models import Employee, Event, Alert, RiskScore, User, RiskLevel, EmployeeStatus
from backend.auth.jwt_handler import require_admin
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/dashboard-stats")
async def dashboard_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    emp_result = await db.execute(select(Employee))
    employees = emp_result.scalars().all()
    risk_result = await db.execute(select(RiskScore))
    scores = risk_result.scalars().all()
    alert_result = await db.execute(select(Alert).where(Alert.resolved == False))
    open_alerts = alert_result.scalars().all()
    seven_days = []
    for i in range(6, -1, -1):
        day = datetime.utcnow() - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day.replace(hour=23, minute=59, second=59)
        count_result = await db.execute(select(func.count(Event.id)).where(Event.timestamp >= day_start, Event.timestamp <= day_end))
        count = count_result.scalar()
        seven_days.append({"date": day.strftime("%b %d"), "events": count})
    return {
        "total_employees": len(employees),
        "online_employees": sum(1 for e in employees if e.status == EmployeeStatus.ONLINE),
        "high_risk_count": sum(1 for s in scores if s.level == RiskLevel.HIGH),
        "medium_risk_count": sum(1 for s in scores if s.level == RiskLevel.MEDIUM),
        "open_alerts": len(open_alerts),
        "usb_disabled_count": sum(1 for e in employees if e.usb_disabled),
        "threat_trend": seven_days,
    }
