import os
from jinja2 import Environment, FileSystemLoader
from decimal import Decimal
from typing import Dict, Any, List

def numero_a_letras(numero: float, moneda: str = "PEN") -> str:
    """Convierte un número decimal a su representación en letras según la norma de SUNAT."""
    UNIDADES = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"]
    DECENAS = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"]
    SPECIAL = {
        11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE",
        16: "DIECISEIS", 17: "DIECISIETE", 18: "DIECIOCHO", 19: "DIECINUEVE",
        21: "VEINTIUNO", 22: "VEINTIDOS", 23: "VEINTITRES", 24: "VEINTICUATRO",
        25: "VEINTICINCO", 26: "VEINTISEIS", 27: "VEINTISIETE", 28: "VEINTIOCHO", 29: "VEINTINUEVE"
    }
    CENTENAS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"]

    entero = int(numero)
    decimales = int(round((numero - entero) * 100))
    moneda_str = "SOLES" if moneda == "PEN" else "DÓLARES AMERICANOS"

    if entero == 0:
        texto = "CERO"
    elif entero in SPECIAL:
        texto = SPECIAL[entero]
    elif entero < 10:
        texto = UNIDADES[entero]
    elif entero < 100:
        d, u = divmod(entero, 10)
        texto = DECENAS[d] + (" Y " + UNIDADES[u] if u > 0 else "")
    elif entero == 100:
        texto = "CIEN"
    elif entero < 1000:
        c, r = divmod(entero, 100)
        if r in SPECIAL:
            texto = CENTENAS[c] + " " + SPECIAL[r]
        else:
            d, u = divmod(r, 10)
            texto = CENTENAS[c] + (" " + DECENAS[d] if d > 0 else "") + (" Y " + UNIDADES[u] if u > 0 else "")
    else:
        # Para montos mayores simplificamos el formateador a 2 decimales estándar
        texto = str(entero)

    return f"SON: {texto} CON {decimales:02d}/100 {moneda_str}"

class SunatXMLBuilder:
    def __init__(self):
        templates_dir = os.path.join(os.path.dirname(__file__), "..", "templates", "xml")
        self.env = Environment(loader=FileSystemLoader(templates_dir), autoescape=False)

    def build_xml(self, comprobante: Dict[str, Any], emisor: Dict[str, Any], cliente: Dict[str, Any], detalles: List[Dict[str, Any]]) -> str:
        """
        Genera el contenido XML UBL 2.1 para Factura (01) o Boleta (03).
        """
        tipo = comprobante.get("tipo_comprobante", "01")
        
        # Calcular letras si no está definido
        if "monto_letras" not in comprobante:
            comprobante["monto_letras"] = numero_a_letras(comprobante["importe_total"], comprobante.get("moneda", "PEN"))

        template_name = "factura_01.xml.j2" if tipo == "01" else "boleta_03.xml.j2"
        template = self.env.get_template(template_name)

        xml_rendered = template.render(
            comprobante=comprobante,
            emisor=emisor,
            cliente=cliente,
            detalles=detalles
        )
        return xml_rendered
