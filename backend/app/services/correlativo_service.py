from typing import Optional


def next_correlativo(cur, company_id: str, tipo_comprobante: str, serie: str) -> int:
    """Reserva el siguiente número correlativo de forma atómica.

    Usa la tabla public.correlativos con SELECT ... FOR UPDATE dentro de la
    transacción de la conexión (autocommit=False) para evitar duplicados en
    emisión concurrente. Si la fila aún no existe la crea con 0.

    Anti-drift: el siguiente número se calcula como
        GREATEST(correlativos.ultimo_numero, MAX(comprobantes.numero)) + 1
    de modo que si `correlativos` quedó desincronizado respecto a `comprobantes`
    (migraciones previas, rollback de incremento en una emisión fallida, etc.)
    el contador se resincroniza hacia adelante y nunca reutiliza un número ya
    emitido. Esto cura el error
        duplicate key value violates unique_comprobante_per_company

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
        SELECT c.ultimo_numero,
               COALESCE((
                   SELECT MAX(comp.numero)
                   FROM public.comprobantes comp
                   WHERE comp.company_id = c.company_id
                     AND comp.tipo_comprobante = c.tipo_comprobante
                     AND comp.serie = c.serie
               ), 0) AS max_numero
        FROM public.correlativos c
        WHERE c.company_id = %s AND c.tipo_comprobante = %s AND c.serie = %s
        FOR UPDATE
        """,
        (company_id, tipo_comprobante, serie),
    )
    row = cur.fetchone()
    if row is None:
        ultimo = 0
        max_numero = 0
    else:
        ultimo = row[0] or 0
        max_numero = row[1] or 0

    siguiente = max(int(ultimo), int(max_numero)) + 1

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
