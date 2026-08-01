import type {
  RegisterRequest, RegisterResponse,
  LoginRequest, LoginResponse,
  MetricsResponse, AiSummaryResponse,
  CorrelativoResponse, DocLookupResponse,
  EmitirRequest, EmitirResponse,
  ListarResponse,
  OcrResponse,
  ApiError,
} from './api-types'

const BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL || ''

function getToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('sunat_token') || ''
}

export class ApiClientError extends Error {
  status: number
  detail: string
  constructor(status: number, detail: string) {
    super(detail)
    this.name = 'ApiClientError'
    this.status = status
    this.detail = detail
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: { skipAuth?: boolean; raw?: boolean },
): Promise<T> {
  const headers: Record<string, string> = {}
  if (!opts?.skipAuth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (opts?.raw) {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const detail = (data as ApiError).detail || `HTTP ${res.status}`
      throw new ApiClientError(res.status, detail)
    }
    return res as unknown as T
  }

  const data = await res.json()
  if (!res.ok) {
    const detail = (data as ApiError).detail || `HTTP ${res.status}`
    throw new ApiClientError(res.status, detail)
  }
  return data as T
}

export const api = {
  // ── Auth ──────────────────────────────────────────
  register: (payload: RegisterRequest) =>
    request<RegisterResponse>('POST', '/api/v1/auth/register-company', payload, { skipAuth: true }),

  login: (payload: LoginRequest) =>
    request<LoginResponse>('POST', '/api/v1/auth/login', payload, { skipAuth: true }),

  // ── Comprobantes ──────────────────────────────────
  listar: () =>
    request<ListarResponse>('GET', '/api/v1/comprobantes'),

  correlativo: (tipo: string, serie: string) =>
    request<CorrelativoResponse>('GET', `/api/v1/comprobantes/correlativo/${tipo}/${serie}`),

  consultarDoc: (numDoc: string) =>
    request<DocLookupResponse>('GET', `/api/v1/comprobantes/consultar-doc/${numDoc}`),

  emitir: (payload: EmitirRequest) =>
    request<EmitirResponse>('POST', '/api/v1/comprobantes/emitir', payload),

  // ── Dashboard ─────────────────────────────────────
  metrics: () =>
    request<MetricsResponse>('GET', '/api/v1/dashboard/metrics'),

  aiSummary: () =>
    request<AiSummaryResponse>('POST', '/api/v1/dashboard/ai-summary'),

  // ── Reports ───────────────────────────────────────
  sireExcel: (periodo: string) =>
    request<Response>('GET', `/api/v1/reports/sire-ventas/excel?periodo=${periodo}`, undefined, { raw: true }),

  // ── Purchases ─────────────────────────────────────
  ocr: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return request<OcrResponse>('POST', '/api/v1/purchases/ocr', fd)
  },
}
