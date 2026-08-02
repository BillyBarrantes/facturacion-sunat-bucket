from typing import Optional


def next_correlativo(cur, company_id: str, tipo_comprobante: str, serie: str) -> int:
    """Reserva el siguiente número correlativo de forma atómica.

    Usa la tabla public.correlativos con SELECT ... FOR UPDATE dentro de la
    transacción de la conexión (autocommit=False) para evitar duplicados en
    emisión concurrente. Si la fila aún no existe la crea con 0.

    El bloqueo se mantiene hasta que la transacción haga COMMIT o ROLLBACK.
    """
    cur.execute(
        """
        INSERT INTO public.correlativos (company_id, tipo_comprobante, serie, ultimo_numero)
        VALUES (%s, %s, %s, 0)
        ON CONFLICT (company_id, tipo_comprobante, serie) DO NOTHING
        """,
        (company_id, tipo_comprobante, serie),
    )

    cur.execute(
        """
        SELECT ultimo_numero
        FROM public.correlativos
        WHERE company_id = %s AND tipo_comprobante = %s AND serie = %s
        FOR UPDATE
        """,
        (company_id, tipo_comprobante, serie),
    )
    row = cur.fetchone()
    if row is None:
        ultimo = 0
    else:
        ultimo = row[0] or 0

    siguiente = int(ultimo) + 1

    cur.execute(
        """
        UPDATE public.correlativos
        SET ultimo_numero = %s, updated_at = NOW()
        WHERE company_id = %s AND tipo_comprobante = %s AND serie = %s
        """,
        (siguiente, company_id, tipo_comprobante, serie),
    )
    return siguiente


def peek_correlativo(cur, company_id: str, tipo_comprobante: str, serie: str) -> Optional[int]:
    """Devuelve el siguiente número sin reservarlo (lectura no bloqueante)."""
    cur.execute(
        """
        SELECT ultimo_numero
        FROM public.correlativos
        WHERE company_id = %s AND tipo_comprobante = %s AND serie = %s
        """,
        (company_id, tipo_comprobante, serie),
    )
    row = cur.fetchone()
    if row is None or row[0] is None:
        return None
    return int(row[0]) + 1
