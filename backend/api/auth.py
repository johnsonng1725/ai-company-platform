from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models, schemas
from backend.core.auth import verify_password, hash_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.Token)
def register(data: schemas.UserRegister, db: Session = Depends(get_db)):
    import os
    if os.getenv("REGISTRATIONS_OPEN", "true").lower() != "true":
        raise HTTPException(status_code=403, detail="Registration is currently closed. This platform is in private access.")

    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Auto-create company on signup so user lands on a working dashboard
    company_name = data.full_name or data.email.split("@")[0]
    company = models.Company(
        owner_id=user.id,
        name=f"{company_name}'s AI Company",
        description="My one-person company powered by AI employees.",
    )
    db.add(company)
    db.flush()  # get company.id without committing yet

    db.add(models.ActivityLog(
        company_id=company.id,
        employee_id=None,
        level="success",
        message="🎉 Welcome! Your AI company has been created. Hire your first employee to get started.",
    ))
    db.commit()

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/login", response_model=schemas.Token)
def login(data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(lambda: None)):
    # Injected properly via main router
    return current_user
