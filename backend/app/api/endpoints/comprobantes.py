from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.core.security import require_tenant, get_db_connection
from app.services.sunat_builder import SunatXMLBuilder
from app.services.signer import XMLDigitalSigner
from app.services.sunat_client import SunatSOAPClient
from app.services.pdf_generator import PDFGenerator
from app.services.doc_lookup import lookup_document

router = APIRouter(prefix="/comprobantes", tags=["Comprobantes Electrónicos"])

@router.get("/consultar-doc/{num_doc}")
def consultar_documento(
    num_doc: str,
    current_user: Dict[str, Any] = Depends(require_tenant)
):
    """
    Consulta automática de RUC (11 dígitos - SUNAT) o DNI (8 dígitos - RENIEC).
    Revisa primero el historial de clientes de la empresa y luego fuentes oficiales.
    """
    company_id = current_user.get("company_id")
    conn = get_db_connection()
    try:
        data = lookup_document(num_doc, company_id=company_id, conn=conn)
        return data
    finally:
        conn.close()


# Schemas de entrada
class DetalleItemSchema(BaseModel):
    codigo: Optional[str] = "PROD01"
    descripcion: str
    unidad_medida: str = "NIU"
    cantidad: float = Field(..., gt=0)
    precio_unitario: float = Field(..., gt=0) # Incluye IGV

class EmitirComprobanteSchema(BaseModel):
    tipo_comprobante: str = Field(..., example="01") # 01: Factura, 03: Boleta
    serie: str = Field(..., example="F001") # F001 o B001
    numero: int = Field(..., example=1)
    cliente_tipo_doc: str = Field(..., example="6") # 6: RUC, 1: DNI
    cliente_num_doc: str = Field(..., example="20600000001")
    cliente_razon_social: str = Field(..., example="CLIENTE DE PRUEBA S.A.C.")
    cliente_direccion: Optional[str] = Field("", example="AV. LOS OLIVOS 456 - LIMA")
    moneda: str = Field("PEN", example="PEN")
    metodo_pago: str = Field("EFECTIVO", example="EFECTIVO")
    descuento_global: Optional[float] = Field(0.0, example=0.0)
    anticipo_total: Optional[float] = Field(0.0, example=0.0)
    items: List[DetalleItemSchema]

@router.post("/emitir")
def emitir_comprobante(
    payload: EmitirComprobanteSchema,
    current_user: Dict[str, Any] = Depends(require_tenant)
):
    """
    Endpoint principal de Emisión Directa (3 clics).
    Genera XML UBL 2.1, Firma Digitalmente, envía a SUNAT SOAP (BETA/PROD) y guarda en Supabase.
    """
    company_id = current_user["company_id"]
    conn = get_db_connection()
    cur = conn.cursor()

    # 1. Obtener datos de la Empresa (Emisor)
    cur.execute(
        "SELECT ruc, razon_social, nombre_comercial, direccion, ubigeo, distrito, provincia, sol_user, sol_pass_encrypted FROM public.companies WHERE id = %s",
        (company_id,)
    )
    empresa_row = cur.fetchone()
    if not empresa_row:
        # Para ambiente de pruebas, si la empresa no está registrada en DB aún, usamos los datos del emisor de prueba de SUNAT
        emisor = {
            "ruc": "20000000001",
            "razon_social": "EMPRESA MYPE DE PRUEBA S.A.C.",
            "nombre_comercial": "MYPE DIGITAL",
            "direccion": "AV. PRINCIPAL 123",
            "ubigeo": "150101",
            "distrito": "LIMA",
            "provincia": "LIMA",
            "sol_user": "MODDATOS",
            "sol_pass": "MODDATOS"
        }
    else:
        emisor = {
            "ruc": empresa_row[0],
            "razon_social": empresa_row[1],
            "nombre_comercial": empresa_row[2],
            "direccion": empresa_row[3],
            "ubigeo": empresa_row[4],
            "distrito": empresa_row[5],
            "provincia": empresa_row[6],
            "sol_user": empresa_row[7] or "MODDATOS",
            "sol_pass": empresa_row[8] or "MODDATOS"
        }

    # 2. Calcular montos fiscales (IGV 18%)
    total_gravado = 0.0
    total_igv = 0.0
    importe_total = 0.0
    detalles_calculados = []

    for item in payload.items:
        # Desglosar precio unitario (con IGV) en valor unitario (sin IGV)
        precio_u = item.precio_unitario
        valor_u = round(precio_u / 1.18, 4)
        subtotal_valor = round(valor_u * item.cantidad, 2)
        item_igv = round(subtotal_valor * 0.18, 2)
        item_total = round(subtotal_valor + item_igv, 2)

        total_gravado += subtotal_valor
        total_igv += item_igv
        importe_total += item_total

        detalles_calculados.append({
            "codigo": item.codigo,
            "descripcion": item.descripcion,
            "unidad_medida": item.unidad_medida,
            "cantidad": item.cantidad,
            "valor_unitario": valor_u,
            "precio_unitario": precio_u,
            "tipo_afectacion_igv": "10", # Gravado - Operación Onerosa
            "igv": item_igv,
            "total": item_total
        })

    descuento = payload.descuento_global or 0.0
    anticipo = payload.anticipo_total or 0.0

    total_gravado_neto = max(0.0, total_gravado - descuento)
    total_igv = round(total_gravado_neto * 0.18, 2)
    importe_total = max(0.0, total_gravado_neto + total_igv - anticipo)

    comprobante_data = {
        "tipo_comprobante": payload.tipo_comprobante,
        "serie": payload.serie,
        "numero": payload.numero,
        "fecha_emision": datetime.now(),
        "moneda": payload.moneda,
        "total_gravado": round(total_gravado_neto, 2),
        "total_igv": round(total_igv, 2),
        "importe_total": round(importe_total, 2),
        "descuento_global": round(descuento, 2),
        "anticipo_total": round(anticipo, 2),
        "metodo_pago": payload.metodo_pago
    }

    cliente_data = {
        "tipo_doc": payload.cliente_tipo_doc,
        "num_doc": payload.cliente_num_doc,
        "razon_social": payload.cliente_razon_social,
        "direccion": payload.cliente_direccion or ""
    }

    # 3. Construir XML UBL 2.1
    builder = SunatXMLBuilder()
    xml_raw = builder.build_xml(comprobante_data, emisor, cliente_data, detalles_calculados)

    # 4. Firmar Digitalmente el XML
    signer = XMLDigitalSigner()
    xml_firmado, hash_cpe = signer.sign_xml(xml_raw)

    # 5. Enviar a SUNAT vía Web Service SOAP
    filename_base = f"{emisor['ruc']}-{payload.tipo_comprobante}-{payload.serie}-{payload.numero:08d}"
    soap_client = SunatSOAPClient()
    resultado_sunat = soap_client.send_bill(
        ruc=emisor["ruc"],
        sol_user=emisor["sol_user"],
        sol_pass=emisor["sol_pass"],
        filename_base=filename_base,
        xml_content=xml_firmado
    )

    # 6. Registrar en Base de Datos PostgreSQL / Supabase
    try:
        # Guardar / Actualizar cliente en la libreta de clientes del Tenant
        cur.execute(
            """
            INSERT INTO public.clientes (company_id, tipo_doc, num_doc, razon_social, direccion)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (company_id, num_doc) DO UPDATE 
            SET razon_social = EXCLUDED.razon_social, direccion = EXCLUDED.direccion;
            """,
            (company_id, payload.cliente_tipo_doc, payload.cliente_num_doc, payload.cliente_razon_social, payload.cliente_direccion or "")
        )

        cur.execute(
            """
            INSERT INTO public.comprobantes 
            (company_id, tipo_comprobante, serie, numero, fecha_emision, moneda, total_gravado, total_igv, importe_total, metodo_pago, estado_sunat, codigo_error_sunat, mensaje_sunat, hash_cpe)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
            """,
            (
                company_id, payload.tipo_comprobante, payload.serie, payload.numero,
                comprobante_data["fecha_emision"], payload.moneda, comprobante_data["total_gravado"],
                comprobante_data["total_igv"], comprobante_data["importe_total"], payload.metodo_pago,
                resultado_sunat["estado"], resultado_sunat["codigo_error"], resultado_sunat["mensaje_sunat"], hash_cpe
            )
        )
        comprobante_id = cur.fetchone()[0]

        for d in detalles_calculados:
            cur.execute(
                """
                INSERT INTO public.comprobante_detalles
                (comprobante_id, codigo, descripcion, unidad_medida, cantidad, valor_unitario, precio_unitario, tipo_afectacion_igv, igv, total)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """,
                (comprobante_id, d["codigo"], d["descripcion"], d["unidad_medida"], d["cantidad"], d["valor_unitario"], d["precio_unitario"], d["tipo_afectacion_igv"], d["igv"], d["total"])
            )

        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Error guardando en BD: {e}")
    finally:
        cur.close()
        conn.close()

    return {
        "success": True,
        "comprobante_id": str(comprobante_id) if 'comprobante_id' in locals() else None,
        "comprobante": f"{payload.serie}-{payload.numero:08d}",
        "estado_sunat": resultado_sunat["estado"],
        "codigo_sunat": resultado_sunat["codigo_error"],
        "mensaje_sunat": resultado_sunat["mensaje_sunat"],
        "hash_cpe": hash_cpe
    }
