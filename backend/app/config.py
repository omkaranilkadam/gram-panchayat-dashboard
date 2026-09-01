from pydantic_settings import BaseSettings
class Settings(BaseSettings):
    SECRET_KEY: str = "gram_panchayat_super_secret_key_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  
    DATABASE_URL: str = "sqlite:///./gram_panchayat.db"
    class Config:
        env_file = ".env"
settings = Settings()