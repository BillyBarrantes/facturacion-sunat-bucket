from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.core.security import require_tenant
from app.services.analytics import AnalyticsService
from app.services.gemini_service import GeminiAIService

router = APIRouter(prefix="/dashboard", tags=["Dashboard & AI Analytics"])

@router.get("/metrics")
def get_dashboard_metrics(current_user: Dict[str, Any] = Depends(require_tenant)):
    """Obtiene las métricas financieras del día/mes y la estimación de IGV a pagar."""
    analytics = AnalyticsService()
    return analytics.get_company_metrics(current_user["company_id"])

@router.post("/ai-summary")
def get_ai_narrative_summary(current_user: Dict[str, Any] = Depends(require_tenant)):
    """Genera un resumen narrativo breve con Google Gemini 2.0 Flash a partir de los datos consolidados."""
    analytics = AnalyticsService()
    metrics = analytics.get_company_metrics(current_user["company_id"])
    
    gemini = GeminiAIService()
    summary = gemini.generate_narrative_summary(metrics)
    
    return {
        "resumen_ejecutivo": summary
    }
