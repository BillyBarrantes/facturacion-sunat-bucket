// ─── Auth ────────────────────────────────────────────
export interface RegisterRequest {
  ruc: string
  razon_social: string
  email: string
  password: string
}

export interface RegisterResponse {
  success: boolean
  message: string
  company_id: string
  user_id: string
  access_token: string
  token_type: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  user_id: string
  company_id: string
  nombre: string
  role: string
  company_ruc: string
  company_razon_social: string
}

// ─── Dashboard ───────────────────────────────────────
export interface MetricsResponse {
  total_ventas: number
  igv_ventas: number
  conteo_comprobantes: number
  total_compras: number
  igv_compras: number
  conteo_compras: number
  igv_estimado_a_pagar: number
  desglose_metodos_pago: {
    EFECTIVO: number
    YAPE_PLIN: number
    TRANSFERENCIA: number
    TARJETA: number
  }
}

export interface AiSummaryResponse {
  resumen_ejecutivo: string
}

// ─── Comprobantes ────────────────────────────────────
export interface CorrelativoResponse {
  success: boolean
  siguiente_numero: number
}

export interface DocLookupResponse {
  found: boolean
  source: string
  num_doc: string
  tipo_doc: string
  razon_social: string
  direccion: string
  ubigeo: string
  estado: string
  condicion: string
}

export interface DetalleItemIn {
  codigo?: string
  descripcion: string
  unidad_medida: string
  cantidad: number
  precio_unitario: number
}

export interface EmitirRequest {
  tipo_comprobante: string
  serie: string
  numero: number
  cliente_tipo_doc: string
  cliente_num_doc: string
  cliente_razon_social: string
  cliente_direccion?: string
  moneda: string
  metodo_pago: string
  descuento_global?: number
  anticipo_total?: number
  items: DetalleItemIn[]
}

export interface EmitirResponse {
  success: boolean
  comprobante_id: string | null
  comprobante: string
  estado_sunat: string
  codigo_sunat: string
  mensaje_sunat: string
  hash_cpe: string
}

export interface DetalleItemOut {
  descripcion: string
  cantidad: number
  precio_unitario: number
  total: number
}

export interface ComprobanteOut {
  id: string
  tipo_comprobante: string
  serie_numero: string
  fecha_emision: string
  moneda: string
  importe_total: number
  total_gravado: number
  total_igv: number
  estado_sunat: string
  hash_cpe: string
  cliente_num_doc: string
  cliente_razon_social: string
  cliente_direccion: string
  items: DetalleItemOut[]
}

export interface ListarResponse {
  success: boolean
  comprobantes: ComprobanteOut[]
}

// ─── Purchases / OCR ─────────────────────────────────
export interface OcrExtraidoOut {
  ruc_proveedor: string
  razon_social: string
  fecha_emision: string
  monto_gravado: number
  igv: number
  monto_total: number
}

export interface OcrResponse {
  success: boolean
  compra_id: string
  datos_extraidos: OcrExtraidoOut
}

// ─── API error (el backend siempre responde { detail } en 4xx/5xx) ──
export interface ApiError {
  detail: string
}
