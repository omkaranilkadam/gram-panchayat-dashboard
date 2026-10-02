"""
Pydantic v2 request / response schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ──────────────────────────────────────────────
#  Auth
# ──────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=4)
    full_name: str = ""
    role: str = "admin"


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
#  Complaints
# ──────────────────────────────────────────────
class ComplaintBase(BaseModel):
    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=5)
    category: str
    priority: str = "medium"
    latitude: float
    longitude: float
    ward: Optional[str] = None
    complainant_name: Optional[str] = None
    complainant_phone: Optional[str] = None


class ComplaintCreate(ComplaintBase):
    media_urls: Optional[str] = None


class ComplaintUpdate(BaseModel):
    status: str


class NoteCreate(BaseModel):
    content: str = Field(..., min_length=1)


class NoteResponse(BaseModel):
    id: int
    complaint_id: int
    author: str
    content: str
    note_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class ComplaintResponse(ComplaintBase):
    id: int
    status: str
    media_urls: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    notes: List[NoteResponse] = []

    class Config:
        from_attributes = True


class ComplaintListResponse(ComplaintBase):
    """Lighter response for list endpoints (no notes)."""
    id: int
    status: str
    media_urls: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
#  Settings
# ──────────────────────────────────────────────
class SettingsUpdate(BaseModel):
    panchayat_name: Optional[str] = None
    panchayat_name_en: Optional[str] = None
    village_name: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    admin_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    dark_mode: Optional[bool] = None


class SettingsResponse(BaseModel):
    id: int
    panchayat_name: str
    panchayat_name_en: str
    village_name: str
    district: str
    state: str
    admin_name: str
    contact_phone: str
    contact_email: str
    notifications_enabled: bool
    dark_mode: bool

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
#  Dashboard Stats
# ──────────────────────────────────────────────
class DashboardStats(BaseModel):
    total: int
    pending: int
    in_progress: int
    resolved: int
    categories: dict
    priorities: dict
    recent_activity: List[dict]
    monthly_trend: List[dict]
