from datetime import datetime
from typing import Optional, List, Any, Dict, Literal
from pydantic import BaseModel, EmailStr, field_validator


# ── Auth ────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str = ""

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class SendCodeRequest(BaseModel):
    email: EmailStr
    purpose: Literal["signup", "login"] = "login"


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str
    purpose: Literal["signup", "login"] = "login"

    @field_validator("code")
    @classmethod
    def code_format(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("Code must be exactly 6 digits")
        return v


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    is_verified: bool = False
    plan: str = "free"
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# ── Company ──────────────────────────────────────────────────────────────────

class CompanyCreate(BaseModel):
    name: str
    description: str = ""
    anthropic_api_key: str = ""
    openai_api_key: str = ""


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None


class CompanyOut(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime
    has_anthropic_key: bool
    has_openai_key: bool
    employee_count: int = 0
    pending_proposals: int = 0

    class Config:
        from_attributes = True


# ── AI Employee ──────────────────────────────────────────────────────────────

class EmployeeCreate(BaseModel):
    name: str
    role: str
    role_emoji: str = "🤖"
    description: str = ""
    capabilities: List[str] = []
    schedule_cron: str = ""
    config: Dict[str, Any] = {}


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    role_emoji: Optional[str] = None
    description: Optional[str] = None
    capabilities: Optional[List[str]] = None
    schedule_cron: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class EmployeeOut(BaseModel):
    id: int
    name: str
    role: str
    role_emoji: str
    description: str
    capabilities: List[str]
    schedule_cron: str
    status: str
    current_task: str
    is_active: bool
    last_active: Optional[datetime]
    config: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Task ─────────────────────────────────────────────────────────────────────

class TaskOut(BaseModel):
    id: int
    title: str
    description: str
    status: str
    result: str
    error: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Proposal ─────────────────────────────────────────────────────────────────

class ProposalOut(BaseModel):
    id: int
    title: str
    content: str
    summary: str
    status: str
    ceo_feedback: str
    employee_id: Optional[int]
    employee_name: Optional[str] = None
    employee_emoji: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProposalDecision(BaseModel):
    feedback: str = ""


# ── Activity ─────────────────────────────────────────────────────────────────

class ActivityOut(BaseModel):
    id: int
    level: str
    message: str
    data: Dict[str, Any]
    employee_id: Optional[int]
    employee_name: Optional[str] = None
    employee_emoji: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
