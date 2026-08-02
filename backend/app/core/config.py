import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "FACTURACION-SUNAT Multi-Tenant API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_DB_PASSWORD: str = os.getenv("SUPABASE_DB_PASSWORD", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    R2_BUCKET_NAME: str = os.getenv("R2_BUCKET_NAME", "")
    R2_ACCESS_KEY_ID: str = os.getenv("R2_ACCESS_KEY_ID", "")
    R2_SECRET_ACCESS_KEY: str = os.getenv("R2_SECRET_ACCESS_KEY", "")
    R2_ENDPOINT_URL: str = os.getenv("R2_ENDPOINT_URL", "")

    SUNAT_ENV: str = os.getenv("SUNAT_ENV", "BETA")
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000"
    )

    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "false").lower() == "true"
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
    RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
    RATE_LIMIT_BACKEND: str = os.getenv("RATE_LIMIT_BACKEND", "memory")

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()