"""Pydantic request/response schemas."""

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


# ─── Auth ───────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Chat ───────────────────────────────────────────────

class ChatMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=5000)
    session_id: str | None = None  # None = create new session


class ChatMessageResponse(BaseModel):
    session_id: str
    message_id: str
    content: str
    crisis_detected: bool = False
    crisis_tier: int | None = None
    technique_used: str | None = None
    emergency_resources: list[dict] | None = None


class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    metadata_json: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Mood ───────────────────────────────────────────────

class MoodLogRequest(BaseModel):
    score: int = Field(ge=1, le=5)
    note: str | None = None


class MoodEntryResponse(BaseModel):
    id: str
    score: int
    note: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MoodInsightResponse(BaseModel):
    insight: str
    average_mood: float
    total_entries: int
    trend: str  # improving, declining, stable
