from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.security import verify_token, require_tenant
from app.core.database import init_pool, close_pool
from app.core.middleware import RateLimitMiddleware
from app.api.endpoints.auth import router as auth_router
from app.api.endpoints.comprobantes import router as comprobantes_router
from app.api.endpoints.dashboard import router as dashboard_router
from app.api.endpoints.reports import router as reports_router
from app.api.endpoints.purchases import router as purchases_router
from typing import Dict, Any
import jwt
import logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

allowed_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware)

app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(comprobantes_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(purchases_router, prefix=settings.API_V1_STR)


@app.exception_handler(jwt.PyJWTError)
async def jwt_exception_handler(request: Request, exc: jwt.PyJWTError):
    detail = str(exc) or exc.__class__.__name__
    logger.warning(
        "[AUTH] %s rechazado: %s: %s",
        request.url.path, type(exc).__name__, detail[:200],
    )
    return JSONResponse(
        status_code=401,
        content={
            "detail": "Token invalido o expirado. Vuelve a iniciar sesion.",
            "error_type": type(exc).__name__,
        },
    )


@app.on_event("startup")
def startup():
    logger.info("Iniciando aplicacion...")
    try:
        init_pool()
    except Exception as e:
        if settings.SUNAT_ENV == "BETA":
            logger.warning(f"No se pudo inicializar pool BD, continuando en modo degradado: {e}")
        else:
            logger.error(f"Error fatal inicializando pool BD: {e}")
            raise


@app.on_event("shutdown")
def shutdown():
    logger.info("Deteniendo aplicacion...")
    close_pool()


@app.get("/")
def root():
    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.SUNAT_ENV,
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
        "email": user["email"],
    }