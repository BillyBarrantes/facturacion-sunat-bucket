'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md space-y-5">
        <div className="mx-auto inline-flex h-12 w-12 rounded-full bg-[var(--danger-soft)] items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-[var(--danger)]" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-[20px] font-semibold text-[var(--fg)] tracking-tight">
            Algo salió mal
          </h2>
          <p className="text-[14px] text-[var(--muted)] mt-2 leading-[var(--leading-body)]">
            Ocurrió un error inesperado. Podés intentar de nuevo o volver al inicio.
          </p>
        </div>
        {error.message && (
          <p className="text-[12px] text-[var(--muted-2)] bg-[var(--surface)] px-4 py-2 rounded-[var(--r-sm)] border border-[var(--border-soft)] font-mono break-all">
            {error.message}
          </p>
        )}

        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--r-sm)] bg-[var(--fg)] hover:bg-[var(--fg-hover)] text-white text-[13px] font-medium transition-colors"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
          <span>Reintentar</span>
        </button>
      </div>
    </div>
  )
}