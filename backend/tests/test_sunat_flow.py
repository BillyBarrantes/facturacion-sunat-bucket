import os
import sys
import pytest
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.sunat_builder import SunatXMLBuilder, numero_a_letras
from app.services.signer import XMLDigitalSigner
from app.services.pdf_generator import PDFGenerator
from app.services.sunat_client import SunatSOAPClient

def test_numero_a_letras():
    assert numero_a_letras(153.40, "PEN") == "SON: CIENTO CINCUENTA Y TRES CON 40/100 SOLES"
    assert numero_a_letras(100.00, "PEN") == "SON: CIEN CON 00/100 SOLES"
    assert numero_a_letras(25.50, "USD") == "SON: VEINTICINCO CON 50/100 DÓLARES AMERICANOS"

def test_xml_builder_and_signer():
    emisor = {
        "ruc": "20000000001",
        "razon_social": "EMPRESA DE PRUEBA S.A.C.",
        "nombre_comercial": "MYPE PRUEBA",
        "direccion": "AV. TRIBUTARIA 123",
        "ubigeo": "150101"
    }
    comprobante = {
        "tipo_comprobante": "01",
        "serie": "F001",
        "numero": 1,
        "fecha_emision": datetime.now(),
        "moneda": "PEN",
        "total_gravado": 100.00,
        "total_igv": 18.00,
        "importe_total": 118.00
    }
    cliente = {
        "tipo_doc": "6",
        "num_doc": "20600000001",
        "razon_social": "CLIENTE PRUEBA S.A.C."
    }
    detalles = [
        {
            "codigo": "P001",
            "descripcion": "DESARROLLO DE SOFTWARE",
            "unidad_medida": "NIU",
            "cantidad": 1.0,
            "valor_unitario": 100.00,
            "precio_unitario": 118.00,
            "tipo_afectacion_igv": "10",
            "igv": 18.00,
            "total": 118.00
        }
    ]

    builder = SunatXMLBuilder()
    xml_raw = builder.build_xml(comprobante, emisor, cliente, detalles)
    assert "<Invoice" in xml_raw
    assert "F001-00000001" in xml_raw

    signer = XMLDigitalSigner()
    xml_signed, hash_cpe = signer.sign_xml(xml_raw)
    assert "<ds:Signature" in xml_signed
    assert len(hash_cpe) == 28

def test_pdf_qr_generator():
    pdf_gen = PDFGenerator()
    emisor = {"ruc": "20000000001", "razon_social": "EMPRESA DE PRUEBA S.A.C.", "direccion": "LIMA"}
    comprobante = {"tipo_comprobante": "01", "serie": "F001", "numero": 1, "fecha_emision": "2026-07-28", "total_igv": 18.0, "importe_total": 118.0}
    cliente = {"tipo_doc": "6", "num_doc": "20600000001", "razon_social": "CLIENTE TEST"}
    detalles = [{"cantidad": 1, "unidad_medida": "NIU", "descripcion": "TEST", "total": 118.0}]

    html_ticket = pdf_gen.render_html_ticket(emisor, comprobante, cliente, detalles, "HASH123456789012345678901234")
    assert "data:image/png;base64," in html_ticket
    assert "HASH123456789012345678901234" in html_ticket

def test_sunat_beta_soap_communication():
    """Prueba real de envío del paquete XML a SUNAT BETA Web Service SOAP."""
    emisor = {
        "ruc": "20000000001",
        "razon_social": "EMPRESA DE PRUEBA S.A.C.",
        "direccion": "AV. TRIBUTARIA 123",
        "ubigeo": "150101"
    }
    comprobante = {
        "tipo_comprobante": "01",
        "serie": "F001",
        "numero": 99999,
        "fecha_emision": datetime.now(),
        "moneda": "PEN",
        "total_gravado": 100.00,
        "total_igv": 18.00,
        "importe_total": 118.00
    }
    cliente = {
        "tipo_doc": "6",
        "num_doc": "20600000001",
        "razon_social": "CLIENTE FINAL S.A.C."
    }
    detalles = [
        {"codigo": "P01", "descripcion": "SERVICIO BETA TEST", "unidad_medida": "NIU", "cantidad": 1.0, "valor_unitario": 100.00, "precio_unitario": 118.00, "tipo_afectacion_igv": "10", "igv": 18.00, "total": 118.00}
    ]

    builder = SunatXMLBuilder()
    xml_raw = builder.build_xml(comprobante, emisor, cliente, detalles)

    signer = XMLDigitalSigner()
    xml_firmado, _ = signer.sign_xml(xml_raw)

    soap_client = SunatSOAPClient(env="BETA")
    res = soap_client.send_bill(
        ruc="20000000001",
        sol_user="MODDATOS",
        sol_pass="MODDATOS",
        filename_base="20000000001-01-F001-00099999",
        xml_content=xml_firmado
    )

    print("Respuesta SUNAT SOAP BETA:", res)
    # SUNAT BETA debe responder o dar formato de procesado/error controlado
    assert res["estado"] in ["ACEPTADO", "RECHAZADO", "OBSERVADO"]
