"""
Notices CRUD router for the Notice Board.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import database, models, schemas, dependencies

router = APIRouter(prefix="/api/v1/notices", tags=["notices"])


@router.get("/", response_model=List[schemas.NoticeResponse])
def list_notices(db: Session = Depends(database.get_db)):
    """List all notices (public endpoint)."""
    return db.query(models.Notice).order_by(models.Notice.created_at.desc()).all()


@router.post("/", response_model=schemas.NoticeResponse, status_code=201)
def create_notice(
    notice: schemas.NoticeCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """Create a new notice (admin only)."""
    db_notice = models.Notice(**notice.model_dump(), author=current_user.full_name or current_user.username)
    db.add(db_notice)
    db.commit()
    db.refresh(db_notice)
    return db_notice


@router.delete("/{notice_id}", status_code=204)
def delete_notice(
    notice_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """Delete a notice (admin only)."""
    notice = db.query(models.Notice).filter(models.Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    db.delete(notice)
    db.commit()
