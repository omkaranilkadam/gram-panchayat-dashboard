"""
Centralised configuration — reads from environment variables with safe defaults.
For production, set these via your hosting platform's environment variable settings.
"""
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv is optional in production

SECRET_KEY: str = os.getenv("SECRET_KEY", "gram-panchayat-dev-secret-CHANGE-IN-PRODUCTION")
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./gram_panchayat.db")
UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "*").split(",")
