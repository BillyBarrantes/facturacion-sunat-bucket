import httpx
from typing import Dict, Any, Optional
import psycopg2

def lookup_document(num_doc: str, company_id: Optional[str] = None, conn: Optional[Any] = None) -> Dict[str, Any]:
    """
    Consulta de RUC (11 dígitos) o DNI (8 dígitos).
    1. Revisa primero si el cliente ya existe en la base de datos de la empresa (public.clientes).
    2. Si no existe, consulta APIs públicas de SUNAT / RENIEC.
    """
    num_doc = num_doc.strip()
    
    # 1. Búsqueda en base de datos local del Tenant
    if company_id and conn:
        try:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT razon_social, direccion, ubigeo, tipo_doc 
                FROM public.clientes 
                WHERE company_id = %s AND num_doc = %s
                LIMIT 1;
                """,
                (company_id, num_doc)
            )
            row = cur.fetchone()
            cur.close()
            if row:
                return {
                    "found": True,
                    "source": "DATABASE",
                    "num_doc": num_doc,
                    "tipo_doc": row[3],
                    "razon_social": row[0],
                    "direccion": row[1] or "",
                    "ubigeo": row[2] or "150101",
                    "estado": "ACTIVO",
                    "condicion": "HABIDO"
                }
        except Exception:
            pass

    # 2. Búsqueda por RUC (11 dígitos)
    if len(num_doc) == 11:
        tipo_doc = "6"
        # Provider 1: apis.net.pe v1 / v2 public free
        try:
            with httpx.Client(timeout=4.0) as client:
                res = client.get(f"https://api.apis.net.pe/v1/ruc?numero={num_doc}")
                if res.status_code == 200:
                    data = res.json()
                    return {
                        "found": True,
                        "source": "SUNAT_API",
                        "num_doc": num_doc,
                        "tipo_doc": tipo_doc,
                        "razon_social": data.get("nombre") or data.get("razonSocial", ""),
                        "direccion": data.get("direccion", ""),
                        "ubigeo": data.get("ubigeo", "150101"),
                        "estado": data.get("estado", "ACTIVO"),
                        "condicion": data.get("condicion", "HABIDO")
                    }
        except Exception:
            pass

        # Provider 2: dniruc.apisperu.com fallback
        try:
            with httpx.Client(timeout=4.0) as client:
                res = client.get(f"https://dniruc.apisperu.com/api/v1/ruc/{num_doc}")
                if res.status_code == 200:
                    data = res.json()
                    return {
                        "found": True,
                        "source": "SUNAT_API",
                        "num_doc": num_doc,
                        "tipo_doc": tipo_doc,
                        "razon_social": data.get("razonSocial", ""),
                        "direccion": data.get("direccion", ""),
                        "ubigeo": data.get("ubigeo", "150101"),
                        "estado": data.get("estado", "ACTIVO"),
                        "condicion": data.get("condicion", "HABIDO")
                    }
        except Exception:
            pass

    # 3. Búsqueda por DNI (8 dígitos)
    elif len(num_doc) == 8:
        tipo_doc = "1"
        try:
            with httpx.Client(timeout=4.0) as client:
                res = client.get(f"https://api.apis.net.pe/v1/dni?numero={num_doc}")
                if res.status_code == 200:
                    data = res.json()
                    nombre_completo = f"{data.get('nombres', '')} {data.get('apellidoPaterno', '')} {data.get('apellidoMaterno', '')}".strip()
                    return {
                        "found": True,
                        "source": "RENIEC_API",
                        "num_doc": num_doc,
                        "tipo_doc": tipo_doc,
                        "razon_social": nombre_completo or data.get("nombre", ""),
                        "direccion": data.get("direccion", ""),
                        "ubigeo": "150101",
                        "estado": "ACTIVO",
                        "condicion": "HABIDO"
                    }
        except Exception:
            pass

        try:
            with httpx.Client(timeout=4.0) as client:
                res = client.get(f"https://dniruc.apisperu.com/api/v1/dni/{num_doc}")
                if res.status_code == 200:
                    data = res.json()
                    nombre_completo = f"{data.get('nombres', '')} {data.get('apellidoPaterno', '')} {data.get('apellidoMaterno', '')}".strip()
                    return {
                        "found": True,
                        "source": "RENIEC_API",
                        "num_doc": num_doc,
                        "tipo_doc": tipo_doc,
                        "razon_social": nombre_completo,
                        "direccion": "",
                        "ubigeo": "150101",
                        "estado": "ACTIVO",
                        "condicion": "HABIDO"
                    }
        except Exception:
            pass

    # Si no se encuentra en APIs externas, devolver estructura no encontrada
    return {
        "found": False,
        "source": "NONE",
        "num_doc": num_doc,
        "tipo_doc": "6" if len(num_doc) == 11 else "1",
        "razon_social": "",
        "direccion": "",
        "ubigeo": "150101",
        "estado": "DESCONOCIDO",
        "condicion": "DESCONOCIDO"
    }
