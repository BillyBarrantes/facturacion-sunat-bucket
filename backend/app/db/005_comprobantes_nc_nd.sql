-- ==============================================================================
-- MIGRACIÓN 005: COMPROBANTES — Columnas NC/ND (FASE 2)
-- ------------------------------------------------------------------
-- Causa raíz: el endpoint POST /api/v1/comprobantes/emitir inserta en
-- public.comprobantes las columnas: motivo, doc_referencia_tipo,
-- doc_referencia_serie, doc_referencia_numero (introducidas en FASE 2
-- para Notas de Crédito 07 y Notas de Débito 08), pero la BD real de
-- Supabase solo tenía el esquema original de FASE 1.
--
-- Síntoma en producción:
--   column "motivo" of relation "comprobantes" does not exist  (HTTP 500)
--
-- Fix: ALTER TABLE ADD COLUMN IF NOT EXISTS — idempotente, aditivo,
-- no destruye ni renombra columnas existentes. Alinea la BD real con
-- el esquema declarado en schema.sql.
--
-- Postgres >= 9.6 soporta ADD COLUMN IF NOT EXISTS.
-- ==============================================================================

ALTER TABLE public.comprobantes
    ADD COLUMN IF NOT EXISTS motivo TEXT,
    ADD COLUMN IF NOT EXISTS doc_referencia_tipo VARCHAR(2),
    ADD COLUMN IF NOT EXISTS doc_referencia_serie VARCHAR(4),
    ADD COLUMN IF NOT EXISTS doc_referencia_numero INT;
