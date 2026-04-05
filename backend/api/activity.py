import asyncio
import json
from datetime import datetime
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.database import get_db, SessionLocal
from backend import models, schemas
from backend.core.auth import get_current_user
from backend.api.company import get_company

router = APIRouter(prefix="/api/activity", tags=["activity"])


def _enrich(log: models.ActivityLog) -> dict:
    return {
        "id": log.id,
        "level": log.level,
        "message": log.message,
        "data": log.data or {},
        "employee_id": log.employee_id,
        "employee_name": log.employee.name if log.employee else None,
        "employee_emoji": log.employee.role_emoji if log.employee else None,
        "created_at": log.created_at,
    }


@router.get("", response_model=list[schemas.ActivityOut])
def list_activity(
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = get_company(current_user, db)
    logs = (
        db.query(models.ActivityLog)
        .filter(models.ActivityLog.company_id == company.id)
        .order_by(models.ActivityLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [_enrich(log) for log in logs]


@router.get("/stream")
async def activity_stream(
    token: str = Query(..., description="JWT token for auth"),
    db: Session = Depends(get_db),
):
    """Server-Sent Events stream for real-time activity updates."""
    from backend.core.auth import get_current_user
    from backend.core.config import settings
    from jose import jwt, JWTError

    # Authenticate via query param (EventSource can't set headers)
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError):
        async def error_gen():
            yield "data: {\"error\": \"unauthorized\"}\n\n"
        return StreamingResponse(error_gen(), media_type="text/event-stream")

    company = db.query(models.Company).filter(models.Company.owner_id == user_id).first()
    company_id = company.id if company else None

    async def event_generator() -> AsyncGenerator[str, None]:
        last_id = 0
        if company_id:
            with SessionLocal() as session:
                latest = (
                    session.query(models.ActivityLog)
                    .filter(models.ActivityLog.company_id == company_id)
                    .order_by(models.ActivityLog.id.desc())
                    .first()
                )
                if latest:
                    last_id = latest.id

        yield f"data: {json.dumps({'type': 'connected', 'message': 'Stream connected'})}\n\n"

        while True:
            await asyncio.sleep(2)
            if not company_id:
                continue
            with SessionLocal() as session:
                new_logs = (
                    session.query(models.ActivityLog)
                    .filter(
                        models.ActivityLog.company_id == company_id,
                        models.ActivityLog.id > last_id,
                    )
                    .order_by(models.ActivityLog.id.asc())
                    .limit(20)
                    .all()
                )
                for log in new_logs:
                    last_id = log.id
                    payload = {
                        "type": "activity",
                        "id": log.id,
                        "level": log.level,
                        "message": log.message,
                        "employee_name": log.employee.name if log.employee else None,
                        "employee_emoji": log.employee.role_emoji if log.employee else None,
                        "created_at": log.created_at.isoformat(),
                    }
                    yield f"data: {json.dumps(payload)}\n\n"

                # Also push employee status updates
                employees = (
                    session.query(models.AIEmployee)
                    .filter(models.AIEmployee.company_id == company_id)
                    .all()
                )
                status_payload = {
                    "type": "employee_status",
                    "employees": [
                        {
                            "id": e.id,
                            "status": e.status,
                            "current_task": e.current_task,
                            "last_active": e.last_active.isoformat() if e.last_active else None,
                        }
                        for e in employees
                    ],
                }
                yield f"data: {json.dumps(status_payload)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
