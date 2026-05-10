"""Plan limits and enforcement helpers."""

from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend import models

# ── Plan definitions ─────────────────────────────────────────────────────────
# None means unlimited

PLAN_LIMITS = {
    # trial = full Pro features for 7 days, then must upgrade
    "trial":   {"max_employees": 10,   "monthly_tasks": 300},
    "starter": {"max_employees": None, "monthly_tasks": None},
    "pro":     {"max_employees": 10,   "monthly_tasks": 300},
    "max":     {"max_employees": None, "monthly_tasks": 1000},
}


def get_limits(plan: str) -> dict:
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["trial"])


def enforce_employee_limit(user: models.User, company: models.Company, db: Session):
    """Raise 403 if adding another employee would exceed the plan limit."""
    limits = get_limits(user.plan)
    max_emp = limits["max_employees"]
    if max_emp is None:
        return  # unlimited
    current_count = (
        db.query(models.AIEmployee)
        .filter(models.AIEmployee.company_id == company.id)
        .count()
    )
    if current_count >= max_emp:
        plan_name = user.plan.capitalize()
        raise HTTPException(
            status_code=403,
            detail=(
                f"Your {plan_name} plan allows up to {max_emp} AI employees. "
                f"Upgrade your plan to add more."
            ),
        )


def enforce_task_limit(user: models.User, company: models.Company, db: Session):
    """Raise 403 if this month's task count would exceed the plan limit."""
    limits = get_limits(user.plan)
    max_tasks = limits["monthly_tasks"]
    if max_tasks is None:
        return  # unlimited

    # Count tasks created this calendar month across ALL employees in this company
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    employee_ids = [emp.id for emp in company.employees]
    if not employee_ids:
        return

    used = (
        db.query(models.Task)
        .filter(
            models.Task.employee_id.in_(employee_ids),
            models.Task.created_at >= month_start,
        )
        .count()
    )
    if used >= max_tasks:
        plan_name = user.plan.capitalize()
        raise HTTPException(
            status_code=403,
            detail=(
                f"You've used all {max_tasks} tasks for this month on the {plan_name} plan. "
                f"Upgrade to get more tasks."
            ),
        )
