-- ==============================================================================
-- MIGRACIÓN 004: RATE LIMITING BACKEND (para entornos multi-worker)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created
    ON public.rate_limits (key, created_at DESC);

-- Cleanup automático: eliminar registros más antiguos que la ventana máxima
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup
    ON public.rate_limits (created_at)
    WHERE created_at < NOW() - INTERVAL '5 minutes';
