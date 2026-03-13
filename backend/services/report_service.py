import io
import csv
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from backend.models.models import Employee, Event

logger = logging.getLogger(__name__)

async def generate_pdf_report(db: AsyncSession, employee_id: int) -> bytes:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.colors import HexColor
        from reportlab.lib.units import cm
    except ImportError:
        raise ValueError("reportlab not installed. Run: pip install reportlab")

    result = await db.execute(
        select(Employee).options(
            selectinload(Employee.violations),
            selectinload(Employee.risk_score),
            selectinload(Employee.events),
        ).where(Employee.id == employee_id)
    )
    employee = result.scalar_one_or_none()
    if not employee:
        raise ValueError(f"Employee {employee_id} not found")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    story = []
    story.append(Paragraph(f"SentinelAI Risk Report - {employee.name}", styles["Title"]))
    story.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]))
    story.append(Spacer(1, 0.3 * cm))

    risk = employee.risk_score
    viol = employee.violations
    data = [
        ["Field", "Value"],
        ["Name", employee.name],
        ["IP", employee.ip or "N/A"],
        ["Status", employee.status.value],
        ["Risk Score", f"{risk.score:.1f}" if risk else "0"],
        ["Risk Level", risk.level.value if risk else "LOW"],
        ["USB Events", str(viol.usb_count if viol else 0)],
        ["Bulk Copy", str(viol.bulk_count if viol else 0)],
        ["Late Logins", str(viol.late_count if viol else 0)],
        ["Unauth Apps", str(viol.app_count if viol else 0)],
        ["Keyloggers", str(viol.keylogger_count if viol else 0)],
        ["Network", str(viol.network_count if viol else 0)],
    ]
    t = Table(data, colWidths=[6*cm, 10*cm])
    t.setStyle(TableStyle([("GRID", (0,0), (-1,-1), 0.5, HexColor("#cccccc")), ("BACKGROUND", (0,0), (-1,0), HexColor("#333333")), ("TEXTCOLOR", (0,0), (-1,0), HexColor("#ffffff"))]))
    story.append(t)
    doc.build(story)
    return buffer.getvalue()

async def generate_csv_export(db: AsyncSession, employee_id: int = None) -> bytes:
    query = select(Event).order_by(Event.timestamp.desc()).limit(10000)
    if employee_id:
        query = query.where(Event.employee_id == employee_id)
    result = await db.execute(query)
    events = result.scalars().all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "employee_id", "event_type", "metadata", "timestamp", "source_ip"])
    for ev in events:
        writer.writerow([ev.id, ev.employee_id, ev.event_type, str(ev.metadata), ev.timestamp, ev.source_ip])
    return output.getvalue().encode("utf-8")
