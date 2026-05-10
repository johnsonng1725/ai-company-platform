from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)   # nullable for OAuth-only users
    full_name = Column(String, default="")
    avatar_url = Column(String, default="")
    # OAuth provider IDs
    google_id = Column(String, nullable=True, unique=True, index=True)
    facebook_id = Column(String, nullable=True, unique=True, index=True)
    is_active = Column(Boolean, default=True)
    plan = Column(String, default="free")   # free | starter | pro | max
    created_at = Column(DateTime, default=datetime.utcnow)

    companies = relationship("Company", back_populates="owner", cascade="all, delete")


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    # API keys stored per-company
    anthropic_api_key = Column(String, default="")
    openai_api_key = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="companies")
    employees = relationship("AIEmployee", back_populates="company", cascade="all, delete")
    proposals = relationship("Proposal", back_populates="company", cascade="all, delete")
    activity_logs = relationship("ActivityLog", back_populates="company", cascade="all, delete")


class AIEmployee(Base):
    __tablename__ = "ai_employees"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)          # e.g. "Market Researcher"
    role_emoji = Column(String, default="🤖")
    description = Column(Text, default="")
    capabilities = Column(JSON, default=list)       # list of capability strings
    schedule_cron = Column(String, default="")      # cron expression for auto-run
    status = Column(String, default="idle")         # idle | working | waiting_approval | error
    current_task = Column(Text, default="")
    config = Column(JSON, default=dict)             # extra config (model, temperature, etc.)
    is_active = Column(Boolean, default=True)
    last_active = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="employees")
    tasks = relationship("Task", back_populates="employee", cascade="all, delete")
    proposals = relationship("Proposal", back_populates="employee")
    activity_logs = relationship("ActivityLog", back_populates="employee")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("ai_employees.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    status = Column(String, default="pending")  # pending | running | completed | failed
    result = Column(Text, default="")
    error = Column(Text, default="")
    steps = Column(JSON, default=list)   # live work steps [{type, content, ts}]
    # Link to meeting if this task is a meeting response
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("AIEmployee", back_populates="tasks")


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name = Column(String, nullable=False)
    # JSON list of employee IDs participating
    participant_ids = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship("MeetingMessage", back_populates="meeting", cascade="all, delete")


class MeetingMessage(Base):
    __tablename__ = "meeting_messages"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    # 'user' = CEO, 'employee' = AI response
    role = Column(String, nullable=False)
    employee_id = Column(Integer, ForeignKey("ai_employees.id"), nullable=True)
    content = Column(Text, nullable=False)
    # pending | done (for employee messages awaiting AI response)
    status = Column(String, default="done")
    created_at = Column(DateTime, default=datetime.utcnow)

    meeting = relationship("Meeting", back_populates="messages")
    employee = relationship("AIEmployee")


class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("ai_employees.id"), nullable=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(Text, default="")
    status = Column(String, default="pending")  # pending | approved | rejected | revision_requested
    ceo_feedback = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="proposals")
    employee = relationship("AIEmployee", back_populates="proposals")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    employee_id = Column(Integer, ForeignKey("ai_employees.id"), nullable=True)
    level = Column(String, default="info")   # info | success | warning | error
    message = Column(Text, nullable=False)
    data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="activity_logs")
    employee = relationship("AIEmployee", back_populates="activity_logs")
