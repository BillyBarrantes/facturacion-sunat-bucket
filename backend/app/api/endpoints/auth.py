from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
import httpx
from typing import Dict, Any
from app.core.config import settings
from app.core.security import get_db_connection

router = APIRouter(prefix="/auth", tags=["Autenticación & Tenant Registration"])

class RegisterCompanySchema(BaseModel):
    ruc: str = Field(..., min_length=11, max_length=11, example="20601234567")
    razon_social: str = Field(..., example="MI EMPRESA S.A.C.")
    email: str = Field(..., example="admin@empresa.pe")
    password: str = Field(..., min_length=6, example="Password123$")

class LoginSchema(BaseModel):
    email: str
    password: str

@router.post("/register-company")
def register_company(payload: RegisterCompanySchema):
    """
    Registra una nueva empresa (Tenant) y su usuario Administrador en Supabase.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # 1. Verificar si la empresa (RUC) ya existe
        cur.execute("SELECT id FROM public.companies WHERE ruc = %s", (payload.ruc,))
        if cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El RUC ingresado ya se encuentra registrado en el sistema."
            )

        # 2. Crear usuario en Supabase Auth via Admin API
        auth_admin_url = f"{settings.SUPABASE_URL}/auth/v1/admin/users"
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json"
        }
        user_body = {
            "email": payload.email,
            "password": payload.password,
            "email_confirm": True
        }

        with httpx.Client(timeout=15.0) as client:
            res = client.post(auth_admin_url, headers=headers, json=user_body)

        if res.status_code not in [200, 201]:
            # Si el usuario ya existe en Supabase Auth, intentamos obtener su ID
            err_json = res.json()
            err_msg = err_json.get("msg") or err_json.get("message") or "Error registrando usuario"
            
            # Buscar el user_id existente por email si aplica
            if "already registered" in err_msg.lower() or "already exists" in err_msg.lower():
                get_user_url = f"{settings.SUPABASE_URL}/auth/v1/admin/users?email={payload.email}"
                with httpx.Client(timeout=15.0) as client:
                    get_res = client.get(get_user_url, headers=headers)
                users_found = get_res.json().get("users", [])
                if users_found:
                    user_id = users_found[0]["id"]
                else:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
        else:
            user_data = res.json()
            user_id = user_data["id"]

        # 3. Insertar Empresa en `public.companies`
        cur.execute(
            """
            INSERT INTO public.companies 
            (ruc, razon_social, nombre_comercial, direccion, ubigeo, distrito, provincia, sol_user, sol_pass_encrypted)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
            """,
            (
                payload.ruc, payload.razon_social, payload.razon_social,
                "AV. PRINCIPAL 123", "150101", "LIMA", "LIMA",
                "MODDATOS", "MODDATOS"
            )
        )
        company_id = cur.fetchone()[0]

        # 4. Insertar Perfil en `public.profiles`
        cur.execute(
            """
            INSERT INTO public.profiles (id, company_id, nombre_completo, email, role)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET company_id = EXCLUDED.company_id;
            """,
            (user_id, company_id, payload.razon_social, payload.email, "ADMIN")
        )

        conn.commit()

        # 5. Generar token de sesión mediante inicio de sesión automático
        login_url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password"
        anon_headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json"
        }
        with httpx.Client(timeout=15.0) as client:
            login_res = client.post(login_url, headers=anon_headers, json={"email": payload.email, "password": payload.password})

        session_data = login_res.json() if login_res.status_code == 200 else {}

        return {
            "success": True,
            "message": "Empresa y usuario administrador registrados con éxito",
            "company_id": str(company_id),
            "user_id": user_id,
            "access_token": session_data.get("access_token"),
            "token_type": "bearer"
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando empresa: {str(e)}"
        )
    finally:
        cur.close()
        conn.close()

@router.post("/login")
def login_user(payload: LoginSchema):
    """
    Inicia sesión con email y password en Supabase Auth y retorna los datos de perfil de la empresa.
    """
    login_url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json"
    }
    
    with httpx.Client(timeout=15.0) as client:
        res = client.post(login_url, headers=headers, json={"email": payload.email, "password": payload.password})

    if res.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas (email o contraseña)"
        )

    auth_data = res.json()
    user_id = auth_data["user"]["id"]

    # Obtener perfil y company_id
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT p.company_id, p.nombre_completo, p.role, c.ruc, c.razon_social 
            FROM public.profiles p
            JOIN public.companies c ON p.company_id = c.id
            WHERE p.id = %s
            """,
            (user_id,)
        )
        profile = cur.fetchone()
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El usuario no tiene una empresa asociada"
            )

        return {
            "access_token": auth_data["access_token"],
            "user_id": user_id,
            "company_id": str(profile[0]),
            "nombre": profile[1],
            "role": profile[2],
            "company_ruc": profile[3],
            "company_razon_social": profile[4]
        }
    finally:
        cur.close()
        conn.close()
