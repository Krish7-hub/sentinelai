from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.models.models import User
from backend.auth.jwt_handler import require_admin
from backend.services.report_service import generate_pdf_report, generate_csv_export

router = APIRouter()

@router.get("/pdf/{employee_id}")
async def export_pdf(employee_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    try:
        pdf_bytes = await generate_pdf_report(db, employee_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=report_employee_{employee_id}.pdf"})

@router.get("/csv")
async def export_csv(employee_id: int = None, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    csv_bytes = await generate_csv_export(db, employee_id)
    filename = f"events_employee_{employee_id}.csv" if employee_id else "events_all.csv"
    return Response(content=csv_bytes, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})
