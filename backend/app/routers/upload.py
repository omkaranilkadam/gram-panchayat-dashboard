"""
File upload router with validation (type + size).
"""
import os
import uuid
import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException

from .. import dependencies, models
from ..config import UPLOAD_DIR

router = APIRouter(prefix="/api/v1/upload", tags=["upload"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

import mimetypes

# Configure Cloudinary if environment variables are present
if os.environ.get("CLOUDINARY_CLOUD_NAME"):
    cloudinary.config(
        cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
        api_key=os.environ.get("CLOUDINARY_API_KEY"),
        api_secret=os.environ.get("CLOUDINARY_API_SECRET")
    )

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

    if not os.environ.get("CLOUDINARY_CLOUD_NAME"):
        raise HTTPException(status_code=500, detail="Cloudinary is not configured on the server.")

    try:
        # Upload directly using the binary content
        result = cloudinary.uploader.upload(content, folder="gram_panchayat_uploads")
        return {"url": result.get("secure_url")}
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")
