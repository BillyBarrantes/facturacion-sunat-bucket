'use client'

import React from 'react'
import { UserCheck, ShieldAlert, CheckCircle2, Search, Loader2 } from 'lucide-react'

type ClientFormProps = {
  tipoComprobante: string
  clienteTipoDoc: string
  clienteNumDoc: string
  clienteRazonSocial: string
  clienteDireccion: string
  isSearchingDoc: boolean
  docBadge: string | null
  onSelectTipoDoc: (tipo: string) => void
  onNumDocChange: (val: string) => void
  onConsultarDoc: () => void
  onRazonSocialChange: (val: string) => void
  onDireccionChange: (val: string) => void
}

export default function ClientForm({
  tipoComprobante,
  clienteTipoDoc,
  clienteNumDoc,
  clienteRazonSocial,
  clienteDireccion,
  isSearchingDoc,
  docBadge,
  onSelectTipoDoc,
  onNumDocChange,
  onConsultarDoc,
  onRazonSocialChange,
  onDireccionChange,
}: ClientFormProps) {
  return (
    <section className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] p-5 md:p-6 space-y-4 md:space-y-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-[var(--border-soft)]">
        <div className="flex items-center gap-2 text-[var(--fg)]">
          <UserCheck className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.5} />
          <h2 className="text-[15px] font-semibold tracking-tight">Datos del cliente</h2>
          <span className="text-[12px] text-[var(--muted)] hidden sm:inline">
            {tipoComprobante === '01' ? 'RUC obligatorio para crédito fiscal' : 'RUC o DNI autocompletados'}
          </span>
        </div>

        {docBadge && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--r-pill)] text-[11px] font-medium animate-scale-in ${
            docBadge.startsWith('✗')
              ? 'bg-[var(--danger-soft)] text-[var(--danger)]'
              : 'bg-[var(--accent-soft)] text-[var(--accent)]'
          }`}>
            {docBadge.startsWith('✗')
              ? <ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.75} />
              : <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />}
            {docBadge.replace(/[✓✗]\s/, '')}
          </span>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Tipo de documento</label>
          <select
            value={clienteTipoDoc}
            onChange={(e) => onSelectTipoDoc(e.target.value)}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] pl-3 pr-9 py-2.5 text-[14px] text-[var(--fg)] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%235f5f5f%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[position:right_8px_center] bg-no-repeat focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors duration-[var(--dur-fast)]"
          >
            {tipoComprobante === '01' ? (
              <option value="6">RUC (obligatorio)</option>
            ) : (
              <>
                <option value="0">Sin documento (clientes varios)</option>
                <option value="1">DNI (persona natural)</option>
                <option value="6">RUC (empresa)</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Número</label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={clienteNumDoc}
              onChange={(e) => onNumDocChange(e.target.value)}
              disabled={clienteTipoDoc === '0'}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] pl-3 pr-10 py-2.5 text-[14px] text-[var(--fg)] font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors duration-[var(--dur-fast)] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--surface)]"
              placeholder={clienteTipoDoc === '6' ? '20601234567' : clienteTipoDoc === '1' ? '45678912' : '00000000'}
            />
            {clienteTipoDoc !== '0' && (
              <button
                type="button"
                onClick={onConsultarDoc}
                disabled={isSearchingDoc}
                className="absolute right-2 text-[var(--muted)] hover:text-[var(--accent)] p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Consultar en SUNAT/RENIEC"
                aria-label="Consultar documento"
              >
                {isSearchingDoc
                  ? <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" strokeWidth={1.5} />
                  : <Search className="h-4 w-4" strokeWidth={1.5} />}
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Nombre / Razón social</label>
          <input
            type="text"
            value={clienteRazonSocial}
            onChange={(e) => onRazonSocialChange(e.target.value)}
            disabled={clienteTipoDoc === '0'}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 text-[14px] text-[var(--fg)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors duration-[var(--dur-fast)] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--surface)]"
            placeholder="Razón social del cliente"
          />
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Dirección fiscal</label>
          <input
            type="text"
            value={clienteDireccion}
            onChange={(e) => onDireccionChange(e.target.value)}
            disabled={clienteTipoDoc === '0'}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 text-[14px] text-[var(--fg)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors duration-[var(--dur-fast)] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--surface)]"
            placeholder="Av. Principal 123"
          />
        </div>
      </div>
    </section>
  )
}
