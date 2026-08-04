'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Source_Serif_4 } from 'next/font/google'
import { ClipboardList, Send, FileText, Receipt, Building, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react'
import { api, ApiClientError } from '@/lib/api-client'
import type { ComprobanteOut, EmitirRequest } from '@/lib/api-types'

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif-4',
  subsets: ['latin'],
  weight: ['400', '500'],
})

type NcNdType = 'NC' | 'ND'

const MOTIVOS_NC = [
  'ANULACION DE LA OPERACION',
  'DEVOLUCION TOTAL',
  'DEVOLUCION PARCIAL',
  'ERROR EN EL RUC DEL CLIENTE',
  'OTRO',
]

const MOTIVOS_ND = [
  'AUMENTO EN EL VALOR',
  'INTERESES POR MORA',
  'OTRO',
]

export default function NcNdPage() {
  const [tipoNota, setTipoNota] = React.useState<NcNdType>('NC')

  const [comprobantesPrevios, setComprobantesPrevios] = useState<ComprobanteOut[]>([])
  const [loadingComprobantes, setLoadingComprobantes] = useState(true)
  const [referenciaId, setReferenciaId] = useState('')

  const [motivo, setMotivo] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [montoAjuste, setMontoAjuste] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const fetchComprobantes = useCallback(async () => {
    setLoadingComprobantes(true)
    try {
      const data = await api.listar()
      const referenciables = data.comprobantes.filter(
        (c) => c.tipo_comprobante === '01' || c.tipo_comprobante === '03'
      )
      setComprobantesPrevios(referenciables)
    } catch {
      setErrorMsg('No se pudieron cargar tus comprobantes previos.')
    } finally {
      setLoadingComprobantes(false)
    }
  }, [])

  useEffect(() => {
    fetchComprobantes()
  }, [fetchComprobantes])

  const referencia = comprobantesPrevios.find((c) => c.id === referenciaId)

  const montoNum = parseFloat(montoAjuste) || 0
  const igvCalculado = montoNum > 0 ? montoNum - montoNum / 1.18 : 0
  const motivos = tipoNota === 'NC' ? MOTIVOS_NC : MOTIVOS_ND

  const handleSubmit = async () => {
    setErrorMsg('')
    setSuccessMsg('')

    // Validaciones defensivas (el backend también las valida)
    if (comprobantesPrevios.length === 0) {
      setErrorMsg('Aún no tienes comprobantes emitidos. Emite primero una factura o boleta para poder generar una nota.')
      return
    }
    if (!referencia) {
      setErrorMsg('Selecciona un comprobante original al que aplica la nota.')
      return
    }
    if (!motivo) {
      setErrorMsg('El motivo es obligatorio.')
      return
    }
    if (montoNum <= 0) {
      setErrorMsg('El monto a ajustar debe ser mayor a cero.')
      return
    }

    const tipoComp = tipoNota === 'NC' ? '07' : '08'
    const serie = referencia.tipo_comprobante === '01' ? 'F001' : 'B001'

    const [serieRef, numeroRef] = referencia.serie_numero.split('-')

    const payload: EmitirRequest = {
      tipo_comprobante: tipoComp,
      serie,
      numero: 1,  // backend reserva el real vía next_correlativo
      cliente_tipo_doc: referencia.cliente_num_doc && referencia.cliente_num_doc.length === 11 ? '6' : '1',
      cliente_num_doc: referencia.cliente_num_doc || '00000000',
      cliente_razon_social: referencia.cliente_razon_social || 'CLIENTE',
      cliente_direccion: referencia.cliente_direccion || '',
      moneda: 'PEN',
      metodo_pago: 'EFECTIVO',
      items: [
        {
          codigo: 'NC01',
          descripcion: `${motivo}${observaciones ? ' — ' + observaciones : ''}`,
          unidad_medida: 'ZZ',
          cantidad: 1,
          precio_unitario: montoNum,
        },
      ],
      comprobante_referencia_tipo: referencia.tipo_comprobante,
      comprobante_referencia_serie: serieRef,
      comprobante_referencia_numero: parseInt(numeroRef, 10),
      motivo,
    }

    setIsSubmitting(true)
    try {
      const res = await api.emitir(payload)
      if (res.estado_sunat === 'ACEPTADO') {
        setSuccessMsg(
          `${tipoNota === 'NC' ? 'Nota de crédito' : 'Nota de débito'} emitida: ${res.comprobante}` +
          (res.mensaje_sunat ? ` · ${res.mensaje_sunat}` : ' · ACEPTADO por SUNAT')
        )
      } else {
        setErrorMsg(
          `Nota ${res.estado_sunat}: ${res.comprobante}` +
          (res.mensaje_sunat ? ` — ${res.mensaje_sunat}` : '') +
          `. Puede consultar el estado en el historial.`
        )
      }
      // Reset parcial
      setMontoAjuste('')
      setObservaciones('')
      setReferenciaId('')
      setMotivo('')
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError
        ? err.detail
        : err instanceof Error
          ? err.message
          : 'Error al emitir nota. Intenta de nuevo.'
      setErrorMsg(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

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
            onClick={() => { setTipoNota('NC'); setMotivo(''); setErrorMsg(''); setSuccessMsg('') }}
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
            onClick={() => { setTipoNota('ND'); setMotivo(''); setErrorMsg(''); setSuccessMsg('') }}
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

        {loadingComprobantes ? (
          <div className="space-y-2.5 py-2">
            <div className="h-9 w-full rounded skeleton-shimmer" />
            <div className="h-9 w-full rounded skeleton-shimmer" />
          </div>
        ) : comprobantesPrevios.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[14px] font-medium text-[var(--fg-2)] mb-1">Sin comprobantes referenciables</p>
            <p className="text-[13px] text-[var(--muted)]">
              Emite primero una factura o boleta en la sección Emitir para poder vincularla a una nota.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">
                Selecciona comprobante <span className="text-[var(--danger)]">*</span>
              </label>
              <select
                value={referenciaId}
                onChange={(e) => { setReferenciaId(e.target.value); setErrorMsg(''); setSuccessMsg('') }}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] pl-3 pr-9 py-2.5 text-[14px] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%235f5f5f%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[position:right_8px_center] bg-no-repeat"
              >
                <option value="">— Selecciona —</option>
                {comprobantesPrevios.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.serie_numero} · {c.tipo_comprobante === '01' ? 'Factura' : 'Boleta'} · {c.cliente_razon_social || 'Cliente'} · S/ {c.importe_total.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Tipo</label>
              <input
                type="text"
                readOnly
                value={referencia ? (referencia.tipo_comprobante === '01' ? 'Factura' : 'Boleta') : ''}
                placeholder={tipoNota === 'NC' ? 'Factura' : 'Boleta'}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 text-[14px] text-[var(--muted)] font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--muted-2)]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Monto total</label>
              <input
                type="text"
                readOnly
                value={referencia ? `S/ ${referencia.importe_total.toFixed(2)}` : ''}
                placeholder="S/ 0.00"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 text-[14px] text-[var(--muted)] font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--muted-2)]"
              />
            </div>
          </div>
        )}
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
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] pl-3 pr-9 py-2.5 text-[14px] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%235f5f5f%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[position:right_8px_center] bg-no-repeat"
            >
              <option value="">— Selecciona un motivo —</option>
              {motivos.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Descripción / Observaciones</label>
            <textarea
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Detalle el motivo de la nota (opcional)..."
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 text-[14px] text-[var(--fg)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Monto a ajustar (S/) <span className="text-[var(--danger)]">*</span></label>
            <input
              type="number"
              min={0}
              step="any"
              value={montoAjuste}
              onChange={(e) => setMontoAjuste(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 text-[14px] text-[var(--fg)] font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">IGV (18%) — informativo</label>
            <input
              type="text"
              readOnly
              value={igvCalculado > 0 ? `S/ ${igvCalculado.toFixed(2)}` : ''}
              placeholder="S/ 0.00"
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 text-[14px] text-[var(--muted)] font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--muted-2)]"
            />
          </div>
        </div>
      </section>

      {/* Error */}
      {errorMsg && (
        <div className="bg-[var(--danger-soft)] border border-[var(--danger)]/20 text-[var(--danger)] p-4 rounded-[var(--r-sm)] text-[13px] flex items-center gap-3 animate-fade-in-up" role="alert" aria-live="assertive">
          <ShieldAlert className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Éxito */}
      {successMsg && (
        <div className="bg-[var(--accent-soft)] border border-[var(--accent)]/20 text-[var(--accent)] p-4 rounded-[var(--r-sm)] text-[13px] flex items-start gap-3 animate-fade-in-up" aria-live="polite">
          <CheckCircle2 className="h-[18px] w-[18px] shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* CTA funcional */}
      <div className="pt-2 animate-fade-in-up animate-delay-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !referencia || !motivo || montoNum <= 0}
          className="w-full bg-[var(--fg)] hover:bg-[var(--fg-hover)] text-white text-[15px] font-medium py-3.5 rounded-[var(--r-sm)] inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              <span>Emitiendo nota...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" strokeWidth={1.5} />
              <span>Vista previa y emisión</span>
            </>
          )}
        </button>
      </div>
    </main>
  )
}
