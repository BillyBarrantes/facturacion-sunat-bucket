import type {
  RegisterRequest, RegisterResponse,
  LoginResponse, LoginRequest,
  MetricsResponse, AiSummaryResponse,
  CorrelativoResponse, DocLookupResponse,
  EmitirRequest, EmitirResponse,
  ListarResponse,
  OcrResponse,
  ApiError,
} from './api-types'
import { readSession, refreshStoredToken, clearSession as clearStoredSession } from './session-store'

const BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL || ''

function getToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('sunat_token') || ''
}

let refreshing: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing
  refreshing = (async () => {
    if (typeof window === 'undefined') return false
    const session = readSession()
    if (!session || !session.refreshToken) return false
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: session.refreshToken }),
      })
      if (!res.ok) return false
      const data = (await res.json()) as LoginResponse
      if (!data.access_token) return false
      refreshStoredToken(data.access_token, data.refresh_token)
      return true
    } catch {
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

function clearSession() {
  clearStoredSession()
  if (typeof window !== 'undefined') {
    window.location.replace('/')
  }
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
  opts?: { skipAuth?: boolean; raw?: boolean; _retried?: boolean },
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

  if (res.status === 401 && !opts?.skipAuth && !opts?._retried) {
    const ok = await tryRefresh()
    if (ok) {
      return request<T>(method, path, body, { ...opts, _retried: true })
    }
    clearSession()
    throw new ApiClientError(401, 'Sesion expirada. Redirigiendo al inicio.')
  }

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
  register: (payload: RegisterRequest) =>
    request<RegisterResponse>('POST', '/api/v1/auth/register-company', payload, { skipAuth: true }),

  login: (payload: LoginRequest) =>
    request<LoginResponse>('POST', '/api/v1/auth/login', payload, { skipAuth: true }),

  listar: () =>
    request<ListarResponse>('GET', '/api/v1/comprobantes'),

  correlativo: (tipo: string, serie: string) =>
    request<CorrelativoResponse>('GET', `/api/v1/comprobantes/correlativo/${tipo}/${serie}`),

  consultarDoc: (numDoc: string) =>
    request<DocLookupResponse>('GET', `/api/v1/comprobantes/consultar-doc/${numDoc}`),

  emitir: (payload: EmitirRequest) =>
    request<EmitirResponse>('POST', '/api/v1/comprobantes/emitir', payload),

  metrics: () =>
    request<MetricsResponse>('GET', '/api/v1/dashboard/metrics'),

  aiSummary: () =>
    request<AiSummaryResponse>('POST', '/api/v1/dashboard/ai-summary'),

  sireExcel: (periodo: string) =>
    request<Response>('GET', `/api/v1/reports/sire-ventas/excel?periodo=${periodo}`, undefined, { raw: true }),

  ocr: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return request<OcrResponse>('POST', '/api/v1/purchases/ocr', fd)
  },
}
