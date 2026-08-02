import io
import zipfile
import base64
import httpx
from lxml import etree
from typing import Dict, Any
from app.core.config import settings

class SunatSOAPClient:
    def __init__(self, env: str = None):
        self.env = env or settings.SUNAT_ENV
        if self.env == "PRODUCCION":
            self.soap_url = "https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService"
        else:
            self.soap_url = "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService"

    def pack_zip(self, filename_xml: str, xml_content: str) -> bytes:
        """Empaqueta el contenido XML dentro de un archivo ZIP en memoria."""
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            zip_file.writestr(filename_xml, xml_content.encode("utf-8"))
        return zip_buffer.getvalue()

    def unpack_cdr_zip(self, cdr_zip_bytes: bytes) -> tuple:
        """Descomprime el archivo CDR ZIP devuelto por SUNAT y extrae el XML y el código de respuesta."""
        try:
            with zipfile.ZipFile(io.BytesIO(cdr_zip_bytes), "r") as zip_file:
                for file_info in zip_file.infolist():
                    if file_info.filename.endswith(".xml"):
                        cdr_xml = zip_file.read(file_info.filename).decode("utf-8", errors="ignore")
                        
                        # Parsear código de respuesta <cbc:ResponseCode> y descripción
                        root = etree.fromstring(cdr_xml.encode("utf-8"))
                        namespaces = {
                            "ar": "urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2",
                            "cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
                            "cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
                        }
                        code_node = root.xpath("//cbc:ResponseCode", namespaces=namespaces)
                        desc_node = root.xpath("//cbc:Description", namespaces=namespaces)
                        
                        code = code_node[0].text if code_node else "0"
                        desc = desc_node[0].text if desc_node else "Comprobante procesado exitosamente por SUNAT."
                        
                        return cdr_xml, code, desc
            return "", "UNKNOWN", "No se encontró XML dentro del CDR de respuesta."
        except Exception as e:
            return "", "ERROR_UNPACK", f"Error descomprimiendo CDR: {str(e)}"

    def send_bill(self, ruc: str, sol_user: str, sol_pass: str, filename_base: str, xml_content: str) -> Dict[str, Any]:
        """
        Envía un comprobante firmado digitalmente a SUNAT vía Web Service SOAP.
        filename_base ejemplo: '20000000001-01-F001-00000001'
        """
        filename_xml = f"{filename_base}.xml"
        filename_zip = f"{filename_base}.zip"

        # 1. Empaquetar XML en ZIP
        zip_bytes = self.pack_zip(filename_xml, xml_content)
        zip_b64 = base64.b64encode(zip_bytes).decode("utf-8")

        # 2. Construir Envelope SOAP
        username_full = f"{ruc}{sol_user}"
        soap_envelope = f"""<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe">
    <soapenv:Header>
        <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
            <wsse:UsernameToken>
                <wsse:Username>{username_full}</wsse:Username>
                <wsse:Password>{sol_pass}</wsse:Password>
            </wsse:UsernameToken>
        </wsse:Security>
    </soapenv:Header>
    <soapenv:Body>
        <ser:sendBill>
            <fileName>{filename_zip}</fileName>
            <contentFile>{zip_b64}</contentFile>
        </ser:sendBill>
    </soapenv:Body>
</soapenv:Envelope>"""

        headers = {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": "urn:sendBill"
        }

        try:
            print(f"Enviando comprobante {filename_base} a SUNAT SOAP ({self.soap_url})...")
            with httpx.Client(timeout=30.0) as client:
                response = client.post(self.soap_url, content=soap_envelope, headers=headers)

            if response.status_code != 200:
                # Extraer error SOAP Fault si existe
                try:
                    root = etree.fromstring(response.content)
                    fault_code = root.xpath("//*[local-name()='faultcode']")
                    fault_string = root.xpath("//*[local-name()='faultstring']")
                    err_code = fault_code[0].text if fault_code else str(response.status_code)
                    err_msg = fault_string[0].text if fault_string else response.text
                    return {
                        "estado": "RECHAZADO",
                        "codigo_error": err_code,
                        "mensaje_sunat": err_msg,
                        "cdr_xml": None,
                        "cdr_zip_bytes": None
                    }
                except Exception:
                    return {
                        "estado": "RECHAZADO",
                        "codigo_error": str(response.status_code),
                        "mensaje_sunat": f"Error HTTP {response.status_code}: {response.text}",
                        "cdr_xml": None,
                        "cdr_zip_bytes": None
                    }

            # Si status 200, extraer applicationResponse (CDR zip base64)
            root = etree.fromstring(response.content)
            app_resp = root.xpath("//applicationResponse/text()")
            if not app_resp:
                return {
                    "estado": "OBSERVADO",
                    "codigo_error": "NO_CDR",
                    "mensaje_sunat": "SUNAT respondió 200 pero no incluyó la constancia CDR.",
                    "cdr_xml": None,
                    "cdr_zip_bytes": None
                }

            cdr_zip_bytes = base64.b64decode(app_resp[0])
            cdr_xml, res_code, res_desc = self.unpack_cdr_zip(cdr_zip_bytes)

            estado_final = "ACEPTADO" if res_code == "0" else ("OBSERVADO" if res_code.startswith("4") else "RECHAZADO")

            return {
                "estado": estado_final,
                "codigo_error": res_code,
                "mensaje_sunat": res_desc,
                "cdr_xml": cdr_xml,
                "cdr_zip_bytes": cdr_zip_bytes
            }

        except Exception as e:
            return {
                "estado": "ERROR_CONEXION",
                "codigo_error": "500",
                "mensaje_sunat": f"Error de comunicación con SUNAT: {str(e)}",
                "cdr_xml": None,
                "cdr_zip_bytes": None
            }

    def send_summary(self, ruc: str, sol_user: str, sol_pass: str, filename_base: str, xml_content: str) -> Dict[str, Any]:
        """
        Envía un Resumen Diario (RC) o Comunicación de Baja (RA) firmado a SUNAT vía sendSummary.
        filename_base ejemplo: '20000000001-RC-20240801-00000001'
        """
        filename_xml = f"{filename_base}.xml"
        filename_zip = f"{filename_base}.zip"

        zip_bytes = self.pack_zip(filename_xml, xml_content)
        zip_b64 = base64.b64encode(zip_bytes).decode("utf-8")

        username_full = f"{ruc}{sol_user}"
        soap_envelope = f"""<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe">
    <soapenv:Header>
        <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
            <wsse:UsernameToken>
                <wsse:Username>{username_full}</wsse:Username>
                <wsse:Password>{sol_pass}</wsse:Password>
            </wsse:UsernameToken>
        </wsse:Security>
    </soapenv:Header>
    <soapenv:Body>
        <ser:sendSummary>
            <fileName>{filename_zip}</fileName>
            <contentFile>{zip_b64}</contentFile>
        </ser:sendSummary>
    </soapenv:Body>
</soapenv:Envelope>"""

        headers = {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": "urn:sendSummary"
        }

        try:
            print(f"Enviando {filename_base} a SUNAT SOAP sendSummary ({self.soap_url})...")
            with httpx.Client(timeout=30.0) as client:
                response = client.post(self.soap_url, content=soap_envelope, headers=headers)

            if response.status_code != 200:
                try:
                    root = etree.fromstring(response.content)
                    fault_code = root.xpath("//*[local-name()='faultcode']")
                    fault_string = root.xpath("//*[local-name()='faultstring']")
                    err_code = fault_code[0].text if fault_code else str(response.status_code)
                    err_msg = fault_string[0].text if fault_string else response.text
                    return {
                        "estado": "RECHAZADO",
                        "codigo_error": err_code,
                        "mensaje_sunat": err_msg,
                        "cdr_xml": None,
                        "cdr_zip_bytes": None
                    }
                except Exception:
                    return {
                        "estado": "RECHAZADO",
                        "codigo_error": str(response.status_code),
                        "mensaje_sunat": f"Error HTTP {response.status_code}: {response.text}",
                        "cdr_xml": None,
                        "cdr_zip_bytes": None
                    }

            # sendSummary normalmente no devuelve CDR inmediato; requiere getStatus
            # para el CDR diferido. Si hay applicationResponse, lo procesamos.
            root = etree.fromstring(response.content)
            app_resp = root.xpath("//applicationResponse/text()")
            if app_resp:
                cdr_zip_bytes = base64.b64decode(app_resp[0])
                cdr_xml, res_code, res_desc = self.unpack_cdr_zip(cdr_zip_bytes)
                estado_final = "ACEPTADO" if res_code == "0" else ("OBSERVADO" if res_code.startswith("4") else "RECHAZADO")
                return {
                    "estado": estado_final,
                    "codigo_error": res_code,
                    "mensaje_sunat": res_desc,
                    "cdr_xml": cdr_xml,
                    "cdr_zip_bytes": cdr_zip_bytes
                }

            # Respuesta 200 sin CDR: procesamiento diferido. Queda PENDIENTE hasta getStatus.
            return {
                "estado": "PENDIENTE",
                "codigo_error": "0",
                "mensaje_sunat": "Enviado a SUNAT. El CDR estará disponible vía getStatus (procesamiento diferido).",
                "cdr_xml": None,
                "cdr_zip_bytes": None
            }

        except Exception as e:
            return {
                "estado": "ERROR_CONEXION",
                "codigo_error": "500",
                "mensaje_sunat": f"Error de comunicación con SUNAT: {str(e)}",
                "cdr_xml": None,
                "cdr_zip_bytes": None
            }

    def get_status(self, ruc: str, sol_user: str, sol_pass: str, filename_base: str) -> Dict[str, Any]:
        """
        Consulta el estado/CDR de un comprobante o resumen ya enviado vía getStatus.
        filename_base ejemplo: '20000000001-01-F001-00000001' o '20000000001-RC-20240801-00000001'
        """
        username_full = f"{ruc}{sol_user}"
        soap_envelope = f"""<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe">
    <soapenv:Header>
        <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
            <wsse:UsernameToken>
                <wsse:Username>{username_full}</wsse:Username>
                <wsse:Password>{sol_pass}</wsse:Password>
            </wsse:UsernameToken>
        </wsse:Security>
    </soapenv:Header>
    <soapenv:Body>
        <ser:getStatus>
            <fileName>{filename_base}.zip</fileName>
        </ser:getStatus>
    </soapenv:Body>
</soapenv:Envelope>"""

        headers = {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": "urn:getStatus"
        }

        try:
            print(f"Consultando estado de {filename_base} vía getStatus...")
            with httpx.Client(timeout=30.0) as client:
                response = client.post(self.soap_url, content=soap_envelope, headers=headers)

            if response.status_code != 200:
                return {
                    "estado": "RECHAZADO",
                    "codigo_error": str(response.status_code),
                    "mensaje_sunat": f"Error HTTP {response.status_code} consultando estado",
                    "cdr_xml": None,
                    "cdr_zip_bytes": None
                }

            root = etree.fromstring(response.content)
            app_resp = root.xpath("//applicationResponse/text()")
            if not app_resp:
                return {
                    "estado": "PENDIENTE",
                    "codigo_error": "0",
                    "mensaje_sunat": "SUNAT aún no tiene CDR disponible para este documento.",
                    "cdr_xml": None,
                    "cdr_zip_bytes": None
                }

            cdr_zip_bytes = base64.b64decode(app_resp[0])
            cdr_xml, res_code, res_desc = self.unpack_cdr_zip(cdr_zip_bytes)
            estado_final = "ACEPTADO" if res_code == "0" else ("OBSERVADO" if res_code.startswith("4") else "RECHAZADO")
            return {
                "estado": estado_final,
                "codigo_error": res_code,
                "mensaje_sunat": res_desc,
                "cdr_xml": cdr_xml,
                "cdr_zip_bytes": cdr_zip_bytes
            }

        except Exception as e:
            return {
                "estado": "ERROR_CONEXION",
                "codigo_error": "500",
                "mensaje_sunat": f"Error de comunicación con SUNAT: {str(e)}",
                "cdr_xml": None,
                "cdr_zip_bytes": None
            }
