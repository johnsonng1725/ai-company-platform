"""
Computer Use API endpoint.
Receives a screenshot from the desktop app, sends it to Claude with the task,
and returns the next action to execute.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import anthropic
import base64
import os

from backend.database import get_db
from backend import models
from backend.core.auth import get_current_user
from backend.core.crypto import decrypt_value

router = APIRouter(prefix="/api/computer-use", tags=["computer-use"])


class ActionRequest(BaseModel):
    company_id: int
    employee_id: int
    task_id: int
    task: str
    screenshot_base64: str
    screen_width: int
    screen_height: int
    iteration: int = 1


class ActionResponse(BaseModel):
    type: str           # screenshot|mouse_move|left_click|type|key|open_app|done
    x: Optional[float] = None
    y: Optional[float] = None
    text: Optional[str] = None
    key: Optional[str] = None
    app: Optional[str] = None
    reason: Optional[str] = None


@router.post("/action", response_model=ActionResponse)
def get_next_action(
    body: ActionRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify company + employee ownership
    company = db.query(models.Company).filter(
        models.Company.id == body.company_id,
        models.Company.owner_id == current_user.id,
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    employee = db.query(models.AIEmployee).filter(
        models.AIEmployee.id == body.employee_id,
        models.AIEmployee.company_id == company.id,
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Get API key
    anthropic_key = decrypt_value(company.anthropic_api_key) or os.getenv("ANTHROPIC_API_KEY", "")
    if not anthropic_key:
        raise HTTPException(status_code=400, detail="No Anthropic API key configured")

    # Build system prompt for this employee role
    system_prompt = f"""You are {employee.name}, an AI {employee.role} controlling a computer to complete tasks.

You will receive a screenshot of the current screen and a task description.
Decide the single best next action to make progress on the task.

Respond with ONLY a JSON object in one of these formats:

Open an application:
{{"type": "open_app", "app": "VS Code"}}

Click somewhere:
{{"type": "left_click", "x": 450, "y": 320}}

Type text:
{{"type": "type", "text": "hello world"}}

Press a key:
{{"type": "key", "key": "Return"}}

Take a screenshot to see current state:
{{"type": "screenshot"}}

Task is complete:
{{"type": "done", "reason": "Brief description of what was accomplished"}}

Rules:
- Always return valid JSON only, no other text
- Coordinates must be within {body.screen_width}x{body.screen_height}
- If the task is already done, return done immediately
- If you need to see the current screen state, return screenshot
- Prefer open_app for launching applications by their common name
"""

    user_message = f"""Task: {body.task}

This is step {body.iteration}. What is the single best next action?"""

    try:
        client = anthropic.Anthropic(api_key=anthropic_key)
        response = client.messages.create(
            model="claude-opus-4-8",
            max_tokens=256,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": body.screenshot_base64,
                            },
                        },
                        {"type": "text", "text": user_message},
                    ],
                }
            ],
        )

        raw = response.content[0].text.strip()

        # Parse JSON response
        import re, json
        match = re.search(r'\{[\s\S]*\}', raw)
        if not match:
            return ActionResponse(type="screenshot")

        data = json.loads(match.group())
        return ActionResponse(**data)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
