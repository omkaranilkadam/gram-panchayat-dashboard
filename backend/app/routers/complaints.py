"""
Complaints CRUD router with server-side filtering, notes/timeline, and deletion.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from .. import database, models, schemas, dependencies

router = APIRouter(prefix="/api/v1/complaints", tags=["complaints"])


@router.get("/", response_model=List[schemas.ComplaintListResponse])
def list_complaints(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """List complaints with optional server-side filtering."""
    query = db.query(models.Complaint)
    if status:
        query = query.filter(models.Complaint.status == status)
    if category:
        query = query.filter(models.Complaint.category == category)
    if priority:
        query = query.filter(models.Complaint.priority == priority)
    if search:
        term = f"%{search}%"
        query = query.filter(
            (models.Complaint.title.ilike(term))
            | (models.Complaint.description.ilike(term))
            | (models.Complaint.ward.ilike(term))
            | (models.Complaint.complainant_name.ilike(term))
        )
    return query.order_by(models.Complaint.created_at.desc()).all()


@router.get("/{complaint_id}", response_model=schemas.ComplaintResponse)
def get_complaint(
    complaint_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """Get a single complaint with its full note/timeline history."""
    complaint = (
        db.query(models.Complaint)
        .options(joinedload(models.Complaint.notes))
        .filter(models.Complaint.id == complaint_id)
        .first()
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint


@router.post("/", response_model=schemas.ComplaintListResponse, status_code=201)
def create_complaint(
    complaint: schemas.ComplaintCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """Register a new complaint and auto-create a timeline note."""
    db_complaint = models.Complaint(**complaint.model_dump())
    db.add(db_complaint)
    db.commit()
    db.refresh(db_complaint)

    # Auto-add creation note to the timeline
    note = models.ComplaintNote(
        complaint_id=db_complaint.id,
        author=current_user.full_name or current_user.username,
        content="Complaint registered with status 'pending'",
        note_type="status_change",
    )
    db.add(note)
    db.commit()
    return db_complaint


@router.patch("/{complaint_id}/status", response_model=schemas.ComplaintListResponse)
def update_status(
    complaint_id: int,
    status_update: schemas.ComplaintUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """Update a complaint's status and record the change in the timeline."""
    complaint = (
        db.query(models.Complaint)
        .filter(models.Complaint.id == complaint_id)
        .first()
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    old_status = complaint.status
    complaint.status = status_update.status

    # Timeline note
    note = models.ComplaintNote(
        complaint_id=complaint_id,
        author=current_user.full_name or current_user.username,
        content=f"Status changed from '{old_status}' to '{status_update.status}'",
        note_type="status_change",
    )
    db.add(note)
    db.commit()
    db.refresh(complaint)
    return complaint


@router.delete("/{complaint_id}", status_code=204)
def delete_complaint(
    complaint_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """Permanently delete a complaint and all its notes."""
    complaint = (
        db.query(models.Complaint)
        .filter(models.Complaint.id == complaint_id)
        .first()
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    db.delete(complaint)
    db.commit()


@router.post(
    "/{complaint_id}/notes",
    response_model=schemas.NoteResponse,
    status_code=201,
)
def add_note(
    complaint_id: int,
    note_data: schemas.NoteCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """Add an admin note to a complaint's timeline."""
    complaint = (
        db.query(models.Complaint)
        .filter(models.Complaint.id == complaint_id)
        .first()
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    note = models.ComplaintNote(
        complaint_id=complaint_id,
        author=current_user.full_name or current_user.username,
        content=note_data.content,
        note_type="note",
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note
