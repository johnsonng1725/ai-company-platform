import os
from pathlib import Path
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.database import init_db
from backend.api import auth, company, employees, proposals, activity
from backend.core.auth import get_current_user
from backend import models, schemas

app = FastAPI(title="AI Company Platform", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


# Auth /me endpoint (needs proper dependency injection)
@app.get("/api/auth/me", response_model=schemas.UserOut, tags=["auth"])
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


# Stats endpoint for dashboard
@app.get("/api/stats", tags=["dashboard"])
def get_stats(
    current_user: models.User = Depends(get_current_user),
    db=None,
):
    from backend.database import SessionLocal
    db = SessionLocal()
    try:
        comp = db.query(models.Company).filter(models.Company.owner_id == current_user.id).first()
        if not comp:
            return {"employees": 0, "active": 0, "pending_proposals": 0, "tasks_today": 0}

        from datetime import datetime, date
        today_start = datetime.combine(date.today(), datetime.min.time())

        employees_count = db.query(models.AIEmployee).filter(
            models.AIEmployee.company_id == comp.id,
            models.AIEmployee.is_active == True,
        ).count()

        active_count = db.query(models.AIEmployee).filter(
            models.AIEmployee.company_id == comp.id,
            models.AIEmployee.status == "working",
        ).count()

        pending_proposals = db.query(models.Proposal).filter(
            models.Proposal.company_id == comp.id,
            models.Proposal.status == "pending",
        ).count()

        tasks_today = db.query(models.Task).join(models.AIEmployee).filter(
            models.AIEmployee.company_id == comp.id,
            models.Task.created_at >= today_start,
        ).count()

        return {
            "employees": employees_count,
            "active": active_count,
            "pending_proposals": pending_proposals,
            "tasks_today": tasks_today,
        }
    finally:
        db.close()


@app.on_event("startup")
def startup():
    init_db()


# Serve React frontend — must be LAST
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        index = FRONTEND_DIST / "index.html"
        return FileResponse(str(index))
