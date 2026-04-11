import os
from pathlib import Path
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from sqlalchemy.orm import Session
from backend.database import init_db, get_db
from backend.api import auth, company, employees, proposals, activity, tasks, meetings
from backend.api.company import get_company
from backend.core.auth import get_current_user
from backend import models, schemas

app = FastAPI(title="AI Company Platform", version="1.0.0")

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

    return {
        "employees": db.query(models.AIEmployee).filter(
            models.AIEmployee.company_id == comp.id, models.AIEmployee.is_active == True).count(),
        "active": db.query(models.AIEmployee).filter(
            models.AIEmployee.company_id == comp.id, models.AIEmployee.status == "working").count(),
        "pending_proposals": db.query(models.Proposal).filter(
            models.Proposal.company_id == comp.id, models.Proposal.status == "pending").count(),
        "tasks_today": db.query(models.Task).join(models.AIEmployee).filter(
            models.AIEmployee.company_id == comp.id, models.Task.created_at >= today_start).count(),
    }


@app.get("/api/platform-status", tags=["platform"])
def platform_status():
    """Returns which platform-level AI keys are configured (no values exposed)."""
    return {
        "has_anthropic": bool(settings.ANTHROPIC_API_KEY),
        "has_openai": bool(settings.OPENAI_API_KEY),
    }


@app.on_event("startup")
def startup():
    from backend.core.config import validate_settings
    validate_settings()
    init_db()


# Serve React frontend — must be LAST
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        index = FRONTEND_DIST / "index.html"
        return FileResponse(str(index))
