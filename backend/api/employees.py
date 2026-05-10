from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models, schemas
from backend.core.auth import get_current_user
from backend.api.company import get_company
from backend.core.plans import enforce_employee_limit, enforce_task_limit

router = APIRouter(prefix="/api/employees", tags=["employees"])


@router.get("", response_model=list[schemas.EmployeeOut])
def list_employees(
    company_id: int = Query(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = get_company(current_user, db, company_id)
    return company.employees


@router.post("", response_model=schemas.EmployeeOut)
def create_employee(
    data: schemas.EmployeeCreate,
    company_id: int = Query(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = get_company(current_user, db, company_id)
    enforce_employee_limit(current_user, company, db)
    emp = models.AIEmployee(
        company_id=company.id,
        name=data.name,
        role=data.role,
        role_emoji=data.role_emoji,
        description=data.description,
        capabilities=data.capabilities,
        schedule_cron=data.schedule_cron,
        config=data.config,
    )
    db.add(emp)
    db.add(models.ActivityLog(
        company_id=company.id,
        level="info",
        message=f"New AI employee hired: {data.name} ({data.role})",
    ))
    db.commit()
    db.refresh(emp)
    return emp


@router.get("/{employee_id}", response_model=schemas.EmployeeOut)
def get_employee(
    employee_id: int,
    company_id: int = Query(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_emp(employee_id, company_id, current_user, db)


@router.put("/{employee_id}", response_model=schemas.EmployeeOut)
def update_employee(
    employee_id: int,
    data: schemas.EmployeeUpdate,
    company_id: int = Query(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    emp = _get_emp(employee_id, company_id, current_user, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(emp, field, value)
    db.commit()
    db.refresh(emp)
    return emp


@router.delete("/{employee_id}")
def delete_employee(
    employee_id: int,
    company_id: int = Query(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    emp = _get_emp(employee_id, company_id, current_user, db)
    name = emp.name
    db.delete(emp)
    db.add(models.ActivityLog(
        company_id=company_id,
        level="warning",
        message=f"AI employee {name} has been removed.",
    ))
    db.commit()
    return {"ok": True}


@router.post("/{employee_id}/run")
def trigger_employee(
    employee_id: int,
    company_id: int = Query(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    emp = _get_emp(employee_id, company_id, current_user, db)
    if emp.status == "working":
        raise HTTPException(status_code=400, detail="Employee is already working")

    company = get_company(current_user, db, company_id)
    enforce_task_limit(current_user, company, db)

    emp.status = "working"
    emp.current_task = "Starting work cycle..."
    emp.last_active = datetime.utcnow()
    db.add(models.ActivityLog(
        company_id=company_id,
        employee_id=emp.id,
        level="info",
        message=f"{emp.name} has been triggered manually.",
    ))
    task = models.Task(
        employee_id=emp.id,
        title=f"Manual run — {emp.role}",
        description=f"Manually triggered by CEO at {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        status="pending",
    )
    db.add(task)
    db.commit()
    return {"ok": True, "task_id": task.id, "message": f"{emp.name} has started working."}


def _get_emp(employee_id: int, company_id: int, user: models.User, db: Session) -> models.AIEmployee:
    get_company(user, db, company_id)  # verify ownership
    emp = db.query(models.AIEmployee).filter(
        models.AIEmployee.id == employee_id,
        models.AIEmployee.company_id == company_id,
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp
