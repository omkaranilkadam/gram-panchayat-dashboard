"""
File upload router with validation (type + size).
"""
import os
import uuid
import base64
import requests
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

    # Upload to ImgBB
    api_key = os.environ.get("IMGBB_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ImgBB API key is not configured on the server.")

    try:
        # ImgBB API requires the image to be base64 encoded or passed as a file
        response = requests.post(
            "https://api.imgbb.com/1/upload",
            data={
                "key": api_key,
                "image": base64.b64encode(content).decode('utf-8')
            }
        )
        
        response_data = response.json()
        if response.status_code == 200 and response_data.get("success"):
            return {"url": response_data["data"]["url"]}
        else:
            print(f"ImgBB upload error: {response_data}")
            raise Exception(response_data.get("error", {}).get("message", "Unknown error"))
    except Exception as e:
        print(f"ImgBB upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")
