from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from typing import Dict, Any
from app.core.security import require_tenant, get_db_connection
from app.services.gemini_service import GeminiAIService

router = APIRouter(prefix="/purchases", tags=["Compras & OCR IA"])

@router.post("/ocr")
async def process_purchase_ocr(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(require_tenant)
):
    """
    Recibe la imagen de un comprobante de compra desde la cámara del celular, procesa el OCR con Gemini 2.0 Flash
    y guarda el registro en la base de datos Supabase.
    """
    contents = await file.read()
    mime_type = file.content_type or "image/jpeg"

    gemini = GeminiAIService()
    data_extracted = gemini.process_expense_ocr(contents, mime_type)

    # Insertar en tabla compras
    company_id = current_user["company_id"]
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            INSERT INTO public.compras 
            (company_id, ruc_proveedor, razon_social_proveedor, fecha_emision, monto_gravado, igv, monto_total)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
            """,
            (
                company_id,
                data_extracted.get("ruc_proveedor", "20000000000"),
                data_extracted.get("razon_social", "PROVEEDOR EXTRACTIDO"),
                data_extracted.get("fecha_emision", "2026-07-28"),
                data_extracted.get("monto_gravado", 0.0),
                data_extracted.get("igv", 0.0),
                data_extracted.get("monto_total", 0.0)
            )
        )
        compra_id = cur.fetchone()[0]
        conn.commit()

        return {
            "success": True,
            "compra_id": str(compra_id),
            "datos_extraidos": data_extracted
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error guardando compra extraída: {str(e)}"
        )
    finally:
        cur.close()
        conn.close()
