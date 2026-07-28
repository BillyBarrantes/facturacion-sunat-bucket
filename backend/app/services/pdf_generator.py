import io
import qrcode
import base64
from typing import Dict, Any, List

class PDFGenerator:
    def __init__(self):
        pass

    def generate_qr_base64(self, qr_text: str) -> str:
        """Genera una imagen QR en Base64 PNG."""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=4,
            border=2,
        )
        qr.add_data(qr_text)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        return base64.b64encode(buffer.getvalue()).decode("utf-8")

    def build_qr_string(self, emisor_ruc: str, comprobante: Dict[str, Any], cliente: Dict[str, Any], hash_cpe: str) -> str:
        """Construye la cadena oficial de SUNAT para el Código QR."""
        tipo = comprobante.get("tipo_comprobante", "01")
        serie = comprobante.get("serie", "F001")
        numero = str(comprobante.get("numero", 1))
        igv = f"{comprobante.get('total_igv', 0.00):.2f}"
        total = f"{comprobante.get('importe_total', 0.00):.2f}"
        fecha = comprobante.get("fecha_emision", "").split("T")[0] if isinstance(comprobante.get("fecha_emision"), str) else comprobante.get("fecha_emision").strftime("%Y-%m-%d")
        tipo_doc_cli = cliente.get("tipo_doc", "6")
        num_doc_cli = cliente.get("num_doc", "00000000")

        return f"{emisor_ruc}|{tipo}|{serie}|{numero}|{igv}|{total}|{fecha}|{tipo_doc_cli}|{num_doc_cli}|{hash_cpe}"

    def render_html_ticket(self, emisor: Dict[str, Any], comprobante: Dict[str, Any], cliente: Dict[str, Any], detalles: List[Dict[str, Any]], hash_cpe: str) -> str:
        """Renderiza un diseño limpio en HTML optimizado para Ticket térmico (58mm/80mm) y vista imprimible."""
        qr_text = self.build_qr_string(emisor["ruc"], comprobante, cliente, hash_cpe)
        qr_b64 = self.generate_qr_base64(qr_text)

        tipo_str = "FACTURA ELECTRÓNICA" if comprobante.get("tipo_comprobante") == "01" else "BOLETA DE VENTA ELECTRÓNICA"
        serie_num = f"{comprobante.get('serie')}-{comprobante.get('numero'):08d}"

        items_html = ""
        for d in detalles:
            items_html += f"""
            <tr>
                <td style="text-align: left;">{d['cantidad']} {d.get('unidad_medida', 'NIU')} - {d['descripcion']}</td>
                <td style="text-align: right; font-weight: bold;">S/ {d['total']:.2f}</td>
            </tr>
            """

        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Comprobante {serie_num}</title>
    <style>
        body {{
            font-family: 'Helvetica Neue', Arial, sans-serif;
            width: 280px;
            margin: 0 auto;
            padding: 10px;
            color: #1e293b;
            font-size: 11px;
            line-height: 1.4;
        }}
        .text-center {{ text-align: center; }}
        .text-right {{ text-align: right; }}
        .bold {{ font-weight: bold; }}
        .title {{ font-size: 14px; font-weight: bold; margin-bottom: 2px; }}
        .divider {{ border-top: 1px dashed #cbd5e1; margin: 8px 0; }}
        table {{ width: 100%; border-collapse: collapse; margin: 6px 0; }}
        td {{ padding: 2px 0; vertical-align: top; }}
        .qr-box {{ text-align: center; margin-top: 10px; }}
        .qr-box img {{ width: 110px; height: 110px; }}
    </style>
</head>
<body>
    <div class="text-center">
        <div class="title">{emisor.get('nombre_comercial') or emisor.get('razon_social')}</div>
        <div>RUC: {emisor.get('ruc')}</div>
        <div>{emisor.get('direccion')}</div>
        <div>{emisor.get('distrito', '')} - {emisor.get('provincia', '')}</div>
    </div>

    <div class="divider"></div>

    <div class="text-center bold" style="font-size: 12px;">
        {tipo_str}<br>
        {serie_num}
    </div>

    <div class="divider"></div>

    <div>
        <div><b>Fecha:</b> {comprobante.get('fecha_emision')}</div>
        <div><b>Cliente:</b> {cliente.get('razon_social')}</div>
        <div><b>{('RUC' if cliente.get('tipo_doc') == '6' else 'DNI')}:</b> {cliente.get('num_doc')}</div>
        <div><b>Moneda:</b> {comprobante.get('moneda', 'PEN')}</div>
    </div>

    <div class="divider"></div>

    <table>
        {items_html}
    </table>

    <div class="divider"></div>

    <table>
        <tr>
            <td>Op. Gravada:</td>
            <td class="text-right">S/ {comprobante.get('total_gravado', 0.0):.2f}</td>
        </tr>
        <tr>
            <td>IGV (18%):</td>
            <td class="text-right">S/ {comprobante.get('total_igv', 0.0):.2f}</td>
        </tr>
        <tr class="bold" style="font-size: 13px;">
            <td>TOTAL:</td>
            <td class="text-right">S/ {comprobante.get('importe_total', 0.0):.2f}</td>
        </tr>
    </table>

    <div style="font-size: 9px; text-align: center; margin-top: 4px;">
        {comprobante.get('monto_letras', '')}
    </div>

    <div class="qr-box">
        <img src="data:image/png;base64,{qr_b64}" alt="Código QR SUNAT" />
        <div style="font-size: 8px; color: #64748b; margin-top: 2px;">Hash: {hash_cpe}</div>
        <div style="font-size: 8px; font-weight: bold; margin-top: 4px;">Representación Impresa del Comprobante Electrónico</div>
    </div>
</body>
</html>"""
        return html
