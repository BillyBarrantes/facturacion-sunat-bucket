-- ==============================================================================
-- FACTURACIÓN ELECTRÓNICA SUNAT - ESQUEMA MULTI-TENANT CON RLS (SUPABASE / POSTGRES)
-- ==============================================================================

-- Habilitar extensión uuid-ossp pgcrypto si no están habilitadas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. TABLA: EMPRESAS (COMPANIES - TENANTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ruc VARCHAR(11) UNIQUE NOT NULL,
    razon_social VARCHAR(255) NOT NULL,
    nombre_comercial VARCHAR(255),
    direccion TEXT NOT NULL,
    ubigeo VARCHAR(6) NOT NULL,
    departamento VARCHAR(100),
    provincia VARCHAR(100),
    distrito VARCHAR(100),
    sol_user VARCHAR(50),
    sol_pass_encrypted TEXT,
    cdt_pfx_url TEXT,
    cdt_password_encrypted TEXT,
    gre_client_id TEXT,
    gre_client_secret TEXT,
    logo_url TEXT,
    estado_sunat VARCHAR(20) DEFAULT 'HABIDO',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. TABLA: PERFILES DE USUARIO (PROFILES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    nombre_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'ADMIN', -- ADMIN, VENDEDOR, CONTADOR
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. HELPER FUNCTION: AUTH_COMPANY_ID()
-- Retorna el company_id del usuario autenticado en la sesión actual
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_company_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT company_id 
        FROM public.profiles 
        WHERE id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 4. TABLA: CLIENTES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    tipo_doc VARCHAR(1) NOT NULL, -- 1: DNI, 6: RUC, 4: CARNET EXT, 7: PASAPORTE, 0: DOC TRIB NO DOM.
    num_doc VARCHAR(15) NOT NULL,
    razon_social VARCHAR(255) NOT NULL,
    direccion TEXT,
    email VARCHAR(255),
    telefono VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_cliente_per_company UNIQUE (company_id, tipo_doc, num_doc)
);

-- ------------------------------------------------------------------------------
-- 5. TABLA: PRODUCTOS Y SERVICIOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    codigo_sunat VARCHAR(20),
    codigo_interno VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    unidad_medida VARCHAR(10) DEFAULT 'NIU', -- NIU: Unidad, ZZ: Servicio, etc.
    precio_unitario NUMERIC(12, 4) NOT NULL, -- Con IGV
    valor_unitario NUMERIC(12, 4) NOT NULL,  -- Sin IGV
    tipo_afectacion_igv VARCHAR(2) DEFAULT '10', -- 10: Gravado, 20: Exonerado, 30: Inafecto
    stock_actual NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_product_code_per_company UNIQUE (company_id, codigo_interno)
);

-- ------------------------------------------------------------------------------
-- 6. TABLA: COMPROBANTES (FACTURAS, BOLETAS, NOTAS, GUÍAS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comprobantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    tipo_comprobante VARCHAR(2) NOT NULL, -- 01: Factura, 03: Boleta, 07: Nota Crédito, 08: Nota Débito, 09: Guía
    serie VARCHAR(4) NOT NULL, -- F001, B001, FC01, BC01, T001
    numero INT NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id),
    fecha_emision TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    moneda VARCHAR(3) DEFAULT 'PEN', -- PEN, USD
    tipo_cambio NUMERIC(6, 3) DEFAULT 1.000,
    total_gravado NUMERIC(12, 2) DEFAULT 0.00,
    total_igv NUMERIC(12, 2) DEFAULT 0.00,
    total_exonerado NUMERIC(12, 2) DEFAULT 0.00,
    total_inafecto NUMERIC(12, 2) DEFAULT 0.00,
    total_impuestos NUMERIC(12, 2) DEFAULT 0.00,
    importe_total NUMERIC(12, 2) NOT NULL,
    metodo_pago VARCHAR(20) DEFAULT 'EFECTIVO', -- EFECTIVO, YAPE, PLIN, TRANSFERENCIA, TARJETA
    estado_sunat VARCHAR(20) DEFAULT 'PENDIENTE', -- PENDIENTE, PENDIENTE_RC, PENDIENTE_BAJA, ACEPTADO, RECHAZADO, OBSERVADO, ANULADO
    codigo_error_sunat VARCHAR(20),
    mensaje_sunat TEXT,
    traduccion_ai_sunat TEXT,
    hash_cpe TEXT,
    xml_url TEXT,
    cdr_url TEXT,
    pdf_url TEXT,
    motivo TEXT, -- Motivo de la NC/ND
    doc_referencia_tipo VARCHAR(2), -- Tipo del CPE de referencia (01/03) para NC/ND
    doc_referencia_serie VARCHAR(4),
    doc_referencia_numero INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_comprobante_per_company UNIQUE (company_id, tipo_comprobante, serie, numero)
);

-- ------------------------------------------------------------------------------
-- 7. TABLA: COMPROBANTE DETALLES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comprobante_detalles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comprobante_id UUID NOT NULL REFERENCES public.comprobantes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    codigo VARCHAR(50),
    descripcion TEXT NOT NULL,
    unidad_medida VARCHAR(10) DEFAULT 'NIU',
    cantidad NUMERIC(12, 4) NOT NULL,
    valor_unitario NUMERIC(12, 4) NOT NULL,
    precio_unitario NUMERIC(12, 4) NOT NULL,
    tipo_afectacion_igv VARCHAR(2) DEFAULT '10',
    igv NUMERIC(12, 2) NOT NULL,
    total NUMERIC(12, 2) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 7b. TABLA: CORRELATIVOS (Control atómico de numeración por tenant)
-- Usada con SELECT ... FOR UPDATE para evitar duplicados en emisión concurrente.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.correlativos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    tipo_comprobante VARCHAR(2) NOT NULL,
    serie VARCHAR(4) NOT NULL,
    ultimo_numero INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_correlativo_per_company UNIQUE (company_id, tipo_comprobante, serie)
);

-- ------------------------------------------------------------------------------
-- 8. TABLA: COMPRAS (GASTOS Y REGISTRO DE COMPRAS SIRE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    tipo_comprobante VARCHAR(2) DEFAULT '01',
    serie VARCHAR(10),
    numero VARCHAR(20),
    ruc_proveedor VARCHAR(11) NOT NULL,
    razon_social_proveedor VARCHAR(255) NOT NULL,
    fecha_emision DATE NOT NULL,
    monto_gravado NUMERIC(12, 2) DEFAULT 0.00,
    igv NUMERIC(12, 2) DEFAULT 0.00,
    monto_total NUMERIC(12, 2) NOT NULL,
    imagen_url TEXT,
    ocr_raw_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. TABLA: CAJA Y MOVIMIENTOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.caja_movimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    tipo VARCHAR(10) NOT NULL, -- INGRESO, EGRESO
    monto NUMERIC(12, 2) NOT NULL,
    metodo_pago VARCHAR(20) DEFAULT 'EFECTIVO',
    concepto TEXT NOT NULL,
    comprobante_id UUID REFERENCES public.comprobantes(id),
    compra_id UUID REFERENCES public.compras(id),
    fecha TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- POLÍTICAS ROW LEVEL SECURITY (RLS) PARA AISLAMIENTO ESTRICTO MULTI-TENANT
-- ==============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobante_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_movimientos ENABLE ROW LEVEL SECURITY;

-- 1. COMPANIES: Usuarios solo ven/editan la empresa a la que pertenecen
DROP POLICY IF EXISTS "companies_tenant_policy" ON public.companies;
CREATE POLICY "companies_tenant_policy" ON public.companies
    FOR ALL
    USING (id = public.auth_company_id())
    WITH CHECK (id = public.auth_company_id());

-- 2. PROFILES: Usuarios ven su propio perfil o el de sus compañeros de empresa
DROP POLICY IF EXISTS "profiles_self_and_tenant_policy" ON public.profiles;
CREATE POLICY "profiles_self_and_tenant_policy" ON public.profiles
    FOR ALL
    USING (id = auth.uid() OR company_id = public.auth_company_id())
    WITH CHECK (id = auth.uid() OR company_id = public.auth_company_id());

-- 3. CLIENTES: Aislamiento por company_id
DROP POLICY IF EXISTS "clientes_tenant_policy" ON public.clientes;
CREATE POLICY "clientes_tenant_policy" ON public.clientes
    FOR ALL
    USING (company_id = public.auth_company_id())
    WITH CHECK (company_id = public.auth_company_id());

-- 4. PRODUCTS: Aislamiento por company_id
DROP POLICY IF EXISTS "products_tenant_policy" ON public.products;
CREATE POLICY "products_tenant_policy" ON public.products
    FOR ALL
    USING (company_id = public.auth_company_id())
    WITH CHECK (company_id = public.auth_company_id());

-- 5. COMPROBANTES: Aislamiento por company_id
DROP POLICY IF EXISTS "comprobantes_tenant_policy" ON public.comprobantes;
CREATE POLICY "comprobantes_tenant_policy" ON public.comprobantes
    FOR ALL
    USING (company_id = public.auth_company_id())
    WITH CHECK (company_id = public.auth_company_id());

-- 6. COMPROBANTE DETALLES: Aislamiento mediante comprobante_id -> company_id
DROP POLICY IF EXISTS "comprobante_detalles_tenant_policy" ON public.comprobante_detalles;
CREATE POLICY "comprobante_detalles_tenant_policy" ON public.comprobante_detalles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.comprobantes c 
            WHERE c.id = comprobante_id AND c.company_id = public.auth_company_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.comprobantes c 
            WHERE c.id = comprobante_id AND c.company_id = public.auth_company_id()
        )
    );

-- 7. COMPRAS: Aislamiento por company_id
DROP POLICY IF EXISTS "compras_tenant_policy" ON public.compras;
CREATE POLICY "compras_tenant_policy" ON public.compras
    FOR ALL
    USING (company_id = public.auth_company_id())
    WITH CHECK (company_id = public.auth_company_id());

-- 8. CAJA MOVIMIENTOS: Aislamiento por company_id
DROP POLICY IF EXISTS "caja_tenant_policy" ON public.caja_movimientos;
CREATE POLICY "caja_tenant_policy" ON public.caja_movimientos
    FOR ALL
    USING (company_id = public.auth_company_id())
    WITH CHECK (company_id = public.auth_company_id());

-- 9. CORRELATIVOS: Aislamiento por company_id
DROP POLICY IF EXISTS "correlativos_tenant_policy" ON public.correlativos;
CREATE POLICY "correlativos_tenant_policy" ON public.correlativos
    FOR ALL
    USING (company_id = public.auth_company_id())
    WITH CHECK (company_id = public.auth_company_id());
