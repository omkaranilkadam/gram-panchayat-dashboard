"""
SQLAlchemy ORM models for the Gram Panchayat system.
"""
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text,
)
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), default="")
    role = Column(String(50), default="admin")
    created_at = Column(DateTime, default=datetime.utcnow)


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    priority = Column(String(50), default="medium")
    status = Column(String(50), default="pending", index=True)
    ward = Column(String(50), nullable=True)
    complainant_name = Column(String(255), nullable=True)
    complainant_phone = Column(String(20), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    media_urls = Column(String(1000), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    notes = relationship(
        "ComplaintNote",
        back_populates="complaint",
        cascade="all, delete-orphan",
        order_by="ComplaintNote.created_at.desc()",
    )


class ComplaintNote(Base):
    """Timeline entries for a complaint — status changes, admin notes, etc."""
    __tablename__ = "complaint_notes"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(
        Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False
    )
    author = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    note_type = Column(String(50), default="note")  # "note" | "status_change"
    created_at = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("Complaint", back_populates="notes")


class PanchayatSettings(Base):
    """Single-row table storing panchayat configuration."""
    __tablename__ = "panchayat_settings"

    id = Column(Integer, primary_key=True, index=True)
    panchayat_name = Column(String(255), default="ग्राम पंचायत")
    panchayat_name_en = Column(String(255), default="Gram Panchayat")
    village_name = Column(String(255), default="")
    district = Column(String(255), default="")
    state = Column(String(255), default="Maharashtra")
    admin_name = Column(String(255), default="Sarpanch Admin")
    contact_phone = Column(String(20), default="")
    contact_email = Column(String(255), default="")
    notifications_enabled = Column(Boolean, default=True)
    dark_mode = Column(Boolean, default=False)
