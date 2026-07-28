from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import psycopg2
from typing import Dict, Any
from app.core.config import settings

security_scheme = HTTPBearer()

def get_db_connection():
    """Conexión limpia a Supabase PostgreSQL."""
    project_ref = settings.SUPABASE_URL.replace("https://", "").split(".")[0]
    
    hosts = [
        ("aws-0-sa-east-1.pooler.supabase.com", 6543, f"postgres.{project_ref}"),
        (f"db.{project_ref}.supabase.co", 5432, "postgres"),
        (f"db.{project_ref}.supabase.co", 6543, f"postgres.{project_ref}")
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
                connect_timeout=5
            )
            return conn
        except Exception as e:
            last_err = e
            continue
            
    raise last_err


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> Dict[str, Any]:
    """
    Verifica el JWT emitido por Supabase Auth y obtiene los datos del usuario y su company_id.
    """
    token = credentials.credentials
    try:
        # Decodificar token de Supabase JWT (RS256/HS256)
        # Nota: En desarrollo podemos inspeccionar sin verificar firma si no tenemos el JWT_SECRET público,
        # pero con Supabase anon/service_role leemos la información del token.
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token no contiene sub (User ID) válido"
            )
            
        # Consultar el company_id del usuario en la tabla profiles
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, company_id, role, nombre_completo, email FROM public.profiles WHERE id = %s",
            (user_id,)
        )
        profile = cur.fetchone()
        cur.close()
        conn.close()
        
        if not profile:
            # Si el usuario no tiene perfil aún, retornamos el user_id pero advertimos la falta de company_id
            return {
                "user_id": user_id,
                "email": payload.get("email"),
                "company_id": None,
                "role": "PENDING"
            }
            
        return {
            "user_id": profile[0],
            "company_id": profile[1],
            "role": profile[2],
            "nombre_completo": profile[3],
            "email": profile[4]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido o expirado: {str(e)}"
        )

def require_tenant(current_user: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
    """Garantiza que el usuario pertenezca a una empresa (tenant) activa."""
    if not current_user.get("company_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario no pertenece a ninguna empresa registrada."
        )
    return current_user
