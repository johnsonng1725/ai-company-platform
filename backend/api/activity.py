import asyncio
import json
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import AsyncGenerator

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
    company_id: int = Query(...),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_company(current_user, db, company_id)
    logs = (
        db.query(models.ActivityLog)
        .filter(models.ActivityLog.company_id == company_id)
        .order_by(models.ActivityLog.created_at.desc())
        .offset(offset).limit(limit).all()
    )
    return [_enrich(log) for log in logs]


@router.get("/stream")
async def activity_stream(
    company_id: int = Query(...),
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    from backend.core.config import settings
    from jose import jwt, JWTError

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError):
        async def error_gen():
            yield 'data: {"error": "unauthorized"}\n\n'
        return StreamingResponse(error_gen(), media_type="text/event-stream")

    # Verify ownership
    with SessionLocal() as session:
        company = session.query(models.Company).filter(
            models.Company.id == company_id,
            models.Company.owner_id == user_id,
        ).first()
        if not company:
            async def error_gen():
                yield 'data: {"error": "forbidden"}\n\n'
            return StreamingResponse(error_gen(), media_type="text/event-stream")

    async def event_generator() -> AsyncGenerator[str, None]:
        last_id = 0
        with SessionLocal() as session:
            latest = (
                session.query(models.ActivityLog)
                .filter(models.ActivityLog.company_id == company_id)
                .order_by(models.ActivityLog.id.desc()).first()
            )
            if latest:
                last_id = latest.id

        yield f"data: {json.dumps({'type': 'connected'})}\n\n"

        while True:
            await asyncio.sleep(2)
            with SessionLocal() as session:
                new_logs = (
                    session.query(models.ActivityLog)
                    .filter(
                        models.ActivityLog.company_id == company_id,
                        models.ActivityLog.id > last_id,
                    )
                    .order_by(models.ActivityLog.id.asc()).limit(20).all()
                )
                for log in new_logs:
                    last_id = log.id
                    yield f"data: {json.dumps({'type': 'activity', 'id': log.id, 'level': log.level, 'message': log.message, 'employee_name': log.employee.name if log.employee else None, 'employee_emoji': log.employee.role_emoji if log.employee else None, 'created_at': log.created_at.isoformat()})}\n\n"

                employees = session.query(models.AIEmployee).filter(
                    models.AIEmployee.company_id == company_id
                ).all()
                yield f"data: {json.dumps({'type': 'employee_status', 'employees': [{'id': e.id, 'status': e.status, 'current_task': e.current_task, 'last_active': e.last_active.isoformat() if e.last_active else None} for e in employees]})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
