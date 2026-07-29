'use client'

import React from 'react'
import { Printer, Share2, X, CheckCircle2, Eye, Send, Loader2 } from 'lucide-react'

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
    items: Array<{ descripcion: string; cantidad: number; total: number }>
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
      `Estado: ACEPTADO POR SUNAT`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const emisorNombre = comprobante.emisorRazonSocial || 'EMPRESA MYPE DE PRUEBA S.A.C.'
  const emisorRuc = comprobante.emisorRuc || '20000000001'
  const emisorDir = comprobante.emisorDireccion || 'AV. TRIBUTARIA 123 - LIMA'
  const tipoTitulo = comprobante.tipoComprobanteNombre || (comprobante.serieNumero.startsWith('F') ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA')
  const fecha = comprobante.fechaEmision || new Date().toLocaleDateString('es-PE')

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {!isPreview && (
          <div className="absolute right-4 top-4">
            <button
              onClick={onClose}
              disabled={isEmitting}
              className="text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded border border-slate-700 transition-colors"
            >
              Cerrar ventana
            </button>
          </div>
        )}

        {/* Modal Header */}
        <div className="text-center mb-6">
          {isPreview ? (
            <>
              <div className="h-12 w-12 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-500/20">
                <Eye className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-amber-400">Vista Previa de Comprobante</h3>
              <p className="text-slate-400 text-xs mt-1">Revisa los datos antes de firmar y emitir a SUNAT</p>
            </>
          ) : (
            <>
              <div className="h-12 w-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Comprobante Registrado en SUNAT</h3>
              <p className="text-slate-400 text-xs mt-1">Firma Digital & CDR Aceptado Oficialmente</p>
            </>
          )}
        </div>

        {/* Ticket Thermal View (Printable Section) */}
        <div className="bg-white text-slate-900 p-5 rounded-xl text-xs font-mono mb-6 shadow-inner print:block relative" id="ticket-printable">
          {isPreview && (
            <div className="bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold uppercase tracking-wider text-center py-1 rounded mb-3">
              ⚠️ VISTA PREVIA SIN EMITIR A SUNAT
            </div>
          )}

          {/* DATOS DEL EMISOR */}
          <div className="text-center font-bold text-sm mb-1">{emisorNombre}</div>
          <div className="text-center font-bold">RUC: {emisorRuc}</div>
          <div className="text-center text-[10px] text-slate-600">{emisorDir}</div>
          <div className="border-b border-dashed border-slate-300 my-2"></div>
          
          {/* IDENTIFICACIÓN DEL DOCUMENTO */}
          <div className="text-center font-bold text-xs">{tipoTitulo}</div>
          <div className="text-center font-bold text-sm">{comprobante.serieNumero}</div>
          <div className="text-center text-[10px] text-slate-600">Fecha de Emisión: {fecha}</div>
          <div className="border-b border-dashed border-slate-300 my-2"></div>
          
          {/* DATOS DEL CLIENTE / RECEPTOR */}
          <div><b>Cliente / Receptor:</b> {comprobante.cliente}</div>
          <div><b>Documento (RUC/DNI):</b> {comprobante.documento}</div>
          {comprobante.clienteDireccion && (
            <div><b>Dirección Fiscal:</b> {comprobante.clienteDireccion}</div>
          )}
          <div className="border-b border-dashed border-slate-300 my-2"></div>

          {/* DETALLE DE LA OPERACIÓN */}
          <table className="w-full text-left my-2">
            <thead>
              <tr className="border-b border-slate-200 text-[10px]">
                <th className="py-1">Cant</th>
                <th className="py-1">Descripción</th>
                <th className="text-right py-1">P.Unit</th>
                <th className="text-right py-1">Total</th>
              </tr>
            </thead>
            <tbody className="text-[10px]">
              {comprobante.items.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-100 border-dashed">
                  <td className="py-1 align-top">{item.cantidad}</td>
                  <td className="py-1 pr-1">{item.descripcion}</td>
                  <td className="text-right py-1 align-top text-slate-600">{((item.precio_unitario ?? ((item.total ?? 0)/(item.cantidad || 1))) / 1.18).toFixed(2)}</td>
                  <td className="text-right font-bold py-1 align-top">{((item.total ?? 0) / 1.18).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TOTALES Y MONTOS */}
          <div className="border-b border-dashed border-slate-300 my-2"></div>
          {comprobante.opGravada !== undefined && (
            <div className="flex justify-between text-[11px]">
              <span>Op. Gravada:</span>
              <span>S/ {(comprobante.opGravada ?? 0).toFixed(2)}</span>
            </div>
          )}
          {comprobante.descuento ? (
            <div className="flex justify-between text-[11px]">
              <span>Descuento Aplicado:</span>
              <span>- S/ {(comprobante.descuento ?? 0).toFixed(2)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-[11px]">
            <span>IGV (18%):</span>
            <span>S/ {(comprobante.igv ?? 0).toFixed(2)}</span>
          </div>
          {comprobante.anticipo ? (
            <div className="flex justify-between text-[11px]">
              <span>Anticipo Aplicado:</span>
              <span>- S/ {(comprobante.anticipo ?? 0).toFixed(2)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-bold text-sm mt-1">
            <span>IMPORTE TOTAL:</span>
            <span>S/ {(comprobante.montoTotal ?? 0).toFixed(2)}</span>
          </div>

          {!isPreview && comprobante.hashCpe && (
            <div className="text-center text-[9px] text-slate-500 mt-4 break-all">
              Hash CPE: {comprobante.hashCpe}
            </div>
          )}
        </div>

        {/* Actions Bar */}
        {isPreview ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onClose}
              disabled={isEmitting}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
            >
              <span>✏️ Modificar</span>
            </button>

            <button
              onClick={onConfirmEmit}
              disabled={isEmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-lg shadow-emerald-600/30"
            >
              {isEmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Emitiendo...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Emitir a SUNAT</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* BOTONERA DE ACCIÓN Y CIERRE (SOLO EMITIDO) */
          <div className="mt-6 space-y-3">
            <div className="flex gap-4">
              <button 
                onClick={() => handlePrint()}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 border border-slate-700 transition-colors"
              >
                <Printer className="h-5 w-5" />
                Imprimir Ticket
              </button>
              
              <button 
                onClick={handleWhatsApp}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 className="h-5 w-5" />
                WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
