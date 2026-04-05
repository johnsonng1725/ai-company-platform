from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models, schemas
from backend.core.auth import get_current_user

router = APIRouter(prefix="/api/company", tags=["company"])


def get_company(user: models.User, db: Session) -> models.Company:
    company = db.query(models.Company).filter(models.Company.owner_id == user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="No company found. Please create one first.")
    return company


@router.get("", response_model=schemas.CompanyOut)
def get_my_company(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = db.query(models.Company).filter(models.Company.owner_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="No company found")
    return _to_out(company)


@router.post("", response_model=schemas.CompanyOut)
def create_company(
    data: schemas.CompanyCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(models.Company).filter(models.Company.owner_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Company already exists")

    company = models.Company(
        owner_id=current_user.id,
        name=data.name,
        description=data.description,
        anthropic_api_key=data.anthropic_api_key,
        openai_api_key=data.openai_api_key,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return _to_out(company)


@router.put("", response_model=schemas.CompanyOut)
def update_company(
    data: schemas.CompanyUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = get_company(current_user, db)
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
    return _to_out(company)


def _to_out(company: models.Company) -> dict:
    return {
        "id": company.id,
        "name": company.name,
        "description": company.description,
        "created_at": company.created_at,
        "has_anthropic_key": bool(company.anthropic_api_key),
        "has_openai_key": bool(company.openai_api_key),
    }
