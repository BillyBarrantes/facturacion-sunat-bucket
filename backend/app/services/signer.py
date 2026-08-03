import os
import hashlib
import base64
import logging
from lxml import etree
from signxml import XMLSigner, methods
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID
import datetime
from app.core.config import settings

logger = logging.getLogger(__name__)


class XMLDigitalSigner:
    def __init__(self):
        pass

    def generate_test_pfx(self) -> tuple:
        """
        Genera un certificado digital autofirmado X.509 de prueba en memoria (clave privada + certificado).
        Valido unicamente en SUNAT_ENV=BETA.
        """
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "PE"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "LIMA"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "SUNAT TEST"),
            x509.NameAttribute(NameOID.COMMON_NAME, "20000000001 - EMPRESA DE PRUEBA"),
        ])
        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.datetime.now(datetime.timezone.utc)
        ).not_valid_after(
            datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=365)
        ).sign(key, hashes.SHA256())

        key_pem = key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption()
        )
        cert_pem = cert.public_bytes(serialization.Encoding.PEM)

        return key_pem, cert_pem

    def _load_real_pfx(self, cert_pfx_bytes: bytes, password: str) -> tuple:
        """Carga el certificado .pfx real de SUNAT y retorna (key_pem, cert_pem)."""
        try:
            private_key, pfx_cert, _additional = pkcs12.load_key_and_certificates(
                cert_pfx_bytes,
                password.encode() if password else None,
            )
            if private_key is None or pfx_cert is None:
                raise ValueError("El archivo .pfx no contiene clave privada o certificado")
            key_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption(),
            )
            cert_pem = pfx_cert.public_bytes(serialization.Encoding.PEM)
            return key_pem, cert_pem
        except Exception:
            logger.exception("[SIGNER] Error cargando .pfx real")
            raise

    def sign_xml(self, xml_content: str, cert_pfx_bytes: bytes = None, password: str = None) -> tuple:
        """
        Firma digitalmente un archivo XML UBL 2.1 e inyecta la firma en <ext:ExtensionContent>.
        En BETA: usa certificado autofirmado de prueba.
        En PRODUCCION: exige certificado .pfx real.
        Retorna (xml_firmado_str, hash_cpe_28_chars).
        """
        parser = etree.XMLParser(remove_blank_text=True)
        root = etree.fromstring(xml_content.encode("utf-8"), parser=parser)

        is_prod = settings.SUNAT_ENV == "PRODUCCION"

        if is_prod and cert_pfx_bytes:
            key_pem, cert_pem = self._load_real_pfx(cert_pfx_bytes, password)
        elif is_prod and not cert_pfx_bytes:
            raise ValueError(
                "PRODUCCION requiere certificado .pfx real (cdt_pfx_url configurado en la empresa)"
            )
        else:
            # BETA: certificado autofirmado (aceptado por SUNAT Beta)
            key_pem, cert_pem = self.generate_test_pfx()

        signer = XMLSigner(
            method=methods.enveloped,
            signature_algorithm="rsa-sha256",
            digest_algorithm="sha256",
            c14n_algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
        )
        
        signed_root = signer.sign(
            root,
            key=key_pem,
            cert=cert_pem
        )

        nsmap = {
            "ext": "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
            "ds": "http://www.w3.org/2000/09/xmldsig#"
        }

        sig_node = signed_root.find(".//ds:Signature", namespaces=nsmap)
        ext_node = signed_root.find(".//ext:UBLExtension/ext:ExtensionContent", namespaces=nsmap)

        if sig_node is not None and ext_node is not None:
            ext_node.append(sig_node)

        xml_signed_str = etree.tostring(signed_root, encoding="utf-8", xml_declaration=True).decode("utf-8")

        digest = hashlib.sha256(xml_signed_str.encode("utf-8")).digest()
        hash_cpe = base64.b64encode(digest).decode("utf-8")[:28]

        return xml_signed_str, hash_cpe
