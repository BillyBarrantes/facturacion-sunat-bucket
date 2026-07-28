import os
import sys
import pytest

# Agregar path del backend
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.security import get_db_connection

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "version" in data

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_db_connection_and_tables():
    """Verifica que la conexión a Supabase Postgres responda y las tablas existan."""
    conn = get_db_connection()
    assert conn is not None
    cur = conn.cursor()
    
    # Consultar que la tabla 'companies' exista
    cur.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies';")
    count = cur.fetchone()[0]
    assert count == 1, "La tabla companies no fue encontrada en Supabase"
    
    # Consultar que la tabla 'comprobantes' exista
    cur.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comprobantes';")
    count_comp = cur.fetchone()[0]
    assert count_comp == 1, "La tabla comprobantes no fue encontrada en Supabase"
    
    cur.close()
    conn.close()
