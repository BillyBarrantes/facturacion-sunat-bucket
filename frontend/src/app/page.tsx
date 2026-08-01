'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ArrowRight, CheckCircle2, AlertCircle, FileText } from 'lucide-react'
import { api, ApiClientError } from '@/lib/api-client'

export default function Home() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(true)
  const [ruc, setRuc] = useState('')
  const [razonSocial, setRazonSocial] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      if (isRegister) {
        const data = await api.register({
          ruc,
          razon_social: razonSocial,
          email,
          password,
        })

        setSuccessMsg('Empresa y usuario creados. Redirigiendo...')
        if (data.access_token) {
          localStorage.setItem('sunat_token', data.access_token)
          localStorage.setItem('sunat_company_id', data.company_id)
        }

        setTimeout(() => {
          router.push('/billing/new')
        }, 1200)

      } else {
        const data = await api.login({ email, password })

        setSuccessMsg('Sesión iniciada. Redirigiendo...')
        localStorage.setItem('sunat_token', data.access_token)
        localStorage.setItem('sunat_company_id', data.company_id)

        setTimeout(() => {
          router.push('/billing/new')
        }, 1000)
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMsg(err.detail)
      } else if (err instanceof Error) {
        setErrorMsg(err.message || 'Error de conexión con el backend API')
      } else {
        setErrorMsg('Error de conexión con el backend API')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-[var(--r-sm)] bg-[var(--fg)] flex items-center justify-center">
            <FileText className="h-4 w-4 text-white" strokeWidth={1.5} />
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-[var(--fg)]">FacturaSUNAT AI</span>
        </div>

        <button
          onClick={() => { setIsRegister(!isRegister); setErrorMsg(''); setSuccessMsg('') }}
          className="text-[13px] font-medium text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
        >
          {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : 'Registrar mi MYPE'}
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-[1100px] w-full mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-16 items-center">

        {/* Left — Value prop editorial */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[var(--r-pill)] bg-[var(--accent-soft)] text-[var(--accent)] text-[11px] font-medium tracking-[var(--tracking-caps)] uppercase">
            UBL 2.1 · SUNAT SEE
          </div>

          <h1 className="font-[family-name:var(--font-source-serif-4)] text-[44px] md:text-[52px] font-medium leading-[1.1] tracking-[var(--tracking-display)] text-[var(--fg)]">
            Facturación electrónica para MYPES peruanas.
          </h1>

          <p className="text-[18px] leading-[var(--leading-body)] text-[var(--muted)] max-w-[52ch]">
            Emite facturas y boletas directamente a SUNAT, con firma digital automática, lectura OCR
            de gastos y reportes para SIRE — en una sola herramienta sobria y confiable.
          </p>

          <ul className="space-y-2.5 pt-2">
            {[
              'Envío directo a SUNAT con firma digital',
              'Búsqueda automática de RUC y DNI',
              'OCR de comprobantes de compra con IA',
              'Estimación de IGV y exportación SIRE',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-[14px] text-[var(--fg-2)]">
                <CheckCircle2 className="h-4 w-4 text-[var(--accent)] shrink-0" strokeWidth={1.5} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right — Auth card */}
        <div className="bg-[var(--bg)] border border-[var(--border-soft)] rounded-[var(--r-lg)] p-8 shadow-[var(--shadow-card)]">
          {/* Tabs registro / login */}
          <div className="flex gap-1 p-1 mb-6 bg-[var(--surface)] rounded-[var(--r-sm)] border border-[var(--border-soft)]" role="tablist" aria-label="Tipo de acceso">
            <button
              type="button"
              role="tab"
              id="tab-register"
              aria-selected={isRegister}
              aria-controls="panel-auth"
              onClick={() => { setIsRegister(true); setErrorMsg(''); setSuccessMsg('') }}
              className={`flex-1 py-2 text-[13px] font-medium rounded-[6px] transition-colors ${
                isRegister ? 'bg-[var(--bg)] text-[var(--fg)] shadow-[var(--shadow-card)]' : 'text-[var(--muted)] hover:text-[var(--fg-2)]'
              }`}
            >
              Registrar empresa
            </button>
            <button
              type="button"
              role="tab"
              id="tab-login"
              aria-selected={!isRegister}
              aria-controls="panel-auth"
              onClick={() => { setIsRegister(false); setErrorMsg(''); setSuccessMsg('') }}
              className={`flex-1 py-2 text-[13px] font-medium rounded-[6px] transition-colors ${
                !isRegister ? 'bg-[var(--bg)] text-[var(--fg)] shadow-[var(--shadow-card)]' : 'text-[var(--muted)] hover:text-[var(--fg-2)]'
              }`}
            >
              Iniciar sesión
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-[22px] font-semibold text-[var(--fg)] tracking-tight">
              {isRegister ? 'Crea tu espacio MYPE' : 'Accede a tu panel'}
            </h2>
            <p className="text-[var(--muted)] text-[13px] mt-1">
              {isRegister ? 'Datos de tu empresa para activar facturación.' : 'Ingresa tus credenciales.'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 bg-[var(--danger-soft)] border border-[var(--danger)]/20 text-[var(--danger)] p-3 rounded-[var(--r-sm)] text-[13px] flex items-center gap-2" role="alert" aria-live="assertive">
              <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 bg-[var(--accent-soft)] border border-[var(--accent)]/20 text-[var(--accent)] p-3 rounded-[var(--r-sm)] text-[13px] flex items-center gap-2" aria-live="polite">
              <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" id="panel-auth" role="tabpanel" aria-labelledby={isRegister ? 'tab-register' : 'tab-login'}>
            {isRegister && (
              <>
                <div>
                  <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">
                    RUC de la empresa <span className="text-[var(--danger)]">*</span>
                    <span className="ml-1.5 text-[var(--muted-2)] font-normal">11 dígitos</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={11}
                      required
                      placeholder="20601234567"
                      value={ruc}
                      onChange={(e) => setRuc(e.target.value)}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3.5 py-2.5 text-[14px] text-[var(--fg)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors"
                    />
                    <Building2 className="absolute right-3 top-2.5 h-[18px] w-[18px] text-[var(--muted-2)]" strokeWidth={1.5} />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">
                    Razón Social <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Mi Empresa S.A.C."
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3.5 py-2.5 text-[14px] text-[var(--fg)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">
                Correo electrónico <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="admin@empresa.pe"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3.5 py-2.5 text-[14px] text-[var(--fg)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">
                Contraseña <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3.5 py-2.5 text-[14px] text-[var(--fg)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[var(--fg)] hover:bg-[var(--fg-hover)] text-white text-[14px] font-medium py-3 rounded-[var(--r-sm)] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isLoading ? 'Procesando...' : (isRegister ? 'Crear empresa y cuenta' : 'Ingresar al sistema')}</span>
              {!isLoading && <ArrowRight className="h-4 w-4" strokeWidth={1.75} />}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-6 text-center text-[12px] text-[var(--muted-2)]">
        <p>FacturaSUNAT AI © 2026 — Sistemas SaaS de facturación electrónica</p>
      </footer>
    </div>
  )
}
