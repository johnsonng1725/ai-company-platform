from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from backend.database import get_db
from backend import models, schemas
from backend.core.auth import get_current_user
from backend.api.company import get_company

router = APIRouter(prefix="/api/proposals", tags=["proposals"])


def _enrich(proposal: models.Proposal) -> dict:
    return {
        "id": proposal.id,
        "title": proposal.title,
        "content": proposal.content,
        "summary": proposal.summary,
        "status": proposal.status,
        "ceo_feedback": proposal.ceo_feedback,
        "employee_id": proposal.employee_id,
        "employee_name": proposal.employee.name if proposal.employee else None,
        "employee_emoji": proposal.employee.role_emoji if proposal.employee else None,
        "created_at": proposal.created_at,
        "updated_at": proposal.updated_at,
    }


@router.get("", response_model=list[schemas.ProposalOut])
def list_proposals(
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = get_company(current_user, db)
    q = db.query(models.Proposal).filter(models.Proposal.company_id == company.id)
    if status:
        q = q.filter(models.Proposal.status == status)
    proposals = q.order_by(models.Proposal.created_at.desc()).all()
    return [_enrich(p) for p in proposals]


@router.get("/{proposal_id}", response_model=schemas.ProposalOut)
def get_proposal(
    proposal_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proposal = _get_proposal(proposal_id, current_user, db)
    return _enrich(proposal)


@router.post("/{proposal_id}/approve", response_model=schemas.ProposalOut)
def approve_proposal(
    proposal_id: int,
    data: schemas.ProposalDecision = schemas.ProposalDecision(),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proposal = _get_proposal(proposal_id, current_user, db)
    _assert_pending(proposal)

    proposal.status = "approved"
    proposal.ceo_feedback = data.feedback

    db.add(models.ActivityLog(
        company_id=proposal.company_id,
        employee_id=proposal.employee_id,
        level="success",
        message=f"✅ CEO approved: \"{proposal.title}\"",
        data={"proposal_id": proposal.id},
    ))
    db.commit()
    db.refresh(proposal)
    return _enrich(proposal)


@router.post("/{proposal_id}/reject", response_model=schemas.ProposalOut)
def reject_proposal(
    proposal_id: int,
    data: schemas.ProposalDecision,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proposal = _get_proposal(proposal_id, current_user, db)
    _assert_pending(proposal)

    proposal.status = "rejected"
    proposal.ceo_feedback = data.feedback

    db.add(models.ActivityLog(
        company_id=proposal.company_id,
        employee_id=proposal.employee_id,
        level="error",
        message=f"❌ CEO rejected: \"{proposal.title}\"",
        data={"proposal_id": proposal.id, "feedback": data.feedback},
    ))
    db.commit()
    db.refresh(proposal)
    return _enrich(proposal)


@router.post("/{proposal_id}/revise", response_model=schemas.ProposalOut)
def request_revision(
    proposal_id: int,
    data: schemas.ProposalDecision,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proposal = _get_proposal(proposal_id, current_user, db)
    _assert_pending(proposal)

    if not data.feedback:
        raise HTTPException(status_code=400, detail="Feedback is required for revision requests")

    proposal.status = "revision_requested"
    proposal.ceo_feedback = data.feedback

    db.add(models.ActivityLog(
        company_id=proposal.company_id,
        employee_id=proposal.employee_id,
        level="warning",
        message=f"🔄 CEO requested revision: \"{proposal.title}\"",
        data={"proposal_id": proposal.id, "feedback": data.feedback},
    ))
    db.commit()
    db.refresh(proposal)
    return _enrich(proposal)


def _get_proposal(proposal_id: int, user: models.User, db: Session) -> models.Proposal:
    company = get_company(user, db)
    proposal = db.query(models.Proposal).filter(
        models.Proposal.id == proposal_id,
        models.Proposal.company_id == company.id,
    ).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return proposal


def _assert_pending(proposal: models.Proposal):
    if proposal.status != "pending":
        raise HTTPException(status_code=400, detail=f"Proposal is already {proposal.status}")
