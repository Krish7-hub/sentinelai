from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete as sql_delete
from sqlalchemy.orm import selectinload
from backend.database import get_db
from backend.models.models import Employee, Violation, RiskScore, User, UserRole, EmployeeStatus, Alert, Event, RiskLevel
from backend.auth.jwt_handler import get_current_user, require_admin

router = APIRouter()

def serialize_employee(emp):
    risk = emp.risk_score
    viol = emp.violations
    return {
        "id": emp.id, "name": emp.name, "department": emp.department,
        "ip": emp.ip, "hostname": emp.hostname, "status": emp.status.value,
        "usb_disabled": emp.usb_disabled,
        "last_seen": emp.last_seen.isoformat() if emp.last_seen else None,
        "registered_at": emp.registered_at.isoformat() if emp.registered_at else None,
        "risk": {"score": risk.score if risk else 0, "level": risk.level.value if risk else "LOW", "history": risk.history if risk else []},
        "violations": {"usb_count": viol.usb_count if viol else 0, "bulk_count": viol.bulk_count if viol else 0, "late_count": viol.late_count if viol else 0, "app_count": viol.app_count if viol else 0, "keylogger_count": viol.keylogger_count if viol else 0, "network_count": viol.network_count if viol else 0},
    }

@router.get("/")
async def list_employees(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Employee).options(selectinload(Employee.violations), selectinload(Employee.risk_score)).order_by(Employee.name))
    return [serialize_employee(e) for e in result.scalars().all()]

@router.get("/{employee_id}")
async def get_employee(employee_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Employee).options(selectinload(Employee.violations), selectinload(Employee.risk_score), selectinload(Employee.alerts)).where(Employee.id == employee_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return serialize_employee(emp)

@router.post("/{employee_id}/disable-usb")
async def disable_usb(employee_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    emp.usb_disabled = True
    await db.commit()
    return {"message": f"USB disabled for {emp.name}", "usb_disabled": True}

@router.post("/{employee_id}/enable-usb")
async def enable_usb(employee_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    emp.usb_disabled = False
    await db.commit()
    return {"message": f"USB enabled for {emp.name}", "usb_disabled": False}

@router.post("/{employee_id}/send-warning")
async def send_warning(employee_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in (UserRole.ADMIN, UserRole.ANALYST):
        raise HTTPException(status_code=403, detail="Analyst or Admin required")
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    alert = Alert(employee_id=employee_id, message=f"Security warning issued by {current_user.username}.", severity="WARNING")
    db.add(alert)
    await db.commit()
    return {"message": f"Warning sent to {emp.name}"}

@router.post("/{employee_id}/reset-violations")
async def reset_violations(employee_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    result = await db.execute(select(Violation).where(Violation.employee_id == employee_id))
    viol = result.scalar_one_or_none()
    if viol:
        viol.usb_count = viol.bulk_count = viol.late_count = viol.app_count = viol.keylogger_count = viol.network_count = 0
    result2 = await db.execute(select(RiskScore).where(RiskScore.employee_id == employee_id))
    risk = result2.scalar_one_or_none()
    if risk:
        risk.score = 0.0
        risk.level = RiskLevel.LOW
    await db.commit()
    return {"message": "Violations and risk score reset"}

@router.post("/{employee_id}/clear-data")
async def clear_employee_data(employee_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    await db.execute(sql_delete(Event).where(Event.employee_id == employee_id))
    await db.execute(sql_delete(Alert).where(Alert.employee_id == employee_id))
    result2 = await db.execute(select(Violation).where(Violation.employee_id == employee_id))
    viol = result2.scalar_one_or_none()
    if viol:
        viol.usb_count = viol.bulk_count = viol.late_count = viol.app_count = viol.keylogger_count = viol.network_count = 0
    result3 = await db.execute(select(RiskScore).where(RiskScore.employee_id == employee_id))
    risk = result3.scalar_one_or_none()
    if risk:
        risk.score = 0.0
        risk.level = RiskLevel.LOW
        risk.history = []
    await db.commit()
    return {"message": f"All data cleared for {emp.name}. Employee record kept."}

@router.delete("/{employee_id}")
async def delete_employee(employee_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    name = emp.name
    await db.delete(emp)
    await db.commit()
    return {"message": f"Employee {name} and all related data permanently deleted"}