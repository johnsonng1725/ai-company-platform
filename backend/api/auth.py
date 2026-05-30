from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models, schemas
from backend.core.auth import verify_password, hash_password, create_access_token, get_current_user
from backend.core.email import generate_code, send_verification_email

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

# Plans users can set themselves — paid plans require Stripe webhook
SELF_SETTABLE_PLANS = {"trial", "starter"}

CODE_TTL_MINUTES = 10


def _issue_token(user: models.User) -> dict:
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": user}


def _create_and_send_code(email: str, purpose: str, db: Session) -> None:
    """Generate a fresh 6-digit code, persist it, and email it."""
    # Invalidate any previous unused codes for this email + purpose
    db.query(models.EmailVerification).filter(
        models.EmailVerification.email == email,
        models.EmailVerification.purpose == purpose,
        models.EmailVerification.used == False,
    ).delete()
    db.commit()

    code = generate_code()
    verification = models.EmailVerification(
        email=email,
        code=code,
        purpose=purpose,
        expires_at=datetime.utcnow() + timedelta(minutes=CODE_TTL_MINUTES),
    )
    db.add(verification)
    db.commit()

    send_verification_email(email, code, purpose)


# ── Register ─────────────────────────────────────────────────────────────────

@router.post("/register", status_code=202)
@limiter.limit("5/minute")
def register(request: Request, data: schemas.UserRegister, db: Session = Depends(get_db)):
    """Create account then send a verification code. Returns 202 — no token yet."""
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        is_verified=False,
    )
    db.add(user)
    db.commit()

    try:
        _create_and_send_code(data.email, "signup", db)
    except Exception:
        pass  # Don't block registration if email fails — user can request resend

    return {"detail": "Account created. Check your email for a 6-digit code."}


# ── Password login ────────────────────────────────────────────────────────────

@router.post("/login", response_model=schemas.Token)
@limiter.limit("10/minute")
def login(request: Request, data: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login with email + password. If account unverified, sends a new code instead."""
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not user.hashed_password or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_verified:
        # Send a fresh verification code so they can complete signup
        try:
            _create_and_send_code(data.email, "signup", db)
        except Exception:
            pass
        raise HTTPException(
            status_code=403,
            detail="Email not verified. We've sent a new code to your email.",
            headers={"X-Needs-Verification": "true"},
        )

    return _issue_token(user)


# ── Send code (passwordless / resend) ────────────────────────────────────────

@router.post("/send-code", status_code=202)
@limiter.limit("5/minute")
def send_code(request: Request, data: schemas.SendCodeRequest, db: Session = Depends(get_db)):
    """Send a 6-digit code to the email address. Works for login and signup."""
    if data.purpose == "login":
        user = db.query(models.User).filter(models.User.email == data.email).first()
        if not user:
            # Return same message to not leak whether email exists
            return {"detail": "If that email is registered, a code has been sent."}

    try:
        _create_and_send_code(data.email, data.purpose, db)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"detail": "Code sent. Check your email."}


# ── Verify code ───────────────────────────────────────────────────────────────

@router.post("/verify-code", response_model=schemas.Token)
@limiter.limit("10/minute")
def verify_code(request: Request, data: schemas.VerifyCodeRequest, db: Session = Depends(get_db)):
    """Submit a 6-digit code. Returns a JWT on success."""
    record = db.query(models.EmailVerification).filter(
        models.EmailVerification.email == data.email,
        models.EmailVerification.purpose == data.purpose,
        models.EmailVerification.used == False,
    ).order_by(models.EmailVerification.created_at.desc()).first()

    if not record or record.code != data.code:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    if datetime.utcnow() > record.expires_at:
        raise HTTPException(status_code=400, detail="Code has expired. Please request a new one.")

    # Mark code used
    record.used = True
    db.commit()

    if data.purpose == "signup":
        user = db.query(models.User).filter(models.User.email == data.email).first()
        if not user:
            raise HTTPException(status_code=404, detail="Account not found")
        user.is_verified = True
        db.commit()
        db.refresh(user)
    else:
        # Passwordless login — user must already exist and be verified
        user = db.query(models.User).filter(models.User.email == data.email).first()
        if not user:
            raise HTTPException(status_code=404, detail="Account not found")
        if not user.is_verified:
            user.is_verified = True
            db.commit()
        db.refresh(user)

    return _issue_token(user)


# ── Me & plan ─────────────────────────────────────────────────────────────────

@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.put("/plan", response_model=schemas.UserOut)
def update_plan(
    body: dict,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = (body.get("plan") or "trial").strip().lower()
    if plan not in SELF_SETTABLE_PLANS:
        raise HTTPException(
            status_code=403,
            detail="Upgrading to a paid plan requires payment. Please complete checkout first.",
        )
    current_user.plan = plan
    db.commit()
    db.refresh(current_user)
    return current_user
