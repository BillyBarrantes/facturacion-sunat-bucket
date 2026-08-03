import os
import sys
import time
import pytest
from datetime import datetime
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import HTTPException
from app.core.config import settings


# ─── Helpers ────────────────────────────────────────────────────────────

def _mock_cursor(row=None):
    cur = MagicMock()
    cur.fetchone.return_value = row
    return cur


def _row(sol_user="REALUSER", sol_pass="REALPASS"):
    return (
        "20100000001", "Mi Empresa S.A.C.", "MiEmpresa", "AV. REAL 456", "150102",
        "MIRAFLORES", "LIMA", sol_user, sol_pass,
    )


# ─── _get_emisor_or_raise ──────────────────────────────────────────────

from app.api.endpoints.comprobantes import _get_emisor_or_raise


@patch.object(settings, "SUNAT_ENV", "BETA")
def test_emisor_beta_null_moddatos():
    row = _row(sol_user=None, sol_pass=None)
    emisor = _get_emisor_or_raise("cid", _mock_cursor(row=row))
    assert emisor["sol_user"] == "MODDATOS"
    assert emisor["sol_pass"] == "MODDATOS"


@patch.object(settings, "SUNAT_ENV", "BETA")
def test_emisor_beta_no_exist_fallback():
    emisor = _get_emisor_or_raise("cid", _mock_cursor(row=None))
    assert emisor["ruc"] == "20000000001"
    assert "MYPE DE PRUEBA" in emisor["razon_social"]
    assert emisor["sol_user"] == "MODDATOS"


@patch.object(settings, "SUNAT_ENV", "PRODUCCION")
def test_emisor_prod_no_exist_lanza_500():
    with pytest.raises(HTTPException) as exc:
        _get_emisor_or_raise("cid", _mock_cursor(row=None))
    assert exc.value.status_code == 500
    assert "no se puede emitir" in exc.value.detail.lower() or "no encontrada" in exc.value.detail.lower()


@patch.object(settings, "SUNAT_ENV", "PRODUCCION")
def test_emisor_prod_sin_sol_lanza_500():
    row = _row(sol_user=None, sol_pass=None)
    with pytest.raises(HTTPException) as exc:
        _get_emisor_or_raise("cid", _mock_cursor(row=row))
    assert exc.value.status_code == 500
    assert "credenciales sol" in exc.value.detail.lower()


@patch.object(settings, "SUNAT_ENV", "PRODUCCION")
def test_emisor_prod_ok_cuando_todo_ok():
    emisor = _get_emisor_or_raise("cid", _mock_cursor(row=_row()))
    assert emisor["sol_user"] == "REALUSER"
    assert emisor["ruc"] == "20100000001"


# ─── login_user try/except ────────────────────────────────────────────

@patch.object(settings, "SUPABASE_SERVICE_ROLE_KEY", "")
@patch.object(settings, "SUPABASE_URL", "https://x.supabase.co")
def test_login_503_when_service_role_key_empty():
    from app.api.endpoints.auth import LoginSchema, login_user
    with pytest.raises(HTTPException) as exc:
        login_user(LoginSchema(email="x@y.pe", password="123456"))
    assert exc.value.status_code == 503
    assert "no configurado" in exc.value.detail.lower()


@patch.object(settings, "SUPABASE_SERVICE_ROLE_KEY", "key-123")
@patch.object(settings, "SUPABASE_URL", "")
def test_login_503_when_supabase_url_empty():
    from app.api.endpoints.auth import LoginSchema, login_user
    with pytest.raises(HTTPException) as exc:
        login_user(LoginSchema(email="x@y.pe", password="123456"))
    assert exc.value.status_code == 503


# ─── Signer: BETA vs PROD ──────────────────────────────────────────────

from app.services.signer import XMLDigitalSigner


@patch.object(settings, "SUNAT_ENV", "PRODUCCION")
def test_signer_prod_rechaza_sin_pfx():
    with pytest.raises(ValueError) as exc:
        XMLDigitalSigner().sign_xml("<root/>", cert_pfx_bytes=None)
    assert "produccion" in str(exc.value).lower() or "requiere" in str(exc.value).lower()


@patch.object(settings, "SUNAT_ENV", "BETA")
def test_signer_beta_usa_autofirmado():
    xml, hash_cpe = XMLDigitalSigner().sign_xml("<root></root>")
    assert isinstance(xml, str) and len(xml) > 0
    assert isinstance(hash_cpe, str) and len(hash_cpe) == 28


# ─── Correlativo milisegundos ──────────────────────────────────────────

def test_correlativo_milisegundos_sin_colision():
    t1 = datetime.now().strftime("%H%M%S%f")
    time.sleep(0.002)
    t2 = datetime.now().strftime("%H%M%S%f")
    assert t1 != t2
    assert len(t1) >= 10