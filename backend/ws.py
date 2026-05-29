"""
WebSocket connection manager.
Tracks per-company connections and broadcasts updates.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Set

from fastapi import WebSocket

log = logging.getLogger("ws")


class ConnectionManager:
    def __init__(self):
        self._connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, ws: WebSocket, company_id: int) -> None:
        await ws.accept()
        self._connections.setdefault(company_id, set()).add(ws)
        log.info(f"[WS] company={company_id} connected ({len(self._connections[company_id])} total)")

    def disconnect(self, ws: WebSocket, company_id: int) -> None:
        bucket = self._connections.get(company_id, set())
        bucket.discard(ws)
        log.info(f"[WS] company={company_id} disconnected ({len(bucket)} remaining)")

    async def broadcast(self, company_id: int, message: dict) -> None:
        bucket = self._connections.get(company_id)
        if not bucket:
            return
        dead: Set[WebSocket] = set()
        for ws in list(bucket):
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        bucket -= dead


manager = ConnectionManager()


def _get_ws_db():
    from backend.database import SessionLocal
    return SessionLocal()


async def watch_company(ws: WebSocket, company_id: int) -> None:
    """
    Poll the DB every 1.5 s for task/employee changes and push them to the client.
    Runs until the WebSocket disconnects.
    """
    from backend import models
    from sqlalchemy.orm.attributes import flag_modified  # noqa – just for import check

    last_check = datetime.utcnow() - timedelta(seconds=5)

    while True:
        await asyncio.sleep(1.5)

        now = datetime.utcnow()
        db = _get_ws_db()
        try:
            # ── Updated tasks ──────────────────────────────────────────────
            updated_tasks = (
                db.query(models.Task)
                .join(models.AIEmployee)
                .filter(
                    models.AIEmployee.company_id == company_id,
                    models.Task.updated_at >= last_check,
                )
                .all()
            )
            for task in updated_tasks:
                try:
                    await ws.send_json({
                        "type": "task_update",
                        "task": {
                            "id": task.id,
                            "employee_id": task.employee_id,
                            "status": task.status,
                            "steps": task.steps or [],
                            "result": task.result or "",
                            "error": task.error or "",
                            "updated_at": task.updated_at.isoformat(),
                        },
                    })
                except Exception:
                    return  # client disconnected

            # ── Employee status changes ────────────────────────────────────
            updated_emps = (
                db.query(models.AIEmployee)
                .filter(
                    models.AIEmployee.company_id == company_id,
                    models.AIEmployee.last_active >= last_check,
                )
                .all()
            )
            for emp in updated_emps:
                try:
                    await ws.send_json({
                        "type": "employee_update",
                        "employee": {
                            "id": emp.id,
                            "status": emp.status,
                            "current_task": emp.current_task or "",
                        },
                    })
                except Exception:
                    return

            # ── New activity logs ──────────────────────────────────────────
            new_logs = (
                db.query(models.ActivityLog)
                .filter(
                    models.ActivityLog.company_id == company_id,
                    models.ActivityLog.created_at >= last_check,
                )
                .order_by(models.ActivityLog.created_at.asc())
                .limit(10)
                .all()
            )
            for log_entry in new_logs:
                try:
                    await ws.send_json({
                        "type": "activity",
                        "log": {
                            "id": log_entry.id,
                            "level": log_entry.level,
                            "message": log_entry.message,
                            "employee_id": log_entry.employee_id,
                            "created_at": log_entry.created_at.isoformat(),
                        },
                    })
                except Exception:
                    return

        finally:
            db.close()

        last_check = now
