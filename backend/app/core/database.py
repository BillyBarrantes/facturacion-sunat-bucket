import psycopg2
from psycopg2 import pool as psypool
from psycopg2.extensions import connection as pg_connection
from contextlib import contextmanager
from typing import Optional, Generator
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

_pool: Optional[psypool.ThreadedConnectionPool] = None


def _build_conn_params() -> dict:
    project_ref = settings.SUPABASE_URL.replace("https://", "").split(".")[0]
    hosts = [
        ("aws-0-sa-east-1.pooler.supabase.com", 6543, f"postgres.{project_ref}"),
        (f"db.{project_ref}.supabase.co", 5432, "postgres"),
        (f"db.{project_ref}.supabase.co", 6543, f"postgres.{project_ref}"),
    ]
    return dict(
        hosts=hosts,
        dbname="postgres",
        password=settings.SUPABASE_DB_PASSWORD,
        connect_timeout=5,
    )


def _connection_is_alive(conn: pg_connection) -> bool:
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
        return True
    except Exception:
        return False


def init_pool(minconn: int = 1, maxconn: int = 10) -> None:
    global _pool
    params = _build_conn_params()
    last_err = None
    for host, port, user in params["hosts"]:
        try:
            _pool = psypool.ThreadedConnectionPool(
                minconn,
                maxconn,
                host=host,
                port=port,
                dbname=params["dbname"],
                user=user,
                password=params["password"],
                connect_timeout=params["connect_timeout"],
            )
            logger.info(f"Pool de conexiones creado → {host}:{port}/{user}")
            return
        except Exception as e:
            last_err = e
            logger.warning(f"Fallo conexión pool a {host}:{port} — {e}")
            continue
    _pool = None
    logger.error(f"No se pudo crear el pool de conexiones: {last_err}")
    if settings.SUNAT_ENV == "BETA":
        logger.warning("SUNAT_ENV=BETA: arrancando sin pool de BD")
    else:
        raise last_err


def get_db() -> Generator[pg_connection, None, None]:
    global _pool
    if _pool is None:
        init_pool()
    if _pool is None:
        raise RuntimeError("Pool de conexiones no disponible")

    conn = _pool.getconn()
    try:
        if not _connection_is_alive(conn):
            logger.warning("Conexión muerta detectada, reemplazando...")
            _pool.putconn(conn)
            conn = _pool.getconn()
        yield conn
    except Exception:
        _pool.putconn(conn, close=True)
        raise
    finally:
        try:
            _pool.putconn(conn)
        except Exception:
            pass


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.closeall()
        _pool = None
        logger.info("Pool de conexiones cerrado")
