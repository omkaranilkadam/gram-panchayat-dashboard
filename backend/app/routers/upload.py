import os
import shutil
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from .. import dependencies, models
router = APIRouter(prefix="/upload", tags=["upload"])
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
@router.post("/")
def upload_file(
    file: UploadFile = File(...),
    _current_user: models.User = Depends(dependencies.get_current_user),
):
    allowed_types = ["image/jpeg", "image/png", "image/webp", "video/mp4"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File type not allowed")
    file_location = f"{UPLOAD_DIR}/{file.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
    return {"url": f"/media/{file.filename}"}