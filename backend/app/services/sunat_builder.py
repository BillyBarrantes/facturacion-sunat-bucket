import os
from jinja2 import Environment, FileSystemLoader
from decimal import Decimal
from typing import Dict, Any, List

def _convertir_menor_1000(n: int) -> str:
    """Convierte 0-999 a letras."""
    UNIDADES = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"]
    DECENAS = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"]
    SPECIAL = {
        11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE",
        16: "DIECISEIS", 17: "DIECISIETE", 18: "DIECIOCHO", 19: "DIECINUEVE",
        21: "VEINTIUNO", 22: "VEINTIDOS", 23: "VEINTITRES", 24: "VEINTICUATRO",
        25: "VEINTICINCO", 26: "VEINTISEIS", 27: "VEINTISIETE", 28: "VEINTIOCHO", 29: "VEINTINUEVE"
    }
    CENTENAS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"]

    if n == 0:
        return ""
    if n in SPECIAL:
        return SPECIAL[n]
    if n < 10:
        return UNIDADES[n]
    if n < 100:
        d, u = divmod(n, 10)
        if u == 0:
            return DECENAS[d]
        return DECENAS[d] + " Y " + UNIDADES[u]
    if n == 100:
        return "CIEN"
    c, r = divmod(n, 100)
    if r == 0:
        return CENTENAS[c]
    return CENTENAS[c] + " " + _convertir_menor_1000(r)


def _convertir_entero(n: int) -> str:
    """Convierte un entero 0-10^12 a letras en español (escala larga peruana)."""
    if n == 0:
        return "CERO"

    partes = []

    trillones, resto = divmod(n, 1000000000000)
    millardos, resto = divmod(resto, 1000000000)
    millones, resto = divmod(resto, 1000000)
    miles, resto = divmod(resto, 1000)

    if trillones:
        palabra = _convertir_menor_1000(trillones)
        partes.append(f"{palabra} TRILLON" if trillones == 1 else f"{palabra} TRILLONES")
    if millardos:
        palabra = _convertir_menor_1000(millardos)
        partes.append(f"{palabra} MIL MILLONES" if millardos > 1 else "MIL MILLONES")
    if millones:
        if millones == 1:
            partes.append("UN MILLON")
        else:
            partes.append(_convertir_menor_1000(millones) + " MILLONES")
    if miles:
        if miles == 1:
            partes.append("MIL")
        else:
            partes.append(_convertir_menor_1000(miles) + " MIL")
    if resto:
        partes.append(_convertir_menor_1000(resto))

    return " ".join(partes)


def numero_a_letras(numero: float, moneda: str = "PEN") -> str:
    """Convierte un número decimal a su representación en letras según la norma de SUNAT."""
    entero = int(numero)
    decimales = int(round((numero - entero) * 100))
    moneda_str = "SOLES" if moneda == "PEN" else "DÓLARES AMERICANOS"

    texto = _convertir_entero(entero)

    return f"SON: {texto} CON {decimales:02d}/100 {moneda_str}"

class SunatXMLBuilder:
    def __init__(self):
        templates_dir = os.path.join(os.path.dirname(__file__), "..", "templates", "xml")
        self.env = Environment(loader=FileSystemLoader(templates_dir), autoescape=False)

    def build_xml(self, comprobante: Dict[str, Any], emisor: Dict[str, Any], cliente: Dict[str, Any], detalles: List[Dict[str, Any]]) -> str:
        """
        Genera el contenido XML UBL 2.1 para Factura (01), Boleta (03),
        Nota de Crédito (07) o Nota de Débito (08).
        """
        tipo = comprobante.get("tipo_comprobante", "01")
        
        # Calcular letras si no está definido
        if "monto_letras" not in comprobante:
            comprobante["monto_letras"] = numero_a_letras(comprobante["importe_total"], comprobante.get("moneda", "PEN"))

        template_names = {
            "01": "factura_01.xml.j2",
            "03": "boleta_03.xml.j2",
            "07": "nota_credito_07.xml.j2",
            "08": "nota_debito_08.xml.j2",
        }
        template_name = template_names.get(tipo, "factura_01.xml.j2")
        template = self.env.get_template(template_name)

        xml_rendered = template.render(
            comprobante=comprobante,
            emisor=emisor,
            cliente=cliente,
            detalles=detalles
        )
        return xml_rendered

    def build_summary_xml(self, resumen: Dict[str, Any], emisor: Dict[str, Any], lineas: List[Dict[str, Any]]) -> str:
        """Genera el XML UBL 2.1 de Resumen Diario de Comprobantes (RC)."""
        template = self.env.get_template("resumen_diario_rc.xml.j2")
        return template.render(resumen=resumen, emisor=emisor, lineas=lineas)

    def build_voided_xml(self, baja: Dict[str, Any], emisor: Dict[str, Any], lineas: List[Dict[str, Any]]) -> str:
        """Genera el XML UBL 2.1 de Comunicación de Baja (RA)."""
        template = self.env.get_template("comunicacion_baja_ra.xml.j2")
        return template.render(baja=baja, emisor=emisor, lineas=lineas)
