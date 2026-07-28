from typing import Dict, Any
from app.core.security import get_db_connection

class AnalyticsService:
    def get_company_metrics(self, company_id: str) -> Dict[str, Any]:
        """Calcula los KPIs inmediatos, estimación de IGV y desglose por método de pago."""
        conn = get_db_connection()
        cur = conn.cursor()

        try:
            # 1. Sumatoria y conteo de Ventas (Comprobantes Aceptados o Pendientes)
            cur.execute(
                """
                SELECT 
                    COALESCE(SUM(importe_total), 0.00),
                    COALESCE(SUM(total_igv), 0.00),
                    COUNT(id)
                FROM public.comprobantes
                WHERE company_id = %s AND estado_sunat != 'ANULADO';
                """,
                (company_id,)
            )
            sales_row = cur.fetchone()
            total_ventas = float(sales_row[0])
            igv_ventas = float(sales_row[1])
            conteo_comprobantes = sales_row[2]

            # 2. Sumatoria e IGV de Compras
            cur.execute(
                """
                SELECT 
                    COALESCE(SUM(monto_total), 0.00),
                    COALESCE(SUM(igv), 0.00),
                    COUNT(id)
                FROM public.compras
                WHERE company_id = %s;
                """,
                (company_id,)
            )
            purchases_row = cur.fetchone()
            total_compras = float(purchases_row[0])
            igv_compras = float(purchases_row[1])
            conteo_compras = purchases_row[2]

            # 3. Estimación de IGV a Pagar (IGV Ventas - IGV Compras)
            igv_estimado = max(0.00, round(igv_ventas - igv_compras, 2))

            # 4. Desglose por Método de Pago
            cur.execute(
                """
                SELECT metodo_pago, COALESCE(SUM(importe_total), 0.00)
                FROM public.comprobantes
                WHERE company_id = %s AND estado_sunat != 'ANULADO'
                GROUP BY metodo_pago;
                """,
                (company_id,)
            )
            metodos = {row[0]: float(row[1]) for row in cur.fetchall()}

            return {
                "total_ventas": round(total_ventas, 2),
                "igv_ventas": round(igv_ventas, 2),
                "conteo_comprobantes": conteo_comprobantes,
                "total_compras": round(total_compras, 2),
                "igv_compras": round(igv_compras, 2),
                "conteo_compras": conteo_compras,
                "igv_estimado_a_pagar": igv_estimado,
                "desglose_metodos_pago": {
                    "EFECTIVO": metodos.get("EFECTIVO", 0.00),
                    "YAPE_PLIN": metodos.get("YAPE", 0.00) + metodos.get("PLIN", 0.00),
                    "TRANSFERENCIA": metodos.get("TRANSFERENCIA", 0.00),
                    "TARJETA": metodos.get("TARJETA", 0.00)
                }
            }
        finally:
            cur.close()
            conn.close()
