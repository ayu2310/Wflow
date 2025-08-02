from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://wflow_user:wflow_password@localhost:5432/wflow_db"
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # AI Configuration
    gemini_api_key: str = ""
    
    # Security
    secret_key: str = "your-secret-key-change-this"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Application
    debug: bool = True
    environment: str = "development"
    cors_origins: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Browser Automation
    browser_headless: bool = True
    browser_timeout: int = 30000
    screenshot_quality: int = 85
    
    # Celery
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()