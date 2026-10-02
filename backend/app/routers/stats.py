"""
Dashboard statistics endpoint — aggregated counts, category/priority breakdown,
monthly trend, and recent activity.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from collections import defaultdict

from .. import database, models, dependencies

router = APIRouter(prefix="/api/v1/stats", tags=["stats"])


@router.get("/dashboard")
def get_dashboard_stats(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    complaints = db.query(models.Complaint).all()

    total = len(complaints)
    pending = sum(1 for c in complaints if c.status == "pending")
    in_progress = sum(1 for c in complaints if c.status == "in_progress")
    resolved = sum(1 for c in complaints if c.status == "resolved")

    # Category breakdown
    categories = defaultdict(int)
    for c in complaints:
        categories[c.category] += 1

    # Priority breakdown
    priorities = defaultdict(int)
    for c in complaints:
        priorities[c.priority] += 1

    # Ward breakdown
    wards = defaultdict(int)
    for c in complaints:
        if c.ward:
            wards[c.ward] += 1

    # Monthly trend (last 6 months)
    monthly = defaultdict(lambda: {"pending": 0, "in_progress": 0, "resolved": 0})
    for c in complaints:
        if c.created_at:
            month_key = c.created_at.strftime("%Y-%m")
            monthly[month_key][c.status] += 1

    sorted_months = sorted(monthly.keys())[-6:]
    monthly_trend = [{"month": m, **monthly[m]} for m in sorted_months]

    # Recent activity (last 10 complaints)
    recent = sorted(complaints, key=lambda c: c.created_at, reverse=True)[:10]
    recent_activity = [
        {
            "id": c.id,
            "title": c.title,
            "status": c.status,
            "category": c.category,
            "priority": c.priority,
            "ward": c.ward or "",
            "created_at": c.created_at.isoformat() if c.created_at else "",
        }
        for c in recent
    ]

    return {
        "total": total,
        "pending": pending,
        "in_progress": in_progress,
        "resolved": resolved,
        "categories": dict(categories),
        "priorities": dict(priorities),
        "wards": dict(wards),
        "recent_activity": recent_activity,
        "monthly_trend": monthly_trend,
    }
