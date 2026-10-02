"""
Panchayat settings — single-row CRUD for system-wide configuration.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import database, models, schemas, dependencies

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


def _get_or_create_settings(db: Session) -> models.PanchayatSettings:
    """Return the singleton settings row, creating it with defaults if absent."""
    settings = db.query(models.PanchayatSettings).first()
    if not settings:
        settings = models.PanchayatSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("/", response_model=schemas.SettingsResponse)
def get_settings(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    return _get_or_create_settings(db)


@router.put("/", response_model=schemas.SettingsResponse)
def update_settings(
    settings_data: schemas.SettingsUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    settings = _get_or_create_settings(db)
    update_data = settings_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return settings
