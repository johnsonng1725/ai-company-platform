import os
import logging
import secrets
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from sqlalchemy.orm import Session
from backend.database import init_db, get_db
from backend.api import auth, company, employees, proposals, activity, tasks, meetings, oauth
from backend.api.company import get_company
from backend.core.auth import get_current_user
from backend.core.config import settings
from backend import models, schemas

_log = logging.getLogger("startup")
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern FastAPI lifespan handler replacing deprecated @app.on_event."""
    _log.info(f"DATABASE_URL starts with: {os.getenv('DATABASE_URL', 'NOT SET')[:30]}")
    _log.info(f"SECRET_KEY set: {bool(os.getenv('SECRET_KEY'))}")

    from backend.core.config import validate_settings
    try:
        validate_settings()
    except RuntimeError as e:
        _log.error(f"validate_settings failed: {e}")
        from backend.core import config as _cfg
        _cfg.settings.SECRET_KEY = secrets.token_hex(32)
        _log.warning("Generated runtime SECRET_KEY — set SECRET_KEY env var to persist this")

    try:
        init_db()
        _log.info("Database initialized successfully")
    except Exception as e:
        _log.error(f"init_db failed: {type(e).__name__}: {e}")
        _log.warning("Database init failed — app will start but DB operations may fail")

    yield  # App is running

    # Shutdown (nothing needed)


app = FastAPI(title="AI Company Platform", version="1.0.0", lifespan=lifespan)


@app.get("/api/health", tags=["health"])
@app.head("/", tags=["health"], include_in_schema=False)
def health():
    """Health check — Render probes HEAD / to confirm the service is alive."""
    return {"status": "ok", "service": "1nexio API"}

_cors_origins_env = os.getenv("ALLOWED_ORIGINS", "")
_allowed_origins = (
    [o.strip() for o in _cors_origins_env.split(",") if o.strip()]
    if _cors_origins_env
    else ["http://localhost:5173", "http://localhost:3000"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(auth.router)
app.include_router(oauth.router)
app.include_router(company.router)
app.include_router(employees.router)
app.include_router(proposals.router)
app.include_router(activity.router)
app.include_router(tasks.router)
app.include_router(meetings.router)


# Auth /me endpoint (needs proper dependency injection)
@app.get("/api/auth/me", response_model=schemas.UserOut, tags=["auth"])
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


# Stats endpoint for dashboard
@app.get("/api/stats", tags=["dashboard"])
def get_stats(
    company_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from datetime import datetime, date
    comp = get_company(current_user, db, company_id)
    today_start = datetime.combine(date.today(), datetime.min.time())

    from datetime import timedelta
    week_start = datetime.combine(date.today() - timedelta(days=date.today().weekday()), datetime.min.time())

    tasks_base = db.query(models.Task).join(models.AIEmployee).filter(
        models.AIEmployee.company_id == comp.id
    )
    tasks_completed_total = tasks_base.filter(models.Task.status == "completed").count()
    tasks_this_week = tasks_base.filter(models.Task.created_at >= week_start).count()
    tasks_today = tasks_base.filter(models.Task.created_at >= today_start).count()
    proposals_approved = db.query(models.Proposal).filter(
        models.Proposal.company_id == comp.id, models.Proposal.status == "approved").count()

    return {
        "employees": db.query(models.AIEmployee).filter(
            models.AIEmployee.company_id == comp.id, models.AIEmployee.is_active == True).count(),
        "active": db.query(models.AIEmployee).filter(
            models.AIEmployee.company_id == comp.id, models.AIEmployee.status == "working").count(),
        "pending_proposals": db.query(models.Proposal).filter(
            models.Proposal.company_id == comp.id, models.Proposal.status == "pending").count(),
        "tasks_today": tasks_today,
        "tasks_this_week": tasks_this_week,
        "tasks_completed_total": tasks_completed_total,
        "proposals_approved": proposals_approved,
        # Rough "hours saved" estimate: assume each AI task saves ~45 min of human work
        "hours_saved": round(tasks_completed_total * 0.75, 1),
    }


@app.get("/api/platform-status", tags=["platform"])
def platform_status():
    """Returns which platform-level AI keys are configured (no values exposed)."""
    return {
        "has_anthropic": bool(settings.ANTHROPIC_API_KEY),
        "has_openai": bool(settings.OPENAI_API_KEY),
    }


@app.get("/api/dev/token", tags=["dev"])
def dev_auto_login(db: Session = Depends(get_db)):
    """
    Local development only — returns a JWT for a default dev user.
    Disabled automatically when DATABASE_URL is not SQLite.
    """
    from backend.core.config import settings as _s
    if not _s.DATABASE_URL.startswith("sqlite"):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Dev auto-login only available in local development.")

    from backend.core.auth import create_access_token
    from datetime import timedelta

    # Find or create dev user (skip password hashing to avoid passlib issues in dev)
    user = db.query(models.User).filter(models.User.email == "dev@localhost").first()
    if not user:
        import hashlib
        dummy_hash = "$2b$12$" + hashlib.sha256(b"devpassword").hexdigest()[:53]
        user = models.User(
            email="dev@localhost",
            full_name="Dev User",
            hashed_password=dummy_hash,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Find or create a default company for this user
    company = db.query(models.Company).filter(models.Company.owner_id == user.id).first()
    if not company:
        company = models.Company(
            owner_id=user.id,
            name="My AI Company",
            description="Your AI-powered one-person company",
        )
        db.add(company)
        db.commit()
        db.refresh(company)

    token = create_access_token(
        {"sub": str(user.id)},
        expires_delta=timedelta(days=7),
    )
    return {"token": token, "company_id": company.id}




# Serve React frontend — must be LAST
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/", include_in_schema=False)
    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str = ""):
        index = FRONTEND_DIST / "index.html"
        return FileResponse(str(index))
