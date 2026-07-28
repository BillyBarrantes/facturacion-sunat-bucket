from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.security import verify_token, require_tenant
from app.api.endpoints.comprobantes import router as comprobantes_router
from app.api.endpoints.dashboard import router as dashboard_router
from app.api.endpoints.reports import router as reports_router
from app.api.endpoints.purchases import router as purchases_router
from typing import Dict, Any

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configuración de CORS para Next.js Frontend y Vercel
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers del API v1
app.include_router(comprobantes_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(purchases_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.SUNAT_ENV
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get(f"{settings.API_V1_STR}/me")
def get_current_user_profile(user: Dict[str, Any] = Depends(require_tenant)):
    return {
        "user_id": user["user_id"],
        "company_id": user["company_id"],
        "role": user["role"],
        "nombre": user["nombre_completo"],
        "email": user["email"]
    }
