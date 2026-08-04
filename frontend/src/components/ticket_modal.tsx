'use client'

import React from 'react'
import { Printer, Share2, CheckCircle2, Eye, Send, Loader2, PencilLine, X, AlertCircle, Clock } from 'lucide-react'

interface TicketModalProps {
  isOpen: boolean
  onClose: () => void
  isPreview?: boolean
  isEmitting?: boolean
  onConfirmEmit?: () => void
  comprobante: {
    tipoComprobanteNombre?: string
    serieNumero: string
    fechaEmision?: string
    emisorRazonSocial?: string
    emisorRuc?: string
    emisorDireccion?: string
    cliente: string
    documento: string
    clienteDireccion?: string
    opGravada?: number
    descuento?: number
    anticipo?: number
    igv: number
    montoTotal: number
    hashCpe: string
    estadoSunat?: string
    items: Array<{ descripcion: string; cantidad: number; total: number; precio_unitario?: number }>
  }
}

export default function TicketModal({
  isOpen,
  onClose,
  isPreview = false,
  isEmitting = false,
  onConfirmEmit,
  comprobante
}: TicketModalProps) {
  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `*${comprobante.tipoComprobanteNombre || 'COMPROBANTE ELECTRÓNICO'}*\n` +
      `Serie: ${comprobante.serieNumero}\n` +
      `Fecha: ${comprobante.fechaEmision || new Date().toLocaleDateString('es-PE')}\n` +
      `Cliente: ${comprobante.cliente}\n` +
      `Total: S/ ${(comprobante.montoTotal ?? 0).toFixed(2)}\n` +
      `Estado: ${estadoTextoWhatsApp}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const emisorNombre = comprobante.emisorRazonSocial || 'EMPRESA MYPE DE PRUEBA S.A.C.'
  const emisorRuc = comprobante.emisorRuc || '20000000001'
  const emisorDir = comprobante.emisorDireccion || 'AV. TRIBUTARIA 123 - LIMA'
  const tipoTitulo = comprobante.tipoComprobanteNombre || (comprobante.serieNumero.startsWith('F') ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA')
  const fecha = comprobante.fechaEmision || new Date().toLocaleDateString('es-PE')

  // Estado real SUNAT cuando el comprobante ya fue emitido (no en preview).
  const estadoSunat = !isPreview ? (comprobante.estadoSunat || '').toUpperCase() : ''
  const isRechazado = estadoSunat === 'RECHAZADO'
  const isPendiente = estadoSunat === 'PENDIENTE'
  const isObservado = estadoSunat === 'OBSERVADO'
  const isAceptadoReal = estadoSunat === 'ACEPTADO'

  const headerIconBg = isPreview
    ? 'bg-[var(--warn-soft)] text-[var(--warn)]'
    : isAceptadoReal
      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
      : (isRechazado || isObservado)
        ? 'bg-[var(--danger-soft)] text-[var(--danger)]'
        : isPendiente
          ? 'bg-[var(--surface-2)] text-[var(--muted)]'
          : 'bg-[var(--accent-soft)] text-[var(--accent)]'

  const EstadoIcon = isPreview ? Eye : (isRechazado || isObservado) ? AlertCircle : isPendiente ? Clock : CheckCircle2

  const headerTitulo = isPreview
    ? 'Vista previa'
    : isAceptadoReal
      ? 'Comprobante aceptado'
      : isRechazado
        ? 'Comprobante rechazado'
        : isPendiente
          ? 'Comprobante pendiente'
          : isObservado
            ? 'Comprobante observado'
            : 'Comprobante emitido'

  const headerSub = isPreview
    ? 'Revisa antes de firmar y enviar a SUNAT'
    : isAceptadoReal
      ? 'Firma digital y CDR aceptados por SUNAT'
      : isRechazado
        ? 'SUNAT rechazó el comprobante. Revisa el detalle y vuelve a emitir.'
        : isPendiente
          ? 'Enviado a SUNAT. El CDR aún no está disponible, reconsulta en unos minutos.'
          : isObservado
            ? 'SUNAT aceptó con observaciones. Revisa el detalle.'
            : 'Estado de SUNAT no disponible aún.'

  const estadoTextoWhatsApp = isPreview
    ? 'PREVIEW (sin emitir)'
    : estadoSunat || 'PENDIENTE'

  return (
    <div
      className="fixed inset-0 z-50 bg-[rgba(13,13,13,0.45)] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-modal-title"
    >
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-t-[var(--r-lg)] sm:rounded-[var(--r-lg)] w-full max-w-md shadow-[var(--shadow-modal)] relative max-h-[85vh] sm:max-h-[90vh] overflow-y-auto animate-scale-in">

        {/* Header del modal */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-soft)]">
          <div className="flex items-center gap-2.5">
            <div className={`h-8 w-8 rounded-full grid place-items-center ${headerIconBg}`}>
              <EstadoIcon className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div>
              <h3 id="ticket-modal-title" className="text-[15px] font-semibold text-[var(--fg)] tracking-tight">
                {headerTitulo}
              </h3>
              <p className="text-[12px] text-[var(--muted)]">
                {headerSub}
              </p>
              {estadoSunat && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--r-pill)] text-[10px] font-semibold tracking-[var(--tracking-caps)] uppercase ${
                  isAceptadoReal
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : isRechazado || isObservado
                      ? 'bg-[var(--danger-soft)] text-[var(--danger)]'
                      : isPendiente
                        ? 'bg-[var(--surface-2)] text-[var(--muted)]'
                        : 'bg-[var(--surface)] text-[var(--fg-2)]'
                }">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    isAceptadoReal ? 'bg-[var(--accent)]' : (isRechazado || isObservado) ? 'bg-[var(--danger)]' : 'bg-[var(--muted)]'
                  }`} />
                  {estadoSunat}
                </div>
              )}
            </div>
          </div>

          {!isPreview && (
            <button
              onClick={onClose}
              disabled={isEmitting}
              className="h-7 w-7 grid place-items-center rounded-[var(--r-sm)] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* Ticket térmico imprimible */}
        <div className="p-5">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-sm)] p-5 font-[family-name:var(--font-geist-mono)] text-[12px] text-[var(--fg-2)]" id="ticket-printable">
            {isPreview && (
              <div className="bg-[var(--warn-soft)] border border-[var(--warn)]/20 text-[var(--warn)] text-[10px] font-semibold tracking-[var(--tracking-caps)] uppercase text-center py-1 rounded mb-3">
                Vista previa — sin emitir a SUNAT
              </div>
            )}

            <div className="text-center font-semibold text-[13px] mb-1">{emisorNombre}</div>
            <div className="text-center font-semibold">RUC: {emisorRuc}</div>
            <div className="text-center text-[10px] text-[var(--muted)]">{emisorDir}</div>
            <div className="border-b border-dashed border-[var(--border)] my-2" />

            <div className="text-center font-semibold text-[11px]">{tipoTitulo}</div>
            <div className="text-center font-semibold text-[13px]">{comprobante.serieNumero}</div>
            <div className="text-center text-[10px] text-[var(--muted)]">Fecha de emisión: {fecha}</div>
            <div className="border-b border-dashed border-[var(--border)] my-2" />

            <div><b>Cliente:</b> {comprobante.cliente}</div>
            <div><b>Documento:</b> {comprobante.documento}</div>
            {comprobante.clienteDireccion && (
              <div><b>Dirección:</b> {comprobante.clienteDireccion}</div>
            )}
            <div className="border-b border-dashed border-[var(--border)] my-2" />

            <table className="w-full text-left my-2">
              <thead>
                <tr className="border-b border-[var(--border-soft)] text-[10px]">
                  <th scope="col" className="py-1">Cant</th>
                  <th scope="col" className="py-1">Descripción</th>
                  <th scope="col" className="text-right py-1">P.Unit</th>
                  <th scope="col" className="text-right py-1">Total</th>
                </tr>
              </thead>
              <tbody className="text-[10px]">
                {comprobante.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-dashed border-[var(--border-soft)]">
                    <td className="py-1 align-top">{item.cantidad}</td>
                    <td className="py-1 pr-1">{item.descripcion}</td>
                    <td className="text-right py-1 align-top text-[var(--muted)]">{((item.precio_unitario ?? ((item.total ?? 0)/(item.cantidad || 1))) / 1.18).toFixed(2)}</td>
                    <td className="text-right py-1 align-top font-medium">{((item.total ?? 0) / 1.18).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-b border-dashed border-[var(--border)] my-2" />

            {comprobante.opGravada !== undefined && (
              <div className="flex justify-between text-[11px]">
                <span>Op. gravada:</span>
                <span>S/ {(comprobante.opGravada ?? 0).toFixed(2)}</span>
              </div>
            )}
            {comprobante.descuento ? (
              <div className="flex justify-between text-[11px]">
                <span>Descuento:</span>
                <span>- S/ {(comprobante.descuento ?? 0).toFixed(2)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-[11px]">
              <span>IGV (18%):</span>
              <span>S/ {(comprobante.igv ?? 0).toFixed(2)}</span>
            </div>
            {comprobante.anticipo ? (
              <div className="flex justify-between text-[11px]">
                <span>Anticipo:</span>
                <span>- S/ {(comprobante.anticipo ?? 0).toFixed(2)}</span>
              </div>
            ) : null}
            <div className="flex justify-between font-semibold text-[13px] mt-1 pt-1 border-t border-[var(--border)]">
              <span>IMPORTE TOTAL</span>
              <span>S/ {(comprobante.montoTotal ?? 0).toFixed(2)}</span>
            </div>

            {!isPreview && comprobante.hashCpe && (
              <div className="text-center text-[9px] text-[var(--muted-2)] mt-4 break-all">
                Hash CPE: {comprobante.hashCpe}
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="px-5 pb-5">
          {isPreview ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onClose}
                disabled={isEmitting}
                className="w-full bg-[var(--bg)] border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--fg-2)] text-[13px] font-medium py-2.5 rounded-[var(--r-sm)] inline-flex items-center justify-center gap-2 transition-colors press-feedback"
              >
                <PencilLine className="h-4 w-4" strokeWidth={1.5} />
                <span>Modificar</span>
              </button>

              <button
                onClick={onConfirmEmit}
                disabled={isEmitting}
                className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[13px] font-medium py-2.5 rounded-[var(--r-sm)] inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed press-feedback"
              >
                {isEmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                    <span>Emitiendo...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" strokeWidth={1.75} />
                    <span>Emitir a SUNAT</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="flex-1 bg-[var(--bg)] border border-[var(--border)] hover:bg-[var(--surface)] text-[var(--fg-2)] text-[13px] font-medium py-2.5 rounded-[var(--r-sm)] inline-flex items-center justify-center gap-2 transition-colors press-feedback"
              >
                <Printer className="h-4 w-4" strokeWidth={1.5} />
                <span>Imprimir</span>
              </button>

              <button
                onClick={handleWhatsApp}
                className="flex-1 bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]/70 text-[var(--accent)] text-[13px] font-medium py-2.5 rounded-[var(--r-sm)] inline-flex items-center justify-center gap-2 transition-colors border border-[var(--accent)]/15 press-feedback"
              >
                <Share2 className="h-4 w-4" strokeWidth={1.5} />
                <span>WhatsApp</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
