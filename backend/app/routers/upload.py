"""
File upload router with validation (type + size).
"""
import os
import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException

from .. import dependencies, models
from ..config import UPLOAD_DIR

router = APIRouter(prefix="/api/v1/upload", tags=["upload"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

import mimetypes

@router.post("/")
async def upload_image(
    file: UploadFile = File(...)
):
    content_type = file.content_type
    if not content_type or content_type == "application/octet-stream":
        guessed_type, _ = mimetypes.guess_type(file.filename)
        if guessed_type:
            content_type = guessed_type

    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{content_type}' (original: {file.content_type}) not allowed. Use JPEG, PNG, GIF, or WebP.",
        )

    content = await file.read()
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=400, detail="File too large. Maximum size is 20 MB."
        )

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    extension = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        buffer.write(content)

    return {"url": f"/uploads/{filename}"}
