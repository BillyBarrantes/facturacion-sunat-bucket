import os
import sys
import pytest
from datetime import datetime
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.sunat_builder import SunatXMLBuilder, numero_a_letras
from app.services.sunat_client import SunatSOAPClient
from app.services.correlativo_service import next_correlativo, peek_correlativo


# ─── numero_a_letras con miles/millones ────────────────────────────────
def test_letras_miles_y_millones():
    assert numero_a_letras(1000.00) == "SON: MIL CON 00/100 SOLES"
    assert numero_a_letras(1500.75) == "SON: MIL QUINIENTOS CON 75/100 SOLES"
    assert numero_a_letras(10000.00) == "SON: DIEZ MIL CON 00/100 SOLES"
    assert numero_a_letras(100000.00) == "SON: CIEN MIL CON 00/100 SOLES"
    assert numero_a_letras(1000000.00) == "SON: UN MILLON CON 00/100 SOLES"
    assert numero_a_letras(1234567.89) == (
        "SON: UN MILLON DOSCIENTOS TREINTA Y CUATRO MIL "
        "QUINIENTOS SESENTA Y SIETE CON 89/100 SOLES"
    )


# ─── Templates NC (07) / ND (08) ───────────────────────────────────────
def _build_context():
    emisor = {
        "ruc": "20000000001",
        "razon_social": "EMPRESA DE PRUEBA S.A.C.",
        "nombre_comercial": "MYPE",
        "direccion": "AV 1",
        "ubigeo": "150101",
    }
    cliente = {"tipo_doc": "6", "num_doc": "20600000001", "razon_social": "CLIENTE S.A.C."}
    detalles = [
        {
            "codigo": "P1",
            "descripcion": "Producto A",
            "unidad_medida": "NIU",
            "cantidad": 1,
            "valor_unitario": 84.7458,
            "precio_unitario": 100.0,
            "tipo_afectacion_igv": "10",
            "igv": 15.25,
            "total": 100.0,
        }
    ]
    return emisor, cliente, detalles


def test_nota_credito_xml():
    emisor, cliente, detalles = _build_context()
    comp = {
        "tipo_comprobante": "07",
        "serie": "FC01",
        "numero": 1,
        "fecha_emision": datetime.now(),
        "moneda": "PEN",
        "total_gravado": 84.75,
        "total_igv": 15.25,
        "importe_total": 100.0,
        "motivo": "ANULACION DE LA OPERACION",
        "referencia": {"tipo": "01", "serie": "F001", "numero": 5},
    }
    xml = SunatXMLBuilder().build_xml(comp, emisor, cliente, detalles)
    assert "<CreditNote" in xml
    assert "FC01-00000001" in xml
    assert "<cbc:CreditNoteTypeCode listID=\"0101\">07</cbc:CreditNoteTypeCode>" in xml
    assert "F001-00000005" in xml
    assert "<cac:CreditNoteLine>" in xml


def test_nota_debito_xml():
    emisor, cliente, detalles = _build_context()
    comp = {
        "tipo_comprobante": "08",
        "serie": "FD01",
        "numero": 2,
        "fecha_emision": datetime.now(),
        "moneda": "PEN",
        "total_gravado": 84.75,
        "total_igv": 15.25,
        "importe_total": 100.0,
        "motivo": "INTERESES POR MORA",
        "referencia": {"tipo": "03", "serie": "B001", "numero": 7},
    }
    xml = SunatXMLBuilder().build_xml(comp, emisor, cliente, detalles)
    assert "<DebitNote" in xml
    assert "FD01-00000002" in xml
    # UBL 2.1 DebitNote no admite cbc:DebitNoteTypeCode (no existe en el schema).
    # El tipo 08 viaja en BillingReference/InvoiceDocumentReference/DocumentTypeCode.
    assert "DebitNoteTypeCode" not in xml
    assert "B001-00000007" in xml
    assert "<cac:DebitNoteLine>" in xml


def test_nota_debito_xml_orden_ubl():
    """Regression shield: valida que el template ND cumpla la secuencia
    de hijos directos de <DebitNote> segun UBL 2.1 (maindoc UBL-DebitNote-2.1.xsd).
    En particular, DebitNoteTypeCode no debe aparecer, y los 4 aggregates
    criticos deben respetar el orden: DiscrepancyResponse -> BillingReference
    -> AccountingSupplierParty -> AccountingCustomerParty.
    """
    from lxml import etree
    emisor, cliente, detalles = _build_context()
    comp = {
        "tipo_comprobante": "08",
        "serie": "FD01",
        "numero": 3,
        "fecha_emision": datetime.now(),
        "moneda": "PEN",
        "total_gravado": 84.75,
        "total_igv": 15.25,
        "importe_total": 100.0,
        "motivo": "AUMENTO EN EL VALOR",
        "referencia": {"tipo": "01", "serie": "F001", "numero": 1},
    }
    xml = SunatXMLBuilder().build_xml(comp, emisor, cliente, detalles)
    root = etree.fromstring(xml.encode("utf-8"))
    # Hijos directos con namespace strip
    children = [etree.QName(c).localname for c in root if isinstance(c.tag, str)]
    # DebitNoteTypeCode no existe en UBL 2.1 DebitNote -> no debe aparecer
    assert "DebitNoteTypeCode" not in children
    # Orden relativo de los 4 aggregates criticos
    pos = {name: i for i, name in enumerate(children)}
    assert pos["DiscrepancyResponse"] < pos["BillingReference"]
    assert pos["BillingReference"] < pos["AccountingSupplierParty"]
    assert pos["AccountingSupplierParty"] < pos["AccountingCustomerParty"]
    # Secuencia inicial obligatoria (UBL 2.1 DebitNoteType schema)
    assert children[0] == "UBLExtensions"
    assert children[1] == "UBLVersionID"
    assert children[2] == "CustomizationID"
    assert children[3] == "ID"
    assert children[4] == "IssueDate"


# ─── Resumen Diario (RC) y Comunicación de Baja (RA) ───────────────────
def test_resumen_diario_xml():
    emisor, _, _ = _build_context()
    resumen = {
        "id": "RC-20240801-00000001",
        "reference_date": "2024-08-01",
        "issue_date": "2024-08-01",
        "moneda": "PEN",
    }
    lineas = [
        {
            "tipo_comprobante": "03",
            "serie": "B001",
            "numero": 1,
            "total_gravado": 84.75,
            "total_igv": 15.25,
            "importe_total": 100.0,
            "cliente": {"tipo_doc": "1", "num_doc": "41234567", "razon_social": "JUAN PEREZ"},
        }
    ]
    xml = SunatXMLBuilder().build_summary_xml(resumen, emisor, lineas)
    assert "<SummaryDocuments" in xml
    assert "RC-20240801-00000001" in xml
    assert "B001-00000001" in xml
    assert "<cac:SummaryDocumentsLine>" in xml


def test_comunicacion_baja_xml():
    emisor, _, _ = _build_context()
    baja = {"id": "RA-20240801-00000001", "issue_date": "2024-08-01"}
    lineas = [
        {"tipo_comprobante": "03", "serie": "B001", "numero": 1, "motivo": "ERROR EN DATOS"},
    ]
    xml = SunatXMLBuilder().build_voided_xml(baja, emisor, lineas)
    assert "<VoidedDocuments" in xml
    assert "RA-20240801-00000001" in xml
    assert "<cbc:DocumentSerialID>B001</cbc:DocumentSerialID>" in xml
    assert "ERROR EN DATOS" in xml
    assert "<cac:VoidedDocumentsLine>" in xml


# ─── sendSummary / getStatus con mocks ─────────────────────────────────
@patch("app.services.sunat_client.httpx.Client")
def test_send_summary_diferido(mock_client_cls):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = b"""<?xml version="1.0"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body><sendSummaryResponse xmlns="http://service.sunat.gob.pe"/></soap:Body>
</soap:Envelope>"""
    mock_client_cls.return_value.__enter__.return_value.post.return_value = mock_response

    client = SunatSOAPClient(env="BETA")
    res = client.send_summary(
        ruc="20000000001",
        sol_user="MODDATOS",
        sol_pass="MODDATOS",
        filename_base="20000000001-RC-20240801-00000001",
        xml_content="<SummaryDocuments/>",
    )
    assert res["estado"] == "PENDIENTE"


@patch("app.services.sunat_client.httpx.Client")
def test_get_status_sin_cdr(mock_client_cls):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = b"""<?xml version="1.0"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body><getStatusResponse xmlns="http://service.sunat.gob.pe"/></soap:Body>
</soap:Envelope>"""
    mock_client_cls.return_value.__enter__.return_value.post.return_value = mock_response

    client = SunatSOAPClient(env="BETA")
    res = client.get_status(
        ruc="20000000001",
        sol_user="MODDATOS",
        sol_pass="MODDATOS",
        filename_base="20000000001-01-F001-00000001",
    )
    assert res["estado"] == "PENDIENTE"


@patch("app.services.sunat_client.httpx.Client")
def test_send_bill_200_sin_cdr_es_pendiente(mock_client_cls):
    """Si SUNAT responde HTTP 200 pero sin applicationResponse (CDR),
    el comprobante debe quedar PENDIENTE (no OBSERVADO) para habilitar
    reconsulta via getStatus. codigo_error interno NO_CDR conserve trazabilidad."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = b"""<?xml version="1.0"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body><sendBillResponse xmlns="http://service.sunat.gob.pe"/></soap:Body>
</soap:Envelope>"""
    mock_client_cls.return_value.__enter__.return_value.post.return_value = mock_response

    client = SunatSOAPClient(env="BETA")
    res = client.send_bill(
        ruc="20000000001",
        sol_user="MODDATOS",
        sol_pass="MODDATOS",
        filename_base="20000000001-08-F001-00000001",
        xml_content="<DebitNote/>",
    )
    assert res["estado"] == "PENDIENTE"
    assert res["codigo_error"] == "NO_CDR"
    assert "Reconsulte" in res["mensaje_sunat"]


@patch("app.services.sunat_client.httpx.Client")
def test_send_summary_error_soap(mock_client_cls):
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.content = b"""<?xml version="1.0"?>
<soap:Fault xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><faultcode>soap:Server</faultcode><faultstring>Error interno</faultstring></soap:Fault>"""
    mock_client_cls.return_value.__enter__.return_value.post.return_value = mock_response

    client = SunatSOAPClient(env="BETA")
    res = client.send_summary(
        ruc="20000000001",
        sol_user="MODDATOS",
        sol_pass="MODDATOS",
        filename_base="20000000001-RA-20240801-00000001",
        xml_content="<VoidedDocuments/>",
    )
    assert res["estado"] == "RECHAZADO"
    assert "Error interno" in res["mensaje_sunat"]


# ─── Correlativo atómico con cursor mock ───────────────────────────────
def test_next_correlativo_flujo():
    cursor = MagicMock()
    # fetchone ahora devuelve (ultimo_numero, max_numero_comprobantes)
    cursor.fetchone.return_value = (5, 5)
    n = next_correlativo(cursor, "company-uuid", "01", "F001")
    assert n == 6
    calls = [c[0][0] for c in cursor.execute.call_args_list]
    assert "FOR UPDATE" in calls[1]
    assert "UPDATE public.correlativos" in calls[2]


def test_next_correlativo_drift_comprobantes_mayor():
    """Si MAX(comprobantes.numero) > correlativos.ultimo_numero (drift),
    next_correlativo debe resincronizar hacia adelante para evitar
    duplicate key en unique_comprobante_per_company."""
    cursor = MagicMock()
    # comprobantes ya tiene numero=3, correlativos quedó en 2
    cursor.fetchone.return_value = (2, 3)
    n = next_correlativo(cursor, "company-uuid", "01", "F001")
    assert n == 4  # max(2,3)+1 = 4, salta el colisionado
    calls = [c[0][0] for c in cursor.execute.call_args_list]
    assert "MAX(comp.numero)" in calls[1]


def test_peek_correlativo():
    cursor = MagicMock()
    cursor.fetchone.return_value = (4,)
    n = peek_correlativo(cursor, "company-uuid", "03", "B001")
    assert n == 5
