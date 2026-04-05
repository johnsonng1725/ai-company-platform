from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from backend.database import get_db
from backend import models
from backend.core.auth import get_current_user
from backend.api.company import get_company

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


def _msg_out(msg: models.MeetingMessage) -> dict:
    return {
        "id": msg.id,
        "role": msg.role,
        "employee_id": msg.employee_id,
        "employee_name": msg.employee.name if msg.employee else None,
        "employee_emoji": msg.employee.role_emoji if msg.employee else None,
        "content": msg.content,
        "status": msg.status,
        "created_at": msg.created_at.isoformat(),
    }


def _meeting_out(meeting: models.Meeting, db: Session) -> dict:
    # Resolve participant details
    participants = []
    for eid in (meeting.participant_ids or []):
        emp = db.query(models.AIEmployee).filter(models.AIEmployee.id == eid).first()
        if emp:
            participants.append({
                "id": emp.id,
                "name": emp.name,
                "role": emp.role,
                "role_emoji": emp.role_emoji,
                "status": emp.status,
            })
    last_msg = (
        db.query(models.MeetingMessage)
        .filter(models.MeetingMessage.meeting_id == meeting.id)
        .order_by(models.MeetingMessage.created_at.desc())
        .first()
    )
    return {
        "id": meeting.id,
        "name": meeting.name,
        "participant_ids": meeting.participant_ids or [],
        "participants": participants,
        "last_message": last_msg.content[:80] if last_msg else None,
        "message_count": db.query(models.MeetingMessage).filter(
            models.MeetingMessage.meeting_id == meeting.id).count(),
        "created_at": meeting.created_at.isoformat(),
    }


# ── CRUD ─────────────────────────────────────────────────────────────────────

@router.get("")
def list_meetings(
    company_id: int = Query(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_company(current_user, db, company_id)
    meetings = (
        db.query(models.Meeting)
        .filter(models.Meeting.company_id == company_id)
        .order_by(models.Meeting.created_at.desc())
        .all()
    )
    return [_meeting_out(m, db) for m in meetings]


@router.post("")
def create_meeting(
    body: dict,
    company_id: int = Query(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_company(current_user, db, company_id)
    name = (body.get("name") or "").strip()
    participant_ids = body.get("participant_ids", [])

    if not name:
        raise HTTPException(status_code=400, detail="Meeting name is required")

    meeting = models.Meeting(
        company_id=company_id,
        name=name,
        participant_ids=participant_ids,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return _meeting_out(meeting, db)


@router.get("/{meeting_id}")
def get_meeting(
    meeting_id: int,
    company_id: int = Query(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = _get_meeting(meeting_id, company_id, current_user, db)
    return _meeting_out(meeting, db)


@router.delete("/{meeting_id}")
def delete_meeting(
    meeting_id: int,
    company_id: int = Query(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meeting = _get_meeting(meeting_id, company_id, current_user, db)
    db.delete(meeting)
    db.commit()
    return {"ok": True}


@router.get("/{meeting_id}/messages")
def get_messages(
    meeting_id: int,
    company_id: int = Query(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_meeting(meeting_id, company_id, current_user, db)
    msgs = (
        db.query(models.MeetingMessage)
        .filter(models.MeetingMessage.meeting_id == meeting_id)
        .order_by(models.MeetingMessage.created_at.asc())
        .all()
    )
    return [_msg_out(m) for m in msgs]


@router.post("/{meeting_id}/chat")
def send_to_meeting(
    meeting_id: int,
    body: dict,
    company_id: int = Query(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """CEO sends a message to the meeting room. All participants are queued to respond."""
    meeting = _get_meeting(meeting_id, company_id, current_user, db)
    message = (body.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    # Save CEO message
    user_msg = models.MeetingMessage(
        meeting_id=meeting_id,
        role="user",
        employee_id=None,
        content=message,
        status="done",
    )
    db.add(user_msg)
    db.flush()

    # Queue a placeholder + task for each participant
    created = []
    for emp_id in (meeting.participant_ids or []):
        emp = db.query(models.AIEmployee).filter(
            models.AIEmployee.id == emp_id,
            models.AIEmployee.company_id == company_id,
        ).first()
        if not emp:
            continue

        # Placeholder message (pending)
        placeholder = models.MeetingMessage(
            meeting_id=meeting_id,
            role="employee",
            employee_id=emp.id,
            content="",
            status="pending",
        )
        db.add(placeholder)
        db.flush()

        # Queue task for worker — include meeting context
        history_msgs = (
            db.query(models.MeetingMessage)
            .filter(models.MeetingMessage.meeting_id == meeting_id,
                    models.MeetingMessage.status == "done")
            .order_by(models.MeetingMessage.created_at.asc())
            .all()
        )
        context = "\n".join([
            f"{'CEO' if m.role == 'user' else (m.employee.name if m.employee else 'Employee')}: {m.content}"
            for m in history_msgs
        ])

        task = models.Task(
            employee_id=emp.id,
            meeting_id=meeting_id,
            title=f"[Meeting: {meeting.name}] {message[:80]}",
            description=f"""You are in a meeting called "{meeting.name}".

Meeting conversation so far:
{context}

CEO just said: {message}

Please respond as {emp.name} ({emp.role}). Be concise and professional. Address the CEO's message from your role's perspective.""",
            status="pending",
        )
        db.add(task)
        emp.status = "working"
        emp.current_task = f"In meeting: {meeting.name}"

        created.append({"employee_id": emp.id, "name": emp.name, "placeholder_id": placeholder.id})

    db.add(models.ActivityLog(
        company_id=company_id,
        level="info",
        message=f"📅 Meeting \"{meeting.name}\": CEO — {message[:60]}{'...' if len(message) > 60 else ''}",
    ))
    db.commit()
    return {"ok": True, "participants_notified": created}


def _get_meeting(meeting_id: int, company_id: int, user: models.User, db: Session) -> models.Meeting:
    get_company(user, db, company_id)
    meeting = db.query(models.Meeting).filter(
        models.Meeting.id == meeting_id,
        models.Meeting.company_id == company_id,
    ).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting
