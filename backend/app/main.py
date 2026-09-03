from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from . import database, models
from .routers import auth, complaints, upload
models.Base.metadata.create_all(bind=database.engine)
try:
    import seed
    seed.seed()
except Exception as e:
    print("Failed to run seed script:", e)

app = FastAPI(title="Gram Panchayat Secure API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router, prefix="/api/v1")
app.include_router(complaints.router, prefix="/api/v1")
app.include_router(upload.router, prefix="/api/v1")
app.mount("/media", StaticFiles(directory="uploads"), name="media")
@app.get("/")
def read_root():
    return {"message": "Welcome to Gram Panchayat API"}