from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database import get_db
from backend.models.models import Employee, Event, EmployeeStatus, User
from backend.auth.jwt_handler import get_agent_employee, get_current_user
from backend.services.risk_engine import process_event

router = APIRouter()

VALID_EVENT_TYPES = {"usb_insertion","usb_removal","bulk_copy","late_login","unauthorized_app","keylogger_detected","suspicious_port","heartbeat"}

class EventSubmitRequest(BaseModel):
    event_type: str
    metadata: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = None

class HeartbeatRequest(BaseModel):
    ip: Optional[str] = None
    hostname: Optional[str] = None

@router.post("/submit")
async def submit_event(body: EventSubmitRequest, db: AsyncSession = Depends(get_db), agent: Employee = Depends(get_agent_employee)):
    if body.event_type not in VALID_EVENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid event type: {body.event_type}")
    agent.last_seen = datetime.utcnow()
    agent.status = EmployeeStatus.ONLINE
    event = Event(employee_id=agent.id, event_type=body.event_type, event_metadata=body.metadata, timestamp=body.timestamp or datetime.utcnow(), source_ip=agent.ip)
    db.add(event)
    await db.flush()
    action = {"action": "none"}
    if body.event_type not in ("heartbeat", "usb_removal"):
        action = await process_event(db, agent, body.event_type, check_dedup=False)
    await db.commit()
    return {"status": "accepted", "event_id": event.id, "action": action.get("action", "none"), "usb_disabled": agent.usb_disabled}

@router.post("/heartbeat")
async def heartbeat(body: HeartbeatRequest, db: AsyncSession = Depends(get_db), agent: Employee = Depends(get_agent_employee)):
    agent.last_seen = datetime.utcnow()
    agent.status = EmployeeStatus.ONLINE
    if body.ip:
        agent.ip = body.ip
    if body.hostname:
        agent.hostname = body.hostname
    await db.commit()
    return {"status": "ok", "usb_disabled": agent.usb_disabled, "action": "disable_usb" if agent.usb_disabled else "none"}

@router.get("/")
async def list_events(employee_id: Optional[int] = None, event_type: Optional[str] = None, limit: int = 100, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(Event).order_by(Event.timestamp.desc())
    if employee_id:
        query = query.where(Event.employee_id == employee_id)
    if event_type:
        query = query.where(Event.event_type == event_type)
    query = query.limit(min(limit, 1000))
    result = await db.execute(query)
    events = result.scalars().all()
    return [{"id": e.id, "employee_id": e.employee_id, "event_type": e.event_type, "metadata": e.event_metadata, "timestamp": e.timestamp.isoformat(), "source_ip": e.source_ip} for e in events]
