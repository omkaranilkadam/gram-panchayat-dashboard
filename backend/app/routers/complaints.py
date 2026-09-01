from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import database, dependencies, models, schemas
router = APIRouter(prefix="/complaints", tags=["complaints"])
@router.get("/", response_model=List[schemas.ComplaintOut])
def get_complaints(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    complaints = (
        db.query(models.Complaint)
        .order_by(models.Complaint.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return complaints
@router.post("/", response_model=schemas.ComplaintOut)
def create_complaint(
    complaint: schemas.ComplaintCreate,
    db: Session = Depends(database.get_db),
    _current_user: models.User = Depends(dependencies.get_current_user),
):
    new_complaint = models.Complaint(
        **complaint.model_dump(), created_by=_current_user.id
    )
    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)
    return new_complaint
@router.get("/{complaint_id}", response_model=schemas.ComplaintOut)
def get_complaint(
    complaint_id: int,
    db: Session = Depends(database.get_db),
    _current_user: models.User = Depends(dependencies.get_current_user),
):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint
@router.patch("/{complaint_id}/status", response_model=schemas.ComplaintOut)
def update_complaint_status(
    complaint_id: int,
    status_update: schemas.ComplaintUpdate,
    db: Session = Depends(database.get_db),
    _current_admin: models.User = Depends(dependencies.get_current_admin),
):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if status_update.status:
        complaint.status = status_update.status
    if status_update.priority:
        complaint.priority = status_update.priority
    db.commit()
    db.refresh(complaint)
    return complaint
@router.post("/{complaint_id}/notes", response_model=schemas.NoteOut)
def add_note(
    complaint_id: int,
    note: schemas.NoteCreate,
    db: Session = Depends(database.get_db),
    current_admin: models.User = Depends(dependencies.get_current_admin),
):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    new_note = models.Note(complaint_id=complaint_id, text=note.text, author_id=current_admin.id)
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note