import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "FACTURACION-SUNAT Multi-Tenant API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://ezoklvuorziucevhvbde.supabase.co")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_DB_PASSWORD: str = os.getenv("SUPABASE_DB_PASSWORD", "Luilly13md$")
    
    # Google Gemini AI
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Cloudflare R2 Storage
    R2_BUCKET_NAME: str = os.getenv("R2_BUCKET_NAME", "facturacion-sunat-bucket")
    R2_ACCESS_KEY_ID: str = os.getenv("R2_ACCESS_KEY_ID", "")
    R2_SECRET_ACCESS_KEY: str = os.getenv("R2_SECRET_ACCESS_KEY", "")
    R2_ENDPOINT_URL: str = os.getenv("R2_ENDPOINT_URL", "")
    
    # SUNAT Environment (BETA / PRODUCCION)
    SUNAT_ENV: str = os.getenv("SUNAT_ENV", "BETA")
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
