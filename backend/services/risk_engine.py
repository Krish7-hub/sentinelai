"""
Risk & Violation Engine - Core threat scoring logic
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.models.models import Employee, Violation, RiskScore, Alert, RiskLevel
from backend.services.email_service import send_high_risk_alert
from backend.services.websocket_manager import broadcast_risk_update

logger = logging.getLogger(__name__)

# Violation score weights
VIOLATION_SCORES = {
    "usb_insertion": 40,
    "bulk_copy": 50,
    "late_login": 20,
    "unauthorized_app": 50,
    "keylogger_detected": 80,
    "suspicious_port": 60,
}

# Risk level thresholds
RISK_THRESHOLDS = {
    RiskLevel.LOW: (0, 49),
    RiskLevel.MEDIUM: (50, 119),
    RiskLevel.HIGH: (120, float("inf")),
}

DECAY_RATE = 0.20  # 20% per 24h
DEDUP_WINDOW_MINUTES = 5


def calculate_risk_level(score: float) -> RiskLevel:
    if score >= 120:
        return RiskLevel.HIGH
    elif score >= 50:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW


def apply_decay(score: float, last_updated: datetime) -> float:
    hours_elapsed = (datetime.utcnow() - last_updated).total_seconds() / 3600
    days_elapsed = hours_elapsed / 24
    if days_elapsed >= 1:
        full_days = int(days_elapsed)
        decayed = score * ((1 - DECAY_RATE) ** full_days)
        return max(0.0, decayed)
    return score


async def process_event(
    db: AsyncSession,
    employee: Employee,
    event_type: str,
    check_dedup: bool = True,
) -> dict:
    """
    Core event processing. Updates violation counters and risk score.
    Returns action instructions for the agent.
    """
    if event_type not in VIOLATION_SCORES:
        return {"action": "none"}

    # Deduplication: check if same event in last 5 minutes
    if check_dedup:
        from backend.models.models import Event
        from sqlalchemy import and_
        dedup_cutoff = datetime.utcnow() - timedelta(minutes=DEDUP_WINDOW_MINUTES)
        result = await db.execute(
            select(Event).where(
                and_(
                    Event.employee_id == employee.id,
                    Event.event_type == event_type,
                    Event.timestamp >= dedup_cutoff,
                )
            )
        )
        if result.scalar_one_or_none():
            logger.info(f"Duplicate event {event_type} for employee {employee.id} - skipping")
            return {"action": "none", "reason": "duplicate"}

    # Get or create violation record
    result = await db.execute(select(Violation).where(Violation.employee_id == employee.id))
    violation = result.scalar_one_or_none()
    if not violation:
        violation = Violation(employee_id=employee.id)
        db.add(violation)
        await db.flush()

    # Increment violation counter
    counter_map = {
        "usb_insertion": "usb_count",
        "bulk_copy": "bulk_count",
        "late_login": "late_count",
        "unauthorized_app": "app_count",
        "keylogger_detected": "keylogger_count",
        "suspicious_port": "network_count",
    }
    counter_field = counter_map.get(event_type)
    if counter_field:
        current = getattr(violation, counter_field, 0)
        setattr(violation, counter_field, current + 1)
        violation.last_updated = datetime.utcnow()

    # Get or create risk score
    result = await db.execute(select(RiskScore).where(RiskScore.employee_id == employee.id))
    risk = result.scalar_one_or_none()
    if not risk:
        risk = RiskScore(employee_id=employee.id, score=0.0, history=[])
        db.add(risk)
        await db.flush()

    # Apply decay before adding new score
    if risk.last_updated:
        risk.score = apply_decay(risk.score, risk.last_updated)

    # Add violation score
    added_score = VIOLATION_SCORES[event_type]
    risk.score = min(risk.score + added_score, 500)  # cap at 500
    risk.level = calculate_risk_level(risk.score)
    risk.last_updated = datetime.utcnow()

    # Update history (keep last 30 days)
    history = risk.history or []
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    if history and history[-1]["date"] == today_str:
        history[-1]["score"] = risk.score
    else:
        history.append({"date": today_str, "score": risk.score})
    risk.history = history[-30:]

    await db.flush()

    # Create alert if HIGH risk
    action = {"action": "none"}
    if risk.level == RiskLevel.HIGH:
        existing_alert = await db.execute(
            select(Alert).where(
                Alert.employee_id == employee.id,
                Alert.resolved == False,
                Alert.severity == "HIGH",
            )
        )
        if not existing_alert.scalar_one_or_none():
            alert = Alert(
                employee_id=employee.id,
                message=f"Employee {employee.name} has reached HIGH risk level (score: {risk.score:.1f})",
                severity="HIGH",
            )
            db.add(alert)
            # Send email notification (non-blocking)
            try:
                await send_high_risk_alert(employee, risk, violation)
            except Exception as e:
                logger.error(f"Email notification failed: {e}")

        if event_type == "usb_insertion":
            action = {"action": "disable_usb"}

    # Broadcast WebSocket update
    try:
        await broadcast_risk_update({
            "type": "risk_update",
            "employee_id": employee.id,
            "employee_name": employee.name,
            "score": risk.score,
            "level": risk.level.value,
            "event_type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
        })
    except Exception as e:
        logger.error(f"WebSocket broadcast failed: {e}")

    return action


async def recalculate_risk_decay(db: AsyncSession):
    """Called by scheduler every hour to apply risk decay"""
    result = await db.execute(select(RiskScore))
    scores = result.scalars().all()
    updated = 0
    for risk in scores:
        if risk.last_updated and risk.score > 0:
            new_score = apply_decay(risk.score, risk.last_updated)
            if abs(new_score - risk.score) > 0.1:
                risk.score = new_score
                risk.level = calculate_risk_level(new_score)
                updated += 1
    await db.flush()
    logger.info(f"Risk decay applied to {updated} employees")


class RiskDecayService:
    pass
