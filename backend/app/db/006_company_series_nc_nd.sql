-- ==============================================================================
-- MIGRACIÓN 006: COMPANIES — Series propias NC/ND por empresa (FASE 2.5)
-- ------------------------------------------------------------------
-- Propósito: permitir que una empresa registre sus series SUNAT para
-- Notas de Crédito (07) y Notas de Débito (08). Si la columna es NULL,
-- el backend usará los defaults NC01 / ND01 al emitir notas.
--
-- El campo serie es VARCHAR(4) para los códigos de serie SUNAT
-- (NC01, ND01, E001, etc.). Alineado con comprobantes.serie VARCHAR(4).
--
-- ADD COLUMN IF NOT EXISTS: idempotente y aditivo, no rompe datos
-- existentes (mismo patrón que 005_comprobantes_nc_nd.sql).
-- ==============================================================================

ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS serie_nc VARCHAR(4),
    ADD COLUMN IF NOT EXISTS serie_nd VARCHAR(4);