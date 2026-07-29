'use client'

import React from 'react'
import { Printer, Share2, X, CheckCircle2 } from 'lucide-react'

interface TicketModalProps {
  isOpen: boolean
  onClose: () => void
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

export default function TicketModal({ isOpen, onClose, comprobante }: TicketModalProps) {
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
      `Total: S/ ${comprobante.montoTotal.toFixed(2)}\n` +
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="h-12 w-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold text-white">Comprobante Registrado en SUNAT</h3>
          <p className="text-slate-400 text-xs mt-1">Firma Digital & CDR Aceptado</p>
        </div>

        {/* Ticket Thermal View (Printable Section) */}
        <div className="bg-white text-slate-900 p-5 rounded-xl text-xs font-mono mb-6 shadow-inner print:block" id="ticket-printable">
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
              <tr className="border-b border-slate-200">
                <th>Cant</th>
                <th>Descripción</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {comprobante.items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.cantidad}</td>
                  <td>{item.descripcion}</td>
                  <td className="text-right font-bold">S/ {item.total.toFixed(2)}</td>
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

          <div className="text-center text-[9px] text-slate-500 mt-4 break-all">
            Hash CPE: {comprobante.hashCpe}
          </div>
        </div>

        {/* Actions Bar */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePrint}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir Ticket</span>
          </button>
          
          <button
            onClick={handleWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-lg shadow-emerald-600/20"
          >
            <Share2 className="h-4 w-4" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  )
}
