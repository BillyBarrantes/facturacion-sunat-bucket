'use client'

import React from 'react'
import { Source_Serif_4 } from 'next/font/google'
import { ClipboardList, Send, FileText, Receipt, Building } from 'lucide-react'

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif-4',
  subsets: ['latin'],
  weight: ['400', '500'],
})

type NcNdType = 'NC' | 'ND'

export default function NcNdPage() {
  const [tipoNota, setTipoNota] = React.useState<NcNdType>('NC')

  return (
    <main className={`${sourceSerif.variable} flex-1 max-w-[1100px] w-full mx-auto px-5 md:px-10 py-8 md:py-14 space-y-5 md:space-y-6`}>
      {/* Header */}
      <header className="flex flex-col gap-4 pb-6 border-b border-[var(--border)] animate-fade-in-up">
        <div>
          <div className="text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--accent)] mb-2">
            Notas de ajuste
          </div>
          <h1 className="font-[family-name:var(--font-source-serif-4)] text-[28px] md:text-[36px] font-medium leading-[1.1] tracking-[var(--tracking-heading)] text-[var(--fg)]">
            Nota de crédito / débito
          </h1>
          <p className="text-[13px] md:text-[14px] text-[var(--muted)] mt-1.5">
            Emite notas de ajuste vinculadas a un comprobante original.
          </p>
        </div>

        {/* Tabs NC / ND */}
        <div className="flex gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-sm)] w-full sm:w-fit" role="tablist" aria-label="Tipo de nota">
          <button
            type="button"
            role="tab"
            id="tab-nc"
            aria-selected={tipoNota === 'NC'}
            onClick={() => setTipoNota('NC')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-[13px] font-medium rounded-[6px] transition-colors ${
              tipoNota === 'NC'
                ? 'bg-[var(--bg)] text-[var(--fg)] shadow-[var(--shadow-card)]'
                : 'text-[var(--muted)] hover:text-[var(--fg-2)]'
            }`}
          >
            <Receipt className="h-4 w-4" strokeWidth={1.5} />
            <span>Nota de crédito</span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-nd"
            aria-selected={tipoNota === 'ND'}
            onClick={() => setTipoNota('ND')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-[13px] font-medium rounded-[6px] transition-colors ${
              tipoNota === 'ND'
                ? 'bg-[var(--bg)] text-[var(--fg)] shadow-[var(--shadow-card)]'
                : 'text-[var(--muted)] hover:text-[var(--fg-2)]'
            }`}
          >
            <FileText className="h-4 w-4" strokeWidth={1.5} />
            <span>Nota de débito</span>
          </button>
        </div>
      </header>

      {/* Reason badge */}
      <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-[var(--r-md)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in-up animate-delay-1">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-[var(--r-sm)] bg-[var(--bg)] border border-[var(--border)] grid place-items-center">
            {tipoNota === 'NC'
              ? <Receipt className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.5} />
              : <FileText className="h-5 w-5 text-[var(--fg-2)]" strokeWidth={1.5} />}
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[var(--muted)] tracking-[var(--tracking-caps)] uppercase">
              {tipoNota === 'NC' ? 'Nota de crédito' : 'Nota de débito'}
            </div>
            <div className="text-[14px] font-medium text-[var(--fg)]">
              {tipoNota === 'NC'
                ? 'Anula o reduce el monto de un comprobante'
                : 'Incrementa el monto de un comprobante'}
            </div>
          </div>
        </div>
        <span className="font-[family-name:var(--font-geist-mono)] text-[12px] font-medium px-2.5 py-1 rounded-[var(--r-pill)] bg-[var(--bg)] border border-[var(--border)] text-[var(--fg-2)]">
          {tipoNota === 'NC' ? 'NC01-00000001' : 'ND01-00000001'}
        </span>
      </div>

      {/* Comprobante original */}
      <section className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] p-5 md:p-6 space-y-4 shadow-[var(--shadow-card)] animate-fade-in-up animate-delay-2">
        <div className="flex items-center gap-2 pb-4 border-b border-[var(--border-soft)]">
          <Building className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="text-[15px] font-semibold text-[var(--fg)] tracking-tight">Comprobante original</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Tipo de documento</label>
            <select
              disabled
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] pl-3 pr-9 py-2.5 text-[14px] text-[var(--fg)] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%235f5f5f%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[position:right_8px_center] bg-no-repeat opacity-50 cursor-not-allowed"
            >
              <option>{tipoNota === 'NC' ? 'Factura' : 'Boleta'}</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Serie y número</label>
            <input
              type="text"
              disabled
              placeholder="F001-00000001"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 text-[14px] text-[var(--fg)] font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--muted-2)] opacity-50 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Fecha de emisión</label>
            <input
              type="text"
              disabled
              placeholder="01/08/2026"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 text-[14px] text-[var(--fg)] font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--muted-2)] opacity-50 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Monto total</label>
            <input
              type="text"
              disabled
              placeholder="S/ 0.00"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 text-[14px] text-[var(--fg)] font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--muted-2)] opacity-50 cursor-not-allowed"
            />
          </div>
        </div>
      </section>

      {/* Datos de la nota */}
      <section className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] p-5 md:p-6 space-y-4 shadow-[var(--shadow-card)] animate-fade-in-up animate-delay-3">
        <div className="flex items-center gap-2 pb-4 border-b border-[var(--border-soft)]">
          <ClipboardList className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="text-[15px] font-semibold text-[var(--fg)] tracking-tight">Datos de la nota</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">
              Motivo de {tipoNota === 'NC' ? 'credito' : 'debito'} <span className="text-[var(--danger)]">*</span>
            </label>
            <select
              disabled
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] pl-3 pr-9 py-2.5 text-[14px] text-[var(--fg)] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%235f5f5f%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[position:right_8px_center] bg-no-repeat opacity-50 cursor-not-allowed"
            >
              <option>{tipoNota === 'NC' ? 'Anulación de la operación' : 'Aumento en el valor'}</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Descripción / Observaciones</label>
            <textarea
              disabled
              rows={3}
              placeholder="Detalle el motivo de la nota..."
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 text-[14px] text-[var(--fg)] placeholder:text-[var(--muted-2)] opacity-50 cursor-not-allowed resize-none"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Monto a ajustar (S/)</label>
            <input
              type="text"
              disabled
              placeholder="0.00"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 text-[14px] text-[var(--fg)] font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--muted-2)] opacity-50 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">IGV (18%)</label>
            <input
              type="text"
              disabled
              placeholder="S/ 0.00"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 text-[14px] text-[var(--fg)] font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--muted-2)] opacity-50 cursor-not-allowed"
            />
          </div>
        </div>
      </section>

      {/* CTA — visual only */}
      <div className="pt-2 animate-fade-in-up animate-delay-4">
        <button
          type="button"
          disabled
          className="w-full bg-[var(--fg)] text-white text-[15px] font-medium py-3.5 rounded-[var(--r-sm)] inline-flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
        >
          <Send className="h-4 w-4" strokeWidth={1.5} />
          <span>Vista previa y emisión</span>
        </button>
        <p className="text-center text-[12px] text-[var(--muted-2)] mt-3">
          Funcionalidad disponible próximamente.
        </p>
      </div>
    </main>
  )
}
