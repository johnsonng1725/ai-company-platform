#!/usr/bin/env python3
"""
24/7 Background Worker — AI Employee Executor
Runs as a separate Render service (Background Worker).
Picks up pending tasks, executes them with the appropriate AI agent,
and writes results back to the shared PostgreSQL database.
"""
import os
import sys
import time
import json
import logging
from datetime import datetime
from pathlib import Path

# Load .env if present (local dev)
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

# Add platform to path
sys.path.insert(0, str(Path(__file__).parent))

from backend.database import SessionLocal, init_db
from backend import models

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [WORKER] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("worker")


def get_db():
    return SessionLocal()


def log_activity(db, company_id: int, employee_id: int | None, level: str, message: str, data: dict = {}):
    db.add(models.ActivityLog(
        company_id=company_id,
        employee_id=employee_id,
        level=level,
        message=message,
        data=data,
    ))
    db.commit()


def call_ai(model_id: str, system_prompt: str, user_prompt: str,
            anthropic_key: str, openai_key: str) -> str:
    """Route to Anthropic or OpenAI based on model prefix."""
    if model_id.startswith("gpt"):
        if not openai_key:
            raise ValueError("OpenAI API key not configured for this company.")
        import openai
        client = openai.OpenAI(api_key=openai_key)
        response = client.chat.completions.create(
            model=model_id,
            max_tokens=4096,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.choices[0].message.content or ""
    else:
        # Default: Anthropic Claude
        if not anthropic_key:
            raise ValueError("Anthropic API key not configured for this company.")
        import anthropic
        client = anthropic.Anthropic(api_key=anthropic_key)
        response = client.messages.create(
            model=model_id,
            max_tokens=4096,
            messages=[{"role": "user", "content": user_prompt}],
            system=system_prompt,
        )
        return response.content[0].text


def run_task(task: models.Task, employee: models.AIEmployee, company: models.Company):
    """Execute a task for a given AI employee using the company's API keys."""
    db = get_db()
    try:
        # Mark task running
        task.status = "running"
        employee.status = "working"
        employee.current_task = task.title
        employee.last_active = datetime.utcnow()
        db.merge(task)
        db.merge(employee)
        db.commit()

        log.info(f"[{employee.name}] Starting: {task.title}")
        log_activity(db, company.id, employee.id, "info",
                     f"{employee.role_emoji} {employee.name} is working: {task.title}")

        anthropic_key = company.anthropic_api_key or os.getenv("ANTHROPIC_API_KEY", "")
        if not anthropic_key:
            raise ValueError("No Anthropic API key configured for this company.")

        # Build the agent prompt based on employee role and capabilities
        capabilities_text = "\n".join(f"- {c}" for c in (employee.capabilities or []))
        system_prompt = f"""You are {employee.name}, an AI {employee.role} working for a one-person company.
Your capabilities:
{capabilities_text or '- General AI assistance'}

Your description: {employee.description or 'A capable AI employee.'}

Complete your assigned task thoroughly and professionally. Return a structured result."""

        user_prompt = f"""Task: {task.title}

Details: {task.description}

Please complete this task and provide your results."""

        model_id = (employee.config or {}).get("model", "claude-sonnet-4-6")
        result = call_ai(model_id, system_prompt, user_prompt, anthropic_key,
                         company.openai_api_key or os.getenv("OPENAI_API_KEY", ""))

        # Meeting task → update the placeholder MeetingMessage
        if task.meeting_id:
            placeholder = (
                db.query(models.MeetingMessage)
                .filter(
                    models.MeetingMessage.meeting_id == task.meeting_id,
                    models.MeetingMessage.employee_id == employee.id,
                    models.MeetingMessage.status == "pending",
                )
                .order_by(models.MeetingMessage.id.desc())
                .first()
            )
            if placeholder:
                placeholder.content = result
                placeholder.status = "done"
                db.merge(placeholder)

            task.status = "completed"
            task.result = result
            employee.status = "idle"
            employee.current_task = ""
            db.merge(task)
            db.merge(employee)
            log_activity(db, company.id, employee.id, "success",
                         f"💬 {employee.name} responded in meeting.")
            db.commit()
            log.info(f"[{employee.name}] Meeting response done.")
            return

        # Check if result should be a proposal (for significant findings)
        should_propose = any(kw in task.title.lower() for kw in
                             ["research", "analyze", "scan", "opportunity", "proposal", "strategy"])

        if should_propose:
            # Create a proposal for CEO review
            proposal = models.Proposal(
                company_id=company.id,
                employee_id=employee.id,
                title=f"[{employee.name}] {task.title}",
                content=result,
                summary=result[:300] + "..." if len(result) > 300 else result,
                status="pending",
            )
            db.add(proposal)
            db.commit()

            log_activity(db, company.id, employee.id, "warning",
                         f"📋 {employee.name} submitted a proposal: \"{task.title}\" — awaiting CEO approval",
                         {"proposal_id": proposal.id})

            employee.status = "waiting_approval"
            employee.current_task = f"Waiting for approval: {task.title}"
        else:
            employee.status = "idle"
            employee.current_task = ""
            log_activity(db, company.id, employee.id, "success",
                         f"✅ {employee.name} completed: {task.title}")

        task.status = "completed"
        task.result = result
        db.merge(task)
        db.merge(employee)
        db.commit()
        log.info(f"[{employee.name}] Completed: {task.title}")

    except Exception as e:
        log.error(f"[{employee.name}] Task failed: {e}")
        task.status = "failed"
        task.error = str(e)
        employee.status = "error"
        employee.current_task = f"Error: {str(e)[:100]}"
        db.merge(task)
        db.merge(employee)
        log_activity(db, company.id, employee.id, "error",
                     f"💥 {employee.name} encountered an error: {str(e)[:200]}")
        db.commit()
    finally:
        db.close()


def process_pending_tasks():
    """Pick up one pending task and execute it."""
    db = get_db()
    try:
        task = (
            db.query(models.Task)
            .filter(models.Task.status == "pending")
            .order_by(models.Task.created_at.asc())
            .first()
        )
        if not task:
            return

        employee = db.query(models.AIEmployee).get(task.employee_id)
        if not employee or not employee.is_active:
            task.status = "failed"
            task.error = "Employee not found or inactive"
            db.commit()
            return

        company = db.query(models.Company).get(employee.company_id)
        if not company:
            return

        db.close()
        run_task(task, employee, company)

    except Exception as e:
        log.error(f"Error in process_pending_tasks: {e}")
        db.close()


def check_scheduled_employees():
    """Check if any employees have scheduled tasks to run (simplified: daily check)."""
    import schedule as sched
    # This is called periodically — for now just logs that scheduler is running
    # In production, parse schedule_cron and trigger tasks accordingly
    db = get_db()
    try:
        employees = db.query(models.AIEmployee).filter(
            models.AIEmployee.is_active == True,
            models.AIEmployee.schedule_cron != "",
            models.AIEmployee.status == "idle",
        ).all()

        now = datetime.utcnow()
        for emp in employees:
            # Simple daily schedule: "daily" means once a day if last_active was > 23 hours ago
            if emp.schedule_cron == "daily":
                if emp.last_active is None or (now - emp.last_active).total_seconds() > 82800:
                    task = models.Task(
                        employee_id=emp.id,
                        title=f"Scheduled daily run — {emp.role}",
                        description=f"Automated daily task for {emp.name} triggered at {now.strftime('%Y-%m-%d %H:%M UTC')}",
                        status="pending",
                    )
                    db.add(task)
                    log.info(f"[Scheduler] Queued daily task for {emp.name}")
        db.commit()
    finally:
        db.close()


def main():
    log.info("🚀 AI Company Worker starting up...")
    init_db()
    log.info("✅ Database initialized")

    # Heartbeat loop
    loop_count = 0
    while True:
        try:
            # Every loop: check for pending tasks
            process_pending_tasks()

            # Every 5 minutes: check scheduled employees
            if loop_count % 30 == 0:
                check_scheduled_employees()

            # Every hour: log heartbeat
            if loop_count % 360 == 0:
                log.info(f"💓 Worker heartbeat — {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")

            loop_count += 1
            time.sleep(10)  # Check every 10 seconds

        except KeyboardInterrupt:
            log.info("Worker stopped by user.")
            break
        except Exception as e:
            log.error(f"Unexpected error in main loop: {e}")
            time.sleep(30)


if __name__ == "__main__":
    main()
