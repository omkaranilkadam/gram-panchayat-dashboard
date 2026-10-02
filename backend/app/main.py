"""
FastAPI application entry-point.
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import engine, Base
from .config import CORS_ORIGINS, UPLOAD_DIR
from .routers import auth, complaints, upload, stats, settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup."""
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Gram Panchayat API",
    description="REST API for the Gram Panchayat Complaint Management Dashboard",
    version="2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Register all routers
app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(upload.router)
app.include_router(stats.router)
app.include_router(settings.router)


@app.get("/")
def read_root():
    return {
        "message": "Gram Panchayat API v2.0",
        "status": "running",
        "docs": "/docs",
    }
