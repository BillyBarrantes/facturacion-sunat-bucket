from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from typing import Dict, Any
from app.core.security import require_tenant
from app.services.excel_exporter import SIREExcelExporter

router = APIRouter(prefix="/reports", tags=["Reportes & SIRE Excel"])

@router.get("/sire-ventas/excel")
def download_sire_ventas_excel(
    periodo: str = Query("202607", description="Periodo tributario en formato YYYYMM"),
    current_user: Dict[str, Any] = Depends(require_tenant)
):
    """
    Genera y descarga el archivo Excel (.xlsx) estructurado en el formato oficial del Registro de Ventas para el SIRE (SUNAT).
    """
    exporter = SIREExcelExporter()
    excel_bytes = exporter.export_sire_ventas_excel(current_user["company_id"], periodo)
    
    filename = f"Registro_Ventas_SIRE_{periodo}_{current_user['company_id'][:8]}.xlsx"
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
