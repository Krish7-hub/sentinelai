from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database import get_db
from backend.models.models import Violation, RiskScore, User, RiskLevel
from backend.auth.jwt_handler import get_current_user

router = APIRouter()

@router.get("/summary")
async def violations_summary(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Violation))
    viols = result.scalars().all()
    totals = {
        "usb": sum(v.usb_count for v in viols),
        "bulk_copy": sum(v.bulk_count for v in viols),
        "late_login": sum(v.late_count for v in viols),
        "unauthorized_app": sum(v.app_count for v in viols),
        "keylogger": sum(v.keylogger_count for v in viols),
        "network": sum(v.network_count for v in viols),
    }
    risk_result = await db.execute(select(RiskScore))
    scores = risk_result.scalars().all()
    risk_dist = {
        "LOW": sum(1 for s in scores if s.level == RiskLevel.LOW),
        "MEDIUM": sum(1 for s in scores if s.level == RiskLevel.MEDIUM),
        "HIGH": sum(1 for s in scores if s.level == RiskLevel.HIGH),
    }
    return {"totals": totals, "risk_distribution": risk_dist}
