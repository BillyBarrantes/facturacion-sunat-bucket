export const SESSION_KEYS = {
  token: 'sunat_token',
  refreshToken: 'sunat_refresh_token',
  companyId: 'sunat_company_id',
  nombre: 'sunat_nombre',
  role: 'sunat_role',
  companyRuc: 'sunat_company_ruc',
  companyRazonSocial: 'sunat_company_razon_social',
} as const

export interface StoredSession {
  token: string
  refreshToken: string
  companyId: string
  nombre: string
  role: string
  companyRuc: string
  companyRazonSocial: string
}

export function readSession(): StoredSession | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem(SESSION_KEYS.token)
  const companyId = localStorage.getItem(SESSION_KEYS.companyId)
  if (!token || !companyId) return null
  return {
    token,
    refreshToken: localStorage.getItem(SESSION_KEYS.refreshToken) || '',
    companyId,
    nombre: localStorage.getItem(SESSION_KEYS.nombre) || '',
    role: localStorage.getItem(SESSION_KEYS.role) || 'USER',
    companyRuc: localStorage.getItem(SESSION_KEYS.companyRuc) || '',
    companyRazonSocial: localStorage.getItem(SESSION_KEYS.companyRazonSocial) || '',
  }
}

export function writeSession(s: StoredSession) {
  localStorage.setItem(SESSION_KEYS.token, s.token)
  if (s.refreshToken) localStorage.setItem(SESSION_KEYS.refreshToken, s.refreshToken)
  localStorage.setItem(SESSION_KEYS.companyId, s.companyId)
  localStorage.setItem(SESSION_KEYS.nombre, s.nombre)
  localStorage.setItem(SESSION_KEYS.role, s.role)
  localStorage.setItem(SESSION_KEYS.companyRuc, s.companyRuc)
  localStorage.setItem(SESSION_KEYS.companyRazonSocial, s.companyRazonSocial)
}

export function refreshStoredToken(token: string, refreshToken?: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SESSION_KEYS.token, token)
  if (refreshToken) localStorage.setItem(SESSION_KEYS.refreshToken, refreshToken)
}

export function clearSession() {
  if (typeof window === 'undefined') return
  Object.values(SESSION_KEYS).forEach((k) => localStorage.removeItem(k))
}
