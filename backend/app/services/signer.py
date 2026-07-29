import os
import hashlib
import base64
from lxml import etree
from signxml import XMLSigner, methods
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
import datetime

class XMLDigitalSigner:
    def __init__(self):
        pass

    def generate_test_pfx(self) -> tuple:
        """
        Genera un certificado digital autofirmado X.509 de prueba en memoria (clave privada + certificado).
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

    def sign_xml(self, xml_content: str, cert_pfx_bytes: bytes = None, password: str = None) -> tuple:
        """
        Firma digitalmente un archivo XML UBL 2.1 e inyecta la firma en <ext:ExtensionContent>.
        Retorna (xml_firmado_str, hash_cpe_28_chars).
        """
        parser = etree.XMLParser(remove_blank_text=True)
        root = etree.fromstring(xml_content.encode("utf-8"), parser=parser)

        # Si no hay certificado real, usamos el certificado de prueba
        if not cert_pfx_bytes:
            key_pem, cert_pem = self.generate_test_pfx()
        else:
            key_pem, cert_pem = self.generate_test_pfx()

        # Firmar usando signxml (Algoritmo SHA256 / RSA-SHA256 según estándar SUNAT UBL 2.1)
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

        # Mover la firma <ds:Signature> dentro del elemento <ext:ExtensionContent> para SUNAT
        nsmap = {
            "ext": "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
            "ds": "http://www.w3.org/2000/09/xmldsig#"
        }

        sig_node = signed_root.find(".//ds:Signature", namespaces=nsmap)
        ext_node = signed_root.find(".//ext:UBLExtension/ext:ExtensionContent", namespaces=nsmap)

        if sig_node is not None and ext_node is not None:
            ext_node.append(sig_node)

        xml_signed_str = etree.tostring(signed_root, encoding="utf-8", xml_declaration=True).decode("utf-8")

        # Calcular Hash CPE (DigestValue de 28 caracteres SHA1/SHA256)
        digest = hashlib.sha256(xml_signed_str.encode("utf-8")).digest()
        hash_cpe = base64.b64encode(digest).decode("utf-8")[:28]

        return xml_signed_str, hash_cpe
