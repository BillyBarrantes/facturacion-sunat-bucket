'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Source_Serif_4 } from 'next/font/google'
import { Search, RefreshCw, Printer, Share2 } from 'lucide-react'
import { api, ApiClientError } from '@/lib/api-client'
import type { ComprobanteOut } from '@/lib/api-types'

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif-4',
  subsets: ['latin'],
  weight: ['400', '500'],
})

const TicketModal = dynamic(() => import('@/components/ticket_modal'), { ssr: false })

type TicketViewModel = {
  tipoComprobanteNombre: string
  serieNumero: string
  fechaEmision: string
  cliente: string
  documento: string
  montoTotal: number
  igv: number
  hashCpe: string
  items: Array<{ descripcion: string; cantidad: number; total: number }>
}

export default function HistoryPage() {
  const [filterTipo, setFilterTipo] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<TicketViewModel | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const [comprobantes, setComprobantes] = useState<ComprobanteOut[]>([])

  const fetchComprobantes = async () => {
    setLoading(true)
    try {
      const data = await api.listar()
      setComprobantes(data.comprobantes)
    } catch (e) {
      if (e instanceof ApiClientError) console.error('Error fetching comprobantes:', e.detail)
      else console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComprobantes()
  }, [])

  const filteredComprobantes = comprobantes.filter(c => {
    const matchesTipo = filterTipo === 'ALL' || c.tipo_comprobante === filterTipo
    const matchesSearch = c.serie_numero.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.cliente_razon_social && c.cliente_razon_social.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesTipo && matchesSearch
  })

  const handleOpenTicket = (c: ComprobanteOut) => {
    setSelectedTicket({
      tipoComprobanteNombre: c.tipo_comprobante === '01' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA',
      serieNumero: c.serie_numero,
      fechaEmision: c.fecha_emision,
      cliente: c.cliente_razon_social || 'CLIENTES VARIOS',
      documento: c.cliente_num_doc || '00000000',
      montoTotal: c.importe_total,
      igv: c.importe_total - (c.importe_total / 1.18),
      hashCpe: c.hash_cpe || 'EC3CfOGm+qqj4kQWP4KPL4TtKpGj',
      items: c.items.length > 0 ? c.items.map(i => ({
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        total: i.total,
      })) : [{ descripcion: 'OPERACIÓN DE VENTA / SERVICIO', cantidad: 1, total: c.importe_total }],
    })
    setIsModalOpen(true)
  }

  const handleWhatsApp = (c: ComprobanteOut) => {
    const text = encodeURIComponent(
      `*COMPROBANTE ELECTRÓNICO SUNAT*\n` +
      `Serie: ${c.serie_numero}\n` +
      `Cliente: ${c.cliente_razon_social || 'CLIENTES VARIOS'}\n` +
      `Total: S/ ${c.importe_total.toFixed(2)}\n` +
      `Estado: ${c.estado_sunat}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const filterOptions = [
    { value: 'ALL', label: 'Todos' },
    { value: '01', label: 'Facturas' },
    { value: '03', label: 'Boletas' },
  ]

  return (
    <main className={`${sourceSerif.variable} flex-1 max-w-[1100px] w-full mx-auto px-5 md:px-10 py-8 md:py-14 space-y-6 md:space-y-8`}>

      {/* Encabezado */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <div className="text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--accent)] mb-2">
            Registro oficial
          </div>
          <h1 className="font-[family-name:var(--font-source-serif-4)] text-[28px] md:text-[36px] font-medium leading-[1.1] tracking-[var(--tracking-heading)] text-[var(--fg)]">
            Historial de comprobantes
          </h1>
          <p className="text-[13px] md:text-[14px] text-[var(--muted)] mt-1.5">
            Facturas y boletas transmitidas a SUNAT.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-2)]" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Buscar por cliente o serie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] pl-9 pr-3 py-2.5 md:py-2 text-[13px] text-[var(--fg)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors"
            />
          </div>
          <button
            onClick={fetchComprobantes}
            disabled={loading}
            className="h-10 w-10 md:h-9 md:w-9 grid place-items-center rounded-[var(--r-sm)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50 shrink-0"
            title="Actualizar historial"
            aria-label="Actualizar historial"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Filtros — segmented sobrio */}
      <div className="flex gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-sm)] w-full sm:w-fit animate-fade-in-up animate-delay-1">
        {filterOptions.map((opt) => {
          const count = opt.value === 'ALL'
            ? comprobantes.length
            : comprobantes.filter(c => c.tipo_comprobante === opt.value).length
          return (
            <button
              key={opt.value}
              onClick={() => setFilterTipo(opt.value)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-[6px] text-[13px] font-medium transition-colors ${
                filterTipo === opt.value
                  ? 'bg-[var(--bg)] text-[var(--fg)] shadow-[var(--shadow-card)]'
                  : 'text-[var(--muted)] hover:text-[var(--fg-2)]'
              }`}
            >
              <span>{opt.label}</span>
              <span className={`font-[family-name:var(--font-geist-mono)] text-[11px] ${filterTipo === opt.value ? 'text-[var(--accent)]' : 'text-[var(--muted-2)]'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tabla */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] overflow-hidden shadow-[var(--shadow-card)] animate-fade-in-up animate-delay-2">
        {loading ? (
          <div className="p-12 space-y-3">
            <div className="h-4 w-1/3 rounded skeleton-shimmer" />
            <div className="h-4 w-1/2 rounded skeleton-shimmer" />
            <div className="h-4 w-2/5 rounded skeleton-shimmer" />
          </div>
        ) : filteredComprobantes.length === 0 ? (
          <div className="p-14 text-center">
            <div className="text-[15px] font-medium text-[var(--fg-2)] mb-1">No hay comprobantes</div>
            <p className="text-[13px] text-[var(--muted)]">
              {searchTerm || filterTipo !== 'ALL'
                ? 'Ningún registro coincide con tu búsqueda.'
                : 'Emite tu primera factura o boleta para verla aquí.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[640px]">
              <thead>
                <tr className="bg-[var(--surface-3)] border-b border-[var(--border)]">
                  <th scope="col" className="px-5 py-3 text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--muted)]">Comprobante</th>
                  <th scope="col" className="px-5 py-3 text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--muted)]">Fecha</th>
                  <th scope="col" className="px-5 py-3 text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--muted)]">Cliente</th>
                  <th scope="col" className="px-5 py-3 text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--muted)] text-right">Total</th>
                  <th scope="col" className="px-5 py-3 text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--muted)]">Estado</th>
                  <th scope="col" className="px-5 py-3 text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--muted)] text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {filteredComprobantes.map((c) => {
                  const isFactura = c.tipo_comprobante === '01'
                  return (
                    <tr key={c.id} className="hover:bg-[var(--surface)] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${isFactura ? 'bg-[var(--fg)]' : 'bg-[var(--accent)]'}`} />
                          <span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-medium text-[var(--fg)]">{c.serie_numero}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-[family-name:var(--font-geist-mono)] text-[13px] text-[var(--muted)]">{c.fecha_emision}</td>
                      <td className="px-5 py-3.5 text-[13px] text-[var(--fg-2)] max-w-[220px] truncate">{c.cliente_razon_social || 'Clientes varios'}</td>
                      <td className="px-5 py-3.5 font-[family-name:var(--font-geist-mono)] text-[13px] font-medium text-[var(--fg)] text-right">S/ {c.importe_total.toFixed(2)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-[var(--r-pill)] text-[11px] font-medium ${
                          c.estado_sunat === 'ACEPTADO'
                            ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'bg-[var(--warn-soft)] text-[var(--warn)]'
                        }`}>
                          {c.estado_sunat}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenTicket(c)}
                            className="h-9 w-9 md:h-7 md:w-7 grid place-items-center rounded-[var(--r-sm)] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors"
                            title="Ver ticket"
                            aria-label="Ver ticket"
                          >
                            <Printer className="h-4 w-4 md:h-3.5 md:w-3.5" strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => handleWhatsApp(c)}
                            className="h-9 w-9 md:h-7 md:w-7 grid place-items-center rounded-[var(--r-sm)] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface)] transition-colors"
                            title="Compartir por WhatsApp"
                            aria-label="Compartir por WhatsApp"
                          >
                            <Share2 className="h-4 w-4 md:h-3.5 md:w-3.5" strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && selectedTicket && (
        <TicketModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          comprobante={{ ...selectedTicket, cliente: selectedTicket.cliente, documento: selectedTicket.documento, items: selectedTicket.items }}
        />
      )}
    </main>
  )
}
