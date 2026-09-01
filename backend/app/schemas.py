from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "citizen"
class UserCreate(UserBase):
    password: str
class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True
class Token(BaseModel):
    access_token: str
    token_type: str
class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None
class ComplaintBase(BaseModel):
    title: str
    description: str
    category: str
    priority: str = "medium"
    latitude: float
    longitude: float
    media_urls: Optional[str] = None
class ComplaintCreate(ComplaintBase):
    pass
class ComplaintUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
class ComplaintOut(ComplaintBase):
    id: int
    status: str
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True
class NoteBase(BaseModel):
    text: str
class NoteCreate(NoteBase):
    pass
class NoteOut(NoteBase):
    id: int
    complaint_id: int
    author_id: Optional[int]
    created_at: datetime
    class Config:
        from_attributes = True