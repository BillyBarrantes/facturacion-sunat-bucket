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
from app.services.correlativo_service import next_correlativo, peek_correlativo
from app.core.config import settings

router = APIRouter(prefix="/comprobantes", tags=["Comprobantes Electronicos"])


def _get_emisor_or_raise(company_id: str, cur) -> dict:
    """
    Obtiene los datos del emisor desde la tabla companies.
    En PRODUCCION lanza HTTPException si faltan sol_user/sol_pass o CDT.
    En BETA tolera NULL con fallback MODDATOS (compatibilidad).
    """
    cur.execute(
        "SELECT ruc, razon_social, nombre_comercial, direccion, ubigeo, "
        "distrito, provincia, sol_user, sol_pass_encrypted "
        "FROM public.companies WHERE id = %s",
        (company_id,),
    )
    row = cur.fetchone()

    is_prod = settings.SUNAT_ENV == "PRODUCCION"

    if not row:
        if is_prod:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Empresa no encontrada. No se puede emitir en PRODUCCION."
            )
        return {
            "ruc": "20000000001",
            "razon_social": "EMPRESA MYPE DE PRUEBA S.A.C.",
            "nombre_comercial": "MYPE DIGITAL",
            "direccion": "AV. PRINCIPAL 123",
            "ubigeo": "150101",
            "distrito": "LIMA",
            "provincia": "LIMA",
            "sol_user": "MODDATOS",
            "sol_pass": "MODDATOS",
        }

    emisor = {
        "ruc": row[0],
        "razon_social": row[1],
        "nombre_comercial": row[2],
        "direccion": row[3],
        "ubigeo": row[4],
        "distrito": row[5],
        "provincia": row[6],
        "sol_user": row[7],
        "sol_pass": row[8],
    }

    if is_prod:
        if not emisor["sol_user"] or not emisor["sol_pass"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Empresa sin credenciales SOL configuradas (PRODUCCION)."
            )

    if not is_prod:
        emisor["sol_user"] = emisor["sol_user"] or "MODDATOS"
        emisor["sol_pass"] = emisor["sol_pass"] or "MODDATOS"

    return emisor

@router.get("")
def listar_comprobantes(current_user: Dict[str, Any] = Depends(require_tenant)):
    """Obtiene la lista de comprobantes emitidos por la empresa desde Supabase DB con ítems reales."""
    company_id = current_user["company_id"]
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT 
                c.id, c.tipo_comprobante, c.serie, c.numero, c.fecha_emision,
                c.moneda, c.importe_total, c.total_gravado, c.total_igv, c.estado_sunat, c.hash_cpe,
                c.motivo, c.doc_referencia_tipo, c.doc_referencia_serie, c.doc_referencia_numero,
                cl.num_doc, cl.razon_social, cl.direccion
            FROM public.comprobantes c
            LEFT JOIN public.clientes cl ON c.cliente_id = cl.id
            WHERE c.company_id = %s
            ORDER BY c.created_at DESC;
            """,
            (company_id,)
        )
        rows = cur.fetchall()
        comprobantes = []
        for r in rows:
            comp_id = r[0]
            cur.execute(
                """
                SELECT descripcion, cantidad, precio_unitario, total
                FROM public.comprobante_detalles
                WHERE comprobante_id = %s;
                """,
                (comp_id,)
            )
            item_rows = cur.fetchall()
            items_list = []
            for item in item_rows:
                items_list.append({
                    "descripcion": item[0],
                    "cantidad": float(item[1]),
                    "precio_unitario": float(item[2]),
                    "total": float(item[3])
                })

            comprobantes.append({
                "id": str(r[0]),
                "tipo_comprobante": r[1],
                "serie_numero": f"{r[2]}-{r[3]:08d}",
                "fecha_emision": r[4].strftime('%d/%m/%Y %H:%M') if r[4] else "",
                "moneda": r[5],
                "importe_total": float(r[6]),
                "total_gravado": float(r[7] or 0),
                "total_igv": float(r[8] or 0),
                "estado_sunat": r[9],
                "hash_cpe": r[10] or "",
                "motivo": r[11] or "",
                "doc_referencia_tipo": r[12] or "",
                "doc_referencia_serie": r[13] or "",
                "doc_referencia_numero": r[14] or "",
                "cliente_num_doc": r[15] or "00000000",
                "cliente_razon_social": r[16] or "CLIENTES VARIOS",
                "cliente_direccion": r[17] or "",
                "items": items_list
            })
        return {"success": True, "comprobantes": comprobantes}
    finally:
        cur.close()
        conn.close()

@router.get("/correlativo/{tipo_comprobante}/{serie}")
def obtener_correlativo(
    tipo_comprobante: str, 
    serie: str, 
    current_user: Dict[str, Any] = Depends(require_tenant)
):
    """Obtiene el siguiente número correlativo para la serie especificada."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        siguiente = peek_correlativo(
            cur, current_user["company_id"], tipo_comprobante, serie
        )
        if siguiente is None:
            cur.execute(
                "SELECT COALESCE(MAX(numero), 0) FROM public.comprobantes WHERE company_id = %s AND tipo_comprobante = %s AND serie = %s",
                (current_user["company_id"], tipo_comprobante, serie)
            )
            siguiente = cur.fetchone()[0] + 1
        return {"success": True, "siguiente_numero": siguiente}
    finally:
        cur.close()
        conn.close()

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
    # Campos para Notas de Crédito (07) y Notas de Débito (08)
    comprobante_referencia_tipo: Optional[str] = Field(None, description="Tipo del CPE original (01 o 03)")
    comprobante_referencia_serie: Optional[str] = Field(None, description="Serie del CPE original (F001/B001)")
    comprobante_referencia_numero: Optional[int] = Field(None, description="Número del CPE original")
    motivo: Optional[str] = Field(None, description="Motivo de la nota (ej: ANULACION DE LA OPERACION)")

@router.post("/emitir")
def emitir_comprobante(
    payload: EmitirComprobanteSchema,
    current_user: Dict[str, Any] = Depends(require_tenant)
):
    """
    Endpoint principal de Emisión Directa (3 clics).
    Genera XML UBL 2.1, Firma Digitalmente, envía a SUNAT SOAP y guarda en Supabase.
    """
    company_id = current_user["company_id"]
    conn = get_db_connection()
    cur = conn.cursor()

    emisor = _get_emisor_or_raise(company_id, cur)

    # 2. Validar Notas de Crédito/Débito: requieren comprobante de referencia
    if payload.tipo_comprobante in ("07", "08"):
        if not (payload.comprobante_referencia_tipo and payload.comprobante_referencia_serie and payload.comprobante_referencia_numero):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Para Notas de Crédito/Débito es obligatorio indicar el comprobante de referencia (tipo, serie y número)."
            )
        if payload.comprobante_referencia_tipo not in ("01", "03"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El comprobante de referencia debe ser Factura (01) o Boleta (03)."
            )

    # 2. Calcular montos fiscales (IGV 18%)
    total_gravado = 0.0
    total_igv = 0.0
    importe_total = 0.0
    detalles_calculados = []

    for item in payload.items:
        precio_u = float(item.precio_unitario)
        
        # Calcular el total del ítem PRIMERO (basado en el precio unitario exacto)
        item_total = round(precio_u * item.cantidad, 2)
        
        # Deducir el subtotal (Valor de Venta) quitándole el IGV al total del ítem
        subtotal_valor = round(item_total / 1.18, 2)
        
        # Deducir el IGV restándole al total el subtotal
        item_igv = round(item_total - subtotal_valor, 2)
        
        # Valor unitario para el XML (4 decimales por estándar)
        valor_u = round(precio_u / 1.18, 4)

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
            "tipo_afectacion_igv": "10",
            "igv": item_igv,
            "total": item_total
        })

    descuento = payload.descuento_global or 0.0
    anticipo = payload.anticipo_total or 0.0

    # Prorratear el descuento global sobre cada línea para que el IGV por ítem
    # siga siendo coherente con los totales (regla SUNAT: TaxTotal = suma de líneas).
    if descuento > 0 and total_gravado > 0:
        factor = (total_gravado - descuento) / total_gravado
        detalles_calculados_netos = []
        total_gravado_neto = 0.0
        total_igv = 0.0
        importe_total = 0.0
        for d in detalles_calculados:
            base_neto = round(d["total"] / 1.18 * factor, 4)
            igv_neto = round(base_neto * 0.18, 2)
            total_neto = round(base_neto + igv_neto, 2)
            d_neto = dict(d)
            d_neto["valor_unitario"] = round(base_neto / d["cantidad"], 4) if d["cantidad"] else 0.0
            d_neto["igv"] = igv_neto
            d_neto["total"] = total_neto
            detalles_calculados_netos.append(d_neto)
            total_gravado_neto += base_neto
            total_igv += igv_neto
            importe_total += total_neto
        detalles_calculados = detalles_calculados_netos
        total_gravado_neto = round(total_gravado_neto, 2)
        total_igv = round(total_igv, 2)
        importe_total = round(importe_total, 2)
    else:
        total_gravado_neto = round(total_gravado, 2)
        total_igv = round(total_igv, 2)
        importe_total = round(total_gravado_neto + total_igv, 2)

    importe_total = max(0.0, importe_total - anticipo)

    # 2.5 Calcular el número correlativo correcto desde la BD (bloqueo atómico FOR UPDATE)
    siguiente_numero = next_correlativo(
        cur, company_id, payload.tipo_comprobante, payload.serie
    )

    comprobante_data = {
        "tipo_comprobante": payload.tipo_comprobante,
        "serie": payload.serie,
        "numero": siguiente_numero,
        "fecha_emision": datetime.now(),
        "moneda": payload.moneda,
        "total_gravado": round(total_gravado_neto, 2),
        "total_igv": round(total_igv, 2),
        "importe_total": round(importe_total, 2),
        "descuento_global": round(descuento, 2),
        "anticipo_total": round(anticipo, 2),
        "metodo_pago": payload.metodo_pago
    }

    if payload.tipo_comprobante in ("07", "08"):
        comprobante_data["motivo"] = payload.motivo or "ANULACION DE LA OPERACION"
        comprobante_data["referencia"] = {
            "tipo": payload.comprobante_referencia_tipo,
            "serie": payload.comprobante_referencia_serie,
            "numero": payload.comprobante_referencia_numero,
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
    filename_base = f"{emisor['ruc']}-{payload.tipo_comprobante}-{payload.serie}-{siguiente_numero:08d}"
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
            ON CONFLICT (company_id, tipo_doc, num_doc) DO UPDATE 
            SET razon_social = EXCLUDED.razon_social, direccion = EXCLUDED.direccion
            RETURNING id;
            """,
            (company_id, payload.cliente_tipo_doc, payload.cliente_num_doc, payload.cliente_razon_social, payload.cliente_direccion or "")
        )
        cliente_id = cur.fetchone()[0]

        cur.execute(
            """
            INSERT INTO public.comprobantes 
            (company_id, cliente_id, tipo_comprobante, serie, numero, fecha_emision, moneda, total_gravado, total_igv, importe_total, metodo_pago, estado_sunat, codigo_error_sunat, mensaje_sunat, hash_cpe, motivo, doc_referencia_tipo, doc_referencia_serie, doc_referencia_numero)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
            """,
            (
                company_id, cliente_id, payload.tipo_comprobante, payload.serie, siguiente_numero,
                comprobante_data["fecha_emision"], payload.moneda, comprobante_data["total_gravado"],
                comprobante_data["total_igv"], comprobante_data["importe_total"], payload.metodo_pago,
                resultado_sunat["estado"], resultado_sunat["codigo_error"], resultado_sunat["mensaje_sunat"], hash_cpe,
                comprobante_data.get("motivo"),
                comprobante_data.get("referencia", {}).get("tipo"),
                comprobante_data.get("referencia", {}).get("serie"),
                comprobante_data.get("referencia", {}).get("numero"),
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
        raise HTTPException(status_code=500, detail=f"Error al guardar en base de datos: {str(e)}")
    finally:
        cur.close()
        conn.close()

    return {
        "success": True,
        "comprobante_id": str(comprobante_id) if 'comprobante_id' in locals() else None,
        "comprobante": f"{payload.serie}-{siguiente_numero:08d}",
        "estado_sunat": resultado_sunat["estado"],
        "codigo_sunat": resultado_sunat["codigo_error"],
        "mensaje_sunat": resultado_sunat["mensaje_sunat"],
        "hash_cpe": hash_cpe
    }


@router.post("/get-status-cdr/{comprobante_id}")
def consultar_estado_cdr(
    comprobante_id: str,
    current_user: Dict[str, Any] = Depends(require_tenant),
):
    """
    Consulta el CDR de un comprobante pendiente (PENDIENTE/PENDIENTE_RC/PENDIENTE_BAJA)
    vía getStatus de SUNAT y actualiza el estado en la BD.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT c.serie, c.numero, c.tipo_comprobante, c.estado_sunat
            FROM public.comprobantes c
            WHERE c.id = %s AND c.company_id = %s
            """,
            (comprobante_id, current_user["company_id"])
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Comprobante no encontrado")

        serie, numero, tipo_comprobante, estado_actual = row[0], row[1], row[2], row[3]
        emisor = _get_emisor_or_raise(current_user["company_id"], cur)

        if estado_actual in ("ACEPTADO", "RECHAZADO", "OBSERVADO", "ANULADO"):
            return {
                "success": True,
                "estado_sunat": estado_actual,
                "mensaje_sunat": "El comprobante ya tiene un estado final procesado.",
            }

        filename_base = f"{emisor['ruc']}-{tipo_comprobante}-{serie}-{numero:08d}"
        soap_client = SunatSOAPClient()
        resultado = soap_client.get_status(
            ruc=emisor["ruc"],
            sol_user=emisor["sol_user"],
            sol_pass=emisor["sol_pass"],
            filename_base=filename_base,
        )

        if resultado["estado"] != "PENDIENTE":
            cur.execute(
                """
                UPDATE public.comprobantes
                SET estado_sunat = %s, codigo_error_sunat = %s, mensaje_sunat = %s, updated_at = NOW()
                WHERE id = %s AND company_id = %s
                """,
                (resultado["estado"], resultado["codigo_error"], resultado["mensaje_sunat"], comprobante_id, current_user["company_id"])
            )
            conn.commit()

        return {
            "success": True,
            "estado_sunat": resultado["estado"],
            "codigo_error": resultado["codigo_error"],
            "mensaje_sunat": resultado["mensaje_sunat"],
        }
    finally:
        cur.close()
        conn.close()


class EnviarBajaSchema(BaseModel):
    comprobantes_ids: List[str] = Field(..., description="IDs de los comprobantes a dar de baja")
    motivo: str = Field("ERROR EN DATOS DEL COMPROBANTE", description="Motivo de la baja")


@router.post("/enviar-baja")
def enviar_comunicacion_baja(
    payload: EnviarBajaSchema,
    current_user: Dict[str, Any] = Depends(require_tenant),
):
    """
    Genera y envía una Comunicación de Baja (RA) para comprobantes emitidos
    por BETA que necesitan anulación, y marca los comprobantes como PENDIENTE_BAJA.
    """
    if not payload.comprobantes_ids:
        raise HTTPException(status_code=400, detail="Se requiere al menos un comprobante a dar de baja.")

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        placeholders = ",".join(["%s"] * len(payload.comprobantes_ids))
        cur.execute(
            f"""
            SELECT c.id, c.serie, c.numero, c.tipo_comprobante, c.estado_sunat, c.cliente_id,
                   cl.tipo_doc, cl.num_doc, cl.razon_social
            FROM public.comprobantes c
            LEFT JOIN public.clientes cl ON cl.id = c.cliente_id
            WHERE c.company_id = %s AND c.id IN ({placeholders})
            """,
            [current_user["company_id"]] + payload.comprobantes_ids
        )
        rows = cur.fetchall()
        if not rows:
            raise HTTPException(status_code=404, detail="No se encontraron comprobantes para dar de baja.")

        emisor = _get_emisor_or_raise(current_user["company_id"], cur)

        lineas = []
        for r in rows:
            lineas.append({
                "tipo_comprobante": r[3],
                "serie": r[1],
                "numero": r[2],
                "motivo": payload.motivo,
            })

        hoy = datetime.now().strftime("%Y%m%d")
        correlativo_baja = datetime.now().strftime("%H%M%S%f")[:-3]
        id_baja = f"RA-{hoy}-{correlativo_baja}"
        baja = {"id": id_baja, "issue_date": datetime.now().strftime("%Y-%m-%d")}

        builder = SunatXMLBuilder()
        xml_raw = builder.build_voided_xml(baja, emisor, lineas)

        signer = XMLDigitalSigner()
        xml_firmado, hash_cpe = signer.sign_xml(xml_raw)

        filename_base = f"{emisor['ruc']}-RA-{hoy}-{correlativo_baja}"
        soap_client = SunatSOAPClient()
        resultado_sunat = soap_client.send_summary(
            ruc=emisor["ruc"],
            sol_user=emisor["sol_user"],
            sol_pass=emisor["sol_pass"],
            filename_base=filename_base,
            xml_content=xml_firmado
        )

        # Marcar comprobantes como PENDIENTE_BAJA (hasta obtener CDR de la RA)
        cur.execute(
            f"""
            UPDATE public.comprobantes
            SET estado_sunat = 'PENDIENTE_BAJA', mensaje_sunat = %s, updated_at = NOW()
            WHERE company_id = %s AND id IN ({placeholders})
            """,
            [resultado_sunat["mensaje_sunat"], current_user["company_id"]] + payload.comprobantes_ids
        )
        conn.commit()

        return {
            "success": True,
            "id_baja": id_baja,
            "estado_sunat": resultado_sunat["estado"],
            "codigo_error": resultado_sunat["codigo_error"],
            "mensaje_sunat": resultado_sunat["mensaje_sunat"],
            "comprobantes_bajados": [r[1] for r in rows],
        }
    finally:
        cur.close()
        conn.close()


class EnviarResumenSchema(BaseModel):
    comprobantes_ids: List[str] = Field(..., description="IDs de boletas a incluir en el resumen diario")


@router.post("/enviar-resumen")
def enviar_resumen_diario(
    payload: EnviarResumenSchema,
    current_user: Dict[str, Any] = Depends(require_tenant),
):
    """
    Genera y envía un Resumen Diario de Comprobantes (RC) para boletas,
    y marca los comprobantes como PENDIENTE_RC hasta obtener el CDR.
    """
    if not payload.comprobantes_ids:
        raise HTTPException(status_code=400, detail="Se requiere al menos un comprobante para el resumen.")

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        placeholders = ",".join(["%s"] * len(payload.comprobantes_ids))
        cur.execute(
            f"""
            SELECT c.id, c.serie, c.numero, c.tipo_comprobante, c.total_gravado, c.total_igv, c.importe_total,
                   cl.tipo_doc, cl.num_doc, cl.razon_social
            FROM public.comprobantes c
            LEFT JOIN public.clientes cl ON cl.id = c.cliente_id
            WHERE c.company_id = %s AND c.id IN ({placeholders})
            """,
            [current_user["company_id"]] + payload.comprobantes_ids
        )
        rows = cur.fetchall()
        if not rows:
            raise HTTPException(status_code=404, detail="No se encontraron comprobantes para el resumen.")

        emisor = _get_emisor_or_raise(current_user["company_id"], cur)

        lineas = []
        for r in rows:
            cliente_line = None
            if r[7] and r[8]:
                cliente_line = {
                    "tipo_doc": r[7],
                    "num_doc": r[8],
                    "razon_social": r[9] or "CLIENTE",
                }
            lineas.append({
                "tipo_comprobante": r[3],
                "serie": r[1],
                "numero": r[2],
                "total_gravado": float(r[4] or 0),
                "total_igv": float(r[5] or 0),
                "importe_total": float(r[6] or 0),
                "cliente": cliente_line,
            })

        hoy = datetime.now().strftime("%Y%m%d")
        correlativo_rc = datetime.now().strftime("%H%M%S%f")[:-3]
        id_rc = f"RC-{hoy}-{correlativo_rc}"
        resumen = {
            "id": id_rc,
            "reference_date": datetime.now().strftime("%Y-%m-%d"),
            "issue_date": datetime.now().strftime("%Y-%m-%d"),
            "moneda": "PEN",
        }

        builder = SunatXMLBuilder()
        xml_raw = builder.build_summary_xml(resumen, emisor, lineas)

        signer = XMLDigitalSigner()
        xml_firmado, hash_cpe = signer.sign_xml(xml_raw)

        filename_base = f"{emisor['ruc']}-RC-{hoy}-{correlativo_rc}"
        soap_client = SunatSOAPClient()
        resultado_sunat = soap_client.send_summary(
            ruc=emisor["ruc"],
            sol_user=emisor["sol_user"],
            sol_pass=emisor["sol_pass"],
            filename_base=filename_base,
            xml_content=xml_firmado
        )

        cur.execute(
            f"""
            UPDATE public.comprobantes
            SET estado_sunat = 'PENDIENTE_RC', mensaje_sunat = %s, updated_at = NOW()
            WHERE company_id = %s AND id IN ({placeholders})
            """,
            [resultado_sunat["mensaje_sunat"], current_user["company_id"]] + payload.comprobantes_ids
        )
        conn.commit()

        return {
            "success": True,
            "id_resumen": id_rc,
            "estado_sunat": resultado_sunat["estado"],
            "codigo_error": resultado_sunat["codigo_error"],
            "mensaje_sunat": resultado_sunat["mensaje_sunat"],
            "comprobantes_incluidos": [r[1] for r in rows],
        }
    finally:
        cur.close()
        conn.close()
