from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models
from backend.core.auth import get_current_user
from backend.api.company import get_company

router = APIRouter(prefix="/api/employees", tags=["tasks"])


@router.get("/{employee_id}/tasks")
def list_tasks(
    employee_id: int,
    company_id: int = Query(...),
    limit: int = Query(50, le=200),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_company(current_user, db, company_id)
    emp = _get_emp(employee_id, company_id, db)
    tasks = (
        db.query(models.Task)
        .filter(models.Task.employee_id == emp.id)
        .order_by(models.Task.created_at.asc())
        .limit(limit)
        .all()
    )
    return [_task_out(t) for t in tasks]


@router.post("/{employee_id}/chat")
def send_message(
    employee_id: int,
    body: dict,
    company_id: int = Query(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """CEO sends a message/instruction to an AI employee → queues as a task."""
    get_company(current_user, db, company_id)
    emp = _get_emp(employee_id, company_id, db)

    message = (body.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if emp.status == "working":
        raise HTTPException(status_code=400, detail=f"{emp.name} is currently working. Please wait.")

    # Create the task
    task = models.Task(
        employee_id=emp.id,
        title=message[:120],           # first 120 chars as title
        description=message,
        status="pending",
    )
    db.add(task)

    # Update employee status
    emp.status = "working"
    emp.current_task = message[:80] + ("..." if len(message) > 80 else "")
    emp.last_active = datetime.utcnow()

    db.add(models.ActivityLog(
        company_id=company_id,
        employee_id=emp.id,
        level="info",
        message=f"💬 CEO → {emp.name}: {message[:80]}{'...' if len(message) > 80 else ''}",
    ))
    db.commit()
    db.refresh(task)
    return _task_out(task)


def _get_emp(employee_id: int, company_id: int, db: Session) -> models.AIEmployee:
    emp = db.query(models.AIEmployee).filter(
        models.AIEmployee.id == employee_id,
        models.AIEmployee.company_id == company_id,
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


def _task_out(task: models.Task) -> dict:
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "result": task.result,
        "error": task.error,
        "created_at": task.created_at.isoformat(),
        "updated_at": task.updated_at.isoformat(),
    }
