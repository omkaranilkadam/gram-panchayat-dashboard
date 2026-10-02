"""
Centralised configuration — reads from environment variables with safe defaults.
For production, set these via your hosting platform's environment variable settings.
"""
import os
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

SECRET_KEY: str = os.getenv("SECRET_KEY", "gram-panchayat-dev-secret-CHANGE-IN-PRODUCTION")
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/gram_panchayat_v2.db")
UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "*").split(",")
