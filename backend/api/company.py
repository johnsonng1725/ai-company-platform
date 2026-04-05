from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models, schemas
from backend.core.auth import get_current_user

router = APIRouter(prefix="/api/companies", tags=["company"])


# ── Shared helper ─────────────────────────────────────────────────────────────

def get_company(user: models.User, db: Session, company_id: int) -> models.Company:
    """Get a company and verify the user owns it."""
    company = db.query(models.Company).filter(
        models.Company.id == company_id,
        models.Company.owner_id == user.id,
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[schemas.CompanyOut])
def list_companies(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    companies = db.query(models.Company).filter(
        models.Company.owner_id == current_user.id
    ).order_by(models.Company.created_at.asc()).all()
    return [_to_out(c, db) for c in companies]


@router.post("", response_model=schemas.CompanyOut)
def create_company(
    data: schemas.CompanyCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = models.Company(
        owner_id=current_user.id,
        name=data.name,
        description=data.description,
        anthropic_api_key=data.anthropic_api_key,
        openai_api_key=data.openai_api_key,
    )
    db.add(company)
    db.flush()
    db.add(models.ActivityLog(
        company_id=company.id,
        level="success",
        message=f"🏢 Company \"{data.name}\" created. Start by hiring AI employees!",
    ))
    db.commit()
    db.refresh(company)
    return _to_out(company, db)


@router.get("/{company_id}", response_model=schemas.CompanyOut)
def get_one_company(
    company_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = get_company(current_user, db, company_id)
    return _to_out(company, db)


@router.put("/{company_id}", response_model=schemas.CompanyOut)
def update_company(
    company_id: int,
    data: schemas.CompanyUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = get_company(current_user, db, company_id)
    if data.name is not None:
        company.name = data.name
    if data.description is not None:
        company.description = data.description
    if data.anthropic_api_key is not None:
        company.anthropic_api_key = data.anthropic_api_key
    if data.openai_api_key is not None:
        company.openai_api_key = data.openai_api_key
    db.commit()
    db.refresh(company)
    return _to_out(company, db)


@router.delete("/{company_id}")
def delete_company(
    company_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = get_company(current_user, db, company_id)
    db.delete(company)
    db.commit()
    return {"ok": True}


def _to_out(company: models.Company, db: Session) -> dict:
    employee_count = db.query(models.AIEmployee).filter(
        models.AIEmployee.company_id == company.id,
        models.AIEmployee.is_active == True,
    ).count()
    pending_proposals = db.query(models.Proposal).filter(
        models.Proposal.company_id == company.id,
        models.Proposal.status == "pending",
    ).count()
    return {
        "id": company.id,
        "name": company.name,
        "description": company.description,
        "created_at": company.created_at,
        "has_anthropic_key": bool(company.anthropic_api_key),
        "has_openai_key": bool(company.openai_api_key),
        "employee_count": employee_count,
        "pending_proposals": pending_proposals,
    }
