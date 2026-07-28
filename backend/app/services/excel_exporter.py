import io
import pandas as pd
from typing import List, Dict, Any
from app.core.security import get_db_connection

class SIREExcelExporter:
    def export_sire_ventas_excel(self, company_id: str, periodo: str = "202607") -> bytes:
        """
        Genera el archivo Excel estructurado según el formato oficial del Registro de Ventas e Ingresos SIRE de SUNAT.
        """
        conn = get_db_connection()
        cur = conn.cursor()

        try:
            cur.execute(
                """
                SELECT 
                    c.fecha_emision,
                    c.tipo_comprobante,
                    c.serie,
                    c.numero,
                    cl.tipo_doc,
                    cl.num_doc,
                    cl.razon_social,
                    c.total_gravado,
                    c.total_igv,
                    c.importe_total,
                    c.estado_sunat
                FROM public.comprobantes c
                LEFT JOIN public.clientes cl ON c.cliente_id = cl.id
                WHERE c.company_id = %s AND c.estado_sunat != 'ANULADO'
                ORDER BY c.fecha_emision ASC;
                """,
                (company_id,)
            )
            rows = cur.fetchall()

            data = []
            for r in rows:
                fecha_str = r[0].strftime("%d/%m/%Y") if r[0] else ""
                car_sunat = f"{r[1]}{r[2]}{r[3]:08d}"
                
                data.append({
                    "Periodo": f"{periodo}00",
                    "CAR SUNAT": car_sunat,
                    "Fecha Emisión": fecha_str,
                    "Tipo CPE": r[1],
                    "Serie CPE": r[2],
                    "Número CPE": f"{r[3]:08d}",
                    "Tipo Doc Cliente": r[4] or "6",
                    "N° Doc Cliente": r[5] or "20000000000",
                    "Razón Social Cliente": r[6] or "CLIENTE VARIOS",
                    "Base Imponible": float(r[7] or 0.0),
                    "IGV (18%)": float(r[8] or 0.0),
                    "Importe Total": float(r[9] or 0.0),
                    "Estado SUNAT": r[10]
                })

            df = pd.DataFrame(data)
            if df.empty:
                # DataFrame fallback si no hay comprobantes aún
                df = pd.DataFrame(columns=[
                    "Periodo", "CAR SUNAT", "Fecha Emisión", "Tipo CPE", "Serie CPE", "Número CPE",
                    "Tipo Doc Cliente", "N° Doc Cliente", "Razón Social Cliente", "Base Imponible", "IGV (18%)", "Importe Total", "Estado SUNAT"
                ])

            output = io.BytesIO()
            with pd.ExcelWriter(output, engine="openpyxl") as writer:
                df.to_excel(writer, sheet_name="SIRE_Ventas_SUNAT", index=False)
                
            return output.getvalue()
        finally:
            cur.close()
            conn.close()
