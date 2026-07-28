import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.analytics import AnalyticsService
from app.services.excel_exporter import SIREExcelExporter
from app.services.gemini_service import GeminiAIService

def test_sire_excel_export():
    exporter = SIREExcelExporter()
    excel_bytes = exporter.export_sire_ventas_excel(company_id="a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", periodo="202607")
    assert excel_bytes is not None
    assert len(excel_bytes) > 0
    # Verifica la firma de archivo PK / zip de un .xlsx valido
    assert excel_bytes[:2] == b"PK"

def test_gemini_error_translator():
    gemini = GeminiAIService()
    msg_2022 = gemini.translate_sunat_error("2022", "El ruc no existe")
    assert "no se encuentra con el RUC activo" in msg_2022

    msg_0 = gemini.translate_sunat_error("0", "Aceptado")
    assert "aceptado correctamente" in msg_0

def test_gemini_narrative_summary():
    gemini = GeminiAIService()
    metrics = {
        "total_ventas": 1500.00,
        "total_compras": 300.00,
        "igv_estimado_a_pagar": 216.00,
        "conteo_comprobantes": 5
    }
    summary = gemini.generate_narrative_summary(metrics)
    assert "1500.00" in summary
    assert "216.00" in summary
