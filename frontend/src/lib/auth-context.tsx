'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import type { LoginResponse } from '@/lib/api-types'
import { readSession, writeSession, clearSession as clearStored } from '@/lib/session-store'

interface Session {
  token: string
  refreshToken: string
  companyId: string
  nombre: string
  role: string
  companyRuc: string
  companyRazonSocial: string
}

interface AuthContextValue {
  session: Session | null
  isAuthenticated: boolean
  login: (data: LoginResponse) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>(null!)

function mapLoginResponse(data: LoginResponse): Session {
  return {
    token: data.access_token,
    refreshToken: data.refresh_token || '',
    companyId: data.company_id,
    nombre: data.nombre,
    role: data.role,
    companyRuc: data.company_ruc,
    companyRazonSocial: data.company_razon_social,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const stored = readSession()
    if (!stored) return null
    return {
      token: stored.token,
      refreshToken: stored.refreshToken,
      companyId: stored.companyId,
      nombre: stored.nombre,
      role: stored.role,
      companyRuc: stored.companyRuc,
      companyRazonSocial: stored.companyRazonSocial,
    }
  })

  const login = useCallback((data: LoginResponse) => {
    const mapped = mapLoginResponse(data)
    writeSession({
      token: mapped.token,
      refreshToken: mapped.refreshToken,
      companyId: mapped.companyId,
      nombre: mapped.nombre,
      role: mapped.role,
      companyRuc: mapped.companyRuc,
      companyRazonSocial: mapped.companyRazonSocial,
    })
    setSession(mapped)
  }, [])

  const logout = useCallback(() => {
    clearStored()
    setSession(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated: session !== null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
