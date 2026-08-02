import jwt
import httpx
import psycopg2
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, Optional
from app.core.config import settings

security_scheme = HTTPBearer(auto_error=True)


def get_db_connection():
    from app.core.database import get_pool_connection
    import logging
    logger = logging.getLogger(__name__)

    pool_conn = get_pool_connection()
    if pool_conn is not None:
        logger.info("[AUTH] get_db_connection -> POOL activo (conexion reutilizada)")
        return pool_conn

    logger.warning("[AUTH] get_db_connection -> POOL no disponible, fallback directo")

    project_ref = settings.SUPABASE_URL.replace("https://", "").split(".")[0]
    hosts = [
        ("aws-0-sa-east-1.pooler.supabase.com", 6543, f"postgres.{project_ref}"),
        (f"db.{project_ref}.supabase.co", 5432, "postgres"),
        (f"db.{project_ref}.supabase.co", 6543, f"postgres.{project_ref}"),
    ]
    last_err = None
    for host, port, user in hosts:
        try:
            conn = psycopg2.connect(
                host=host,
                port=port,
                dbname="postgres",
                user=user,
                password=settings.SUPABASE_DB_PASSWORD,
                connect_timeout=5,
            )
            return conn
        except Exception as e:
            last_err = e
            continue
    raise last_err if last_err else RuntimeError("No se pudo conectar a la BD")

def _fetch_jwks() -> Dict[str, Any]:
    import logging
    logger = logging.getLogger(__name__)

    jwks_uri = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/jwks"

    service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY.strip()
    if not service_role_key:
        logger.error("[JWKS] SUPABASE_SERVICE_ROLE_KEY vacio, no se puede fetchar JWKS")
        return {}

    headers = {"apikey": service_role_key}
    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.get(jwks_uri, headers=headers)
            if res.status_code == 200:
                return res.json()
            logger.warning("[JWKS] fetch HTTP %s: %s", res.status_code, res.text[:200])
            return {}
    except Exception as e:
        logger.warning("[JWKS] fetch fallo: %s: %s", type(e).__name__, str(e)[:200])
        return {}


def _verify_with_jwks(token: str, jwks: Dict[str, Any]) -> Dict[str, Any]:
    import logging
    logger = logging.getLogger(__name__)
    jwks_err: Optional[Exception] = None

    # 1) Leer algoritmo y kid del header del token (no del JWK)
    try:
        header = jwt.get_unverified_header(token)
        token_alg = header.get("alg")
        token_kid = header.get("kid")
    except Exception:
        raise jwt.InvalidTokenError("Token mal formado: header invalido")

    if not token_alg:
        raise jwt.InvalidTokenError("Token mal formado: header sin campo 'alg'")

    # 2) Validar contra JWKS (prioritario)
    for jwk_key in jwks.get("keys", []):
        if token_kid and jwk_key.get("kid") and jwk_key.get("kid") != token_kid:
            continue
        try:
            from jwt import PyJWK
            public_key = PyJWK.from_dict(jwk_key).key
            return jwt.decode(
                token,
                key=public_key,
                algorithms=[token_alg],
                options={"verify_exp": True, "verify_aud": False, "verify_iss": False},
                audience="authenticated",
            )
        except Exception as e:
            jwks_err = e
            logger.warning(
                "[JWKS] Fallo validando token con JWK "
                "kid=%s kty=%s alg=%s: %s: %s",
                jwk_key.get("kid"), jwk_key.get("kty"), jwk_key.get("alg"),
                type(e).__name__, str(e)[:300],
            )
            continue

    # 3) Fallback HS256 (tokens legacy locales) — separado de jwks_err
    supabase_jwt_secret = settings.SUPABASE_JWT_SECRET
    if supabase_jwt_secret:
        logger.warning("[AUTH] JWKS no valido token, intentando fallback HS256 ...")
        try:
            return jwt.decode(
                token,
                key=supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_exp": True, "verify_aud": False, "verify_iss": False},
            )
        except Exception as hs_err:
            logger.error(
                "[AUTH] Fallback HS256 tambien fallo: %s: %s",
                type(hs_err).__name__, str(hs_err)[:300],
            )

    # 4) Lanzar el error real del JWKS — NO el del fallback HS256
    if jwks_err:
        raise jwks_err
    raise jwt.InvalidTokenError("No se pudo verificar el token: sin JWK aplicable y sin SUPABASE_JWT_SECRET")


def _fetch_profile(user_id: str) -> Optional[Dict[str, Any]]:
    project_ref = settings.SUPABASE_URL.replace("https://", "").split(".")[0]
    hosts = [
        ("aws-0-sa-east-1.pooler.supabase.com", 6543, f"postgres.{project_ref}"),
        (f"db.{project_ref}.supabase.co", 5432, "postgres"),
    ]

    for host, port, user in hosts:
        try:
            conn = psycopg2.connect(
                host=host,
                port=port,
                dbname="postgres",
                user=user,
                password=settings.SUPABASE_DB_PASSWORD,
                connect_timeout=5,
            )
            cur = conn.cursor()
            cur.execute(
                "SELECT company_id, role, nombre_completo, email FROM public.profiles WHERE id = %s",
                (user_id,),
            )
            row = cur.fetchone()
            cur.close()
            conn.close()
            if row:
                return {
                    "company_id": row[0],
                    "role": row[1],
                    "nombre_completo": row[2],
                    "email": row[3],
                }
            return None
        except Exception:
            continue

    return None


def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acceso requerido",
        )

    token = credentials.credentials

    jwks = _fetch_jwks()
    import logging
    logger = logging.getLogger(__name__)
    logger.info("[AUTH] JWKS recibio %d claves, verificando token ...", len(jwks.get("keys", [])))
    decoded = _verify_with_jwks(token, jwks)

    user_id = decoded.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no contiene usuario (sub)",
        )

    profile = _fetch_profile(user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario sin perfil activo en el sistema",
        )

    company_id = profile.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no asignado a ninguna empresa (tenant)",
        )

    return {
        "user_id": user_id,
        "email": profile.get("email") or decoded.get("email", ""),
        "company_id": str(company_id),
        "role": profile.get("role") or "USER",
        "nombre_completo": profile.get("nombre_completo") or "",
    }


def require_tenant(
    current_user: Dict[str, Any] = Depends(verify_token),
) -> Dict[str, Any]:
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no asignado a un tenant activo",
        )
    return current_user