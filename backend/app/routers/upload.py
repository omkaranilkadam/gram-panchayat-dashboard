"""
File upload router with validation (type + size).
"""
import os
import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import firebase_admin
from firebase_admin import credentials, storage

from .. import dependencies, models
from ..config import UPLOAD_DIR

router = APIRouter(prefix="/api/v1/upload", tags=["upload"])

# Initialize Firebase Admin if not already initialized
if not firebase_admin._apps:
    # Use environment variable for production, or local file for development
    cred_path = os.environ.get("FIREBASE_CREDENTIALS_PATH")
    if not cred_path:
        if os.path.exists("/etc/secrets/firebase-adminsdk.json"):
            cred_path = "/etc/secrets/firebase-adminsdk.json"
        else:
            cred_path = "firebase-adminsdk.json"
            
    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            'storageBucket': 'grampanchayat-3385d.appspot.com'
        })
        print("Firebase Admin initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize Firebase Admin: {e}")

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

    extension = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{extension}"
    
    # Upload to Firebase Storage
    try:
        if not firebase_admin._apps:
            raise Exception("Firebase Admin is not initialized.")
            
        bucket = storage.bucket()
        blob = bucket.blob(f"uploads/{filename}")
        
        # Generate a download token to make it accessible without making the whole bucket public
        download_token = str(uuid.uuid4())
        blob.metadata = {"firebaseStorageDownloadTokens": download_token}
        
        # Set content type properly
        blob.upload_from_string(content, content_type=content_type)
        
        # Build the standard Firebase Storage URL
        public_url = f"https://firebasestorage.googleapis.com/v0/b/{bucket.name}/o/uploads%2F{filename}?alt=media&token={download_token}"
        
        return {"url": public_url}
    except Exception as e:
        print(f"Firebase upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")
