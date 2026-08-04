'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Source_Serif_4 } from 'next/font/google'
import { Search, RefreshCw, Printer, Share2, FileText, FilePlus2, AlertCircle, Receipt, FileOutput, RotateCw } from 'lucide-react'
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
  estadoSunat: string
  comprobanteReferencia?: string
  items: Array<{ descripcion: string; cantidad: number; total: number }>
}

export default function HistoryPage() {
  const [filterTipo, setFilterTipo] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<TicketViewModel | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  const [comprobantes, setComprobantes] = useState<ComprobanteOut[]>([])
  const [reconsultando, setReconsultando] = useState<string | null>(null)
  const [reconsultaMsg, setReconsultaMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null)

  // Estados finales de SUNAT — no originan reconsulta.
  const ESTADOS_FINALES = ['ACEPTADO', 'RECHAZADO', 'ANULADO']

  const fetchComprobantes = async () => {
    setLoading(true)
    setFetchError('')
    try {
      const data = await api.listar()
      setComprobantes(data.comprobantes)
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.detail : 'No se pudieron cargar los comprobantes'
      setFetchError(msg)
      console.error('Error fetching comprobantes:', e)
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

  // Backend devuelve 07/08 — unificamos a etiquetas internas para visualización y filtros.
  const NC_LABEL = 'NC'
  const ND_LABEL = 'ND'
  const NC_CODE = '07'
  const ND_CODE = '08'

  const tipoComprobanteNombre = (tipo: string) => {
    if (tipo === '01') return 'FACTURA ELECTRÓNICA'
    if (tipo === '03') return 'BOLETA DE VENTA ELECTRÓNICA'
    if (tipo === NC_CODE) return 'NOTA DE CRÉDITO'
    if (tipo === ND_CODE) return 'NOTA DE DÉBITO'
    return 'COMPROBANTE'
  }

  // Etiqueta corta para chips/badges (mantiene NC/ND visible aunque el código backend sea 07/08).
  const tipoComprobanteLabel = (tipo: string) => {
    if (tipo === NC_CODE) return NC_LABEL
    if (tipo === ND_CODE) return ND_LABEL
    return tipo
  }

  const handleReconsultarCdr = async (comprobanteId: string) => {
    setReconsultando(comprobanteId)
    setReconsultaMsg(null)
    try {
      const res = await api.getStatusCdr(comprobanteId)
      setComprobantes(prev =>
        prev.map(c =>
          c.id === comprobanteId
            ? {
                ...c,
                estado_sunat: res.estado_sunat ?? c.estado_sunat,
                hash_cpe: res.hash_cpe ?? c.hash_cpe,
              }
            : c
        )
      )
      setReconsultaMsg({
        id: comprobanteId,
        ok: true,
        text: `Reconsulta completada · estado: ${res.estado_sunat ?? 'sin cambio'}`,
      })
    } catch (e) {
      const msg = e instanceof ApiClientError ? e.detail : 'No se pudo reconsultar el CDR'
      setReconsultaMsg({ id: comprobanteId, ok: false, text: msg })
    } finally {
      setReconsultando(null)
    }
  }

  const handleOpenTicket = (c: ComprobanteOut) => {
    setSelectedTicket({
      tipoComprobanteNombre: tipoComprobanteNombre(c.tipo_comprobante),
      serieNumero: c.serie_numero,
      fechaEmision: c.fecha_emision,
      cliente: c.cliente_razon_social || 'CLIENTES VARIOS',
      documento: c.cliente_num_doc || '00000000',
      montoTotal: c.importe_total,
      igv: c.importe_total - (c.importe_total / 1.18),
      hashCpe: c.hash_cpe || '',
      estadoSunat: c.estado_sunat,
      comprobanteReferencia: c.doc_referencia_serie && c.doc_referencia_numero
        ? `${c.doc_referencia_serie}-${String(c.doc_referencia_numero).padStart(8, '0')}`
        : undefined,
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
    { value: NC_CODE, label: 'NC' },
    { value: ND_CODE, label: 'ND' },
  ]

  const summary = {
    total: comprobantes.length,
    facturas: comprobantes.filter(c => c.tipo_comprobante === '01').length,
    boletas: comprobantes.filter(c => c.tipo_comprobante === '03').length,
    nc: comprobantes.filter(c => c.tipo_comprobante === NC_CODE).length,
    nd: comprobantes.filter(c => c.tipo_comprobante === ND_CODE).length,
    aceptados: comprobantes.filter(c => c.estado_sunat === 'ACEPTADO').length,
    observados: comprobantes.filter(c => c.estado_sunat === 'OBSERVADO').length,
  }

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
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] pl-9 pr-3 py-2.5 md:py-2.5 text-[13px] text-[var(--fg)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors duration-[var(--dur-fast)]"
            />
          </div>
          <button
            onClick={fetchComprobantes}
            disabled={loading}
            className="h-10 w-10 md:h-9 md:w-9 grid place-items-center rounded-[var(--r-sm)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            title="Actualizar historial"
            aria-label="Actualizar historial"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Summary chips */}
      {!loading && comprobantes.length > 0 && (
        <div className="flex flex-wrap gap-2 animate-fade-in-up animate-delay-1" role="list" aria-label="Resumen de comprobantes">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-pill)]" role="listitem">
            <FileText className="h-3.5 w-3.5 text-[var(--fg-2)]" strokeWidth={1.5} />
            <span className="text-[12px] font-medium text-[var(--fg-2)]">Total</span>
            <span className="font-[family-name:var(--font-geist-mono)] text-[11px] font-medium text-[var(--accent)]">{summary.total}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-pill)]" role="listitem">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--fg)]" />
            <span className="text-[12px] font-medium text-[var(--fg-2)]">Facturas</span>
            <span className="font-[family-name:var(--font-geist-mono)] text-[11px] font-medium text-[var(--accent)]">{summary.facturas}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-pill)]" role="listitem">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            <span className="text-[12px] font-medium text-[var(--fg-2)]">Boletas</span>
            <span className="font-[family-name:var(--font-geist-mono)] text-[11px] font-medium text-[var(--accent)]">{summary.boletas}</span>
          </div>
          {summary.nc > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-pill)]" role="listitem">
              <Receipt className="h-3.5 w-3.5 text-[var(--fg-2)]" strokeWidth={1.5} />
              <span className="text-[12px] font-medium text-[var(--fg-2)]">NC</span>
              <span className="font-[family-name:var(--font-geist-mono)] text-[11px] font-medium text-[var(--accent)]">{summary.nc}</span>
            </div>
          )}
          {summary.nd > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-pill)]" role="listitem">
              <FileOutput className="h-3.5 w-3.5 text-[var(--fg-2)]" strokeWidth={1.5} />
              <span className="text-[12px] font-medium text-[var(--fg-2)]">ND</span>
              <span className="font-[family-name:var(--font-geist-mono)] text-[11px] font-medium text-[var(--accent)]">{summary.nd}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-soft)] border border-[var(--accent)]/20 rounded-[var(--r-pill)]" role="listitem">
            <span className="text-[12px] font-medium text-[var(--accent)]">Aceptados</span>
            <span className="font-[family-name:var(--font-geist-mono)] text-[11px] font-medium text-[var(--accent)]">{summary.aceptados}</span>
          </div>
          {summary.observados > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--warn-soft)] border border-[var(--warn)]/20 rounded-[var(--r-pill)]" role="listitem">
              <span className="text-[12px] font-medium text-[var(--warn)]">Observados</span>
              <span className="font-[family-name:var(--font-geist-mono)] text-[11px] font-medium text-[var(--warn)]">{summary.observados}</span>
            </div>
          )}
        </div>
      )}

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

      {/* Error state */}
      {fetchError && !loading && (
        <div className="bg-[var(--danger-soft)] border border-[var(--danger)]/20 text-[var(--danger)] p-4 rounded-[var(--r-sm)] text-[13px] flex items-center gap-3 animate-scale-in" role="alert">
          <AlertCircle className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
          <span className="flex-1">{fetchError}</span>
          <button onClick={fetchComprobantes} className="h-8 px-3 rounded-[var(--r-sm)] border border-[var(--danger)]/20 text-[12px] font-medium hover:bg-[var(--bg)] transition-colors">
            Reintentar
          </button>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] overflow-hidden shadow-[var(--shadow-card)] animate-fade-in-up animate-delay-2">
        {loading ? (
          <div className="p-5 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-[var(--border-soft)]">
                <div className="flex items-center gap-2 flex-1">
                  <div className="h-1.5 w-1.5 rounded-full skeleton-shimmer" />
                  <div className="h-4 w-24 rounded skeleton-shimmer" />
                </div>
                <div className="h-4 w-20 rounded skeleton-shimmer" />
                <div className="hidden sm:block h-4 w-32 rounded skeleton-shimmer" />
                <div className="h-4 w-16 rounded skeleton-shimmer" />
                <div className="h-5 w-16 rounded-full skeleton-shimmer" />
                <div className="h-7 w-7 rounded skeleton-shimmer" />
              </div>
            ))}
          </div>
        ) : filteredComprobantes.length === 0 ? (
          <div className="p-14 text-center">
            <div className="h-12 w-12 mx-auto rounded-full bg-[var(--surface)] grid place-items-center mb-4">
              {searchTerm || filterTipo !== 'ALL'
                ? <Search className="h-5 w-5 text-[var(--muted-2)]" strokeWidth={1.5} />
                : <FileText className="h-5 w-5 text-[var(--muted-2)]" strokeWidth={1.5} />}
            </div>
            <div className="text-[15px] font-medium text-[var(--fg-2)] mb-1">
              {searchTerm || filterTipo !== 'ALL' ? 'Sin resultados' : 'No hay comprobantes'}
            </div>
            <p className="text-[13px] text-[var(--muted)] max-w-[40ch] mx-auto">
              {searchTerm || filterTipo !== 'ALL'
                ? 'Ningún registro coincide con tu búsqueda. Prueba con otros términos o limpia los filtros.'
                : 'Emite tu primera factura o boleta y aparecerá aquí automáticamente.'}
            </p>
            {searchTerm || filterTipo !== 'ALL' ? (
              <button
                onClick={() => { setSearchTerm(''); setFilterTipo('ALL') }}
                className="mt-4 h-9 px-4 rounded-[var(--r-sm)] border border-[var(--border)] text-[13px] font-medium text-[var(--fg-2)] hover:bg-[var(--surface)] transition-colors inline-flex items-center gap-2"
              >
                Limpiar filtros
              </button>
            ) : (
              <a
                href="/billing/new"
                className="mt-4 h-9 px-4 rounded-[var(--r-sm)] bg-[var(--fg)] hover:bg-[var(--fg-hover)] text-white text-[13px] font-medium transition-colors inline-flex items-center gap-2"
              >
                <FilePlus2 className="h-4 w-4" strokeWidth={1.5} />
                Nuevo comprobante
              </a>
            )}
          </div>
        ) : (
          <>
            {/* Vista móvil: cards */}
            <div className="sm:hidden divide-y divide-[var(--border-soft)]">
              {filteredComprobantes.map((c) => {
                const isFactura = c.tipo_comprobante === '01'
                const isNcNd = c.tipo_comprobante === NC_CODE || c.tipo_comprobante === ND_CODE
                return (
                  <div key={c.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${
                          isFactura ? 'bg-[var(--fg)]' : isNcNd ? 'bg-[var(--warn)]' : 'bg-[var(--accent)]'
                        }`} />
                        <span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-medium text-[var(--fg)] truncate">{c.serie_numero}</span>
                        {isNcNd && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-[var(--r-pill)] text-[10px] font-medium ${
                            c.tipo_comprobante === NC_CODE
                              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                              : 'bg-[var(--warn-soft)] text-[var(--warn)]'
                          }`}>
                            {tipoComprobanteLabel(c.tipo_comprobante)}
                          </span>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-[var(--r-pill)] text-[11px] font-medium shrink-0 ${
                        c.estado_sunat === 'ACEPTADO'
                          ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'bg-[var(--warn-soft)] text-[var(--warn)]'
                      }`}>
                        {c.estado_sunat}
                      </span>
                    </div>
                    <p className="text-[13px] text-[var(--fg-2)] truncate">{c.cliente_razon_social || 'Clientes varios'}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-[family-name:var(--font-geist-mono)] text-[12px] text-[var(--muted)]">{c.fecha_emision}</span>
                      <span className="font-[family-name:var(--font-geist-mono)] text-[14px] font-medium text-[var(--fg)]">S/ {c.importe_total.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1 pt-1">
                      <button onClick={() => handleOpenTicket(c)} className="h-9 w-9 grid place-items-center rounded-[var(--r-sm)] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors" aria-label="Ver ticket">
                        <Printer className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                      <button onClick={() => handleWhatsApp(c)} className="h-9 w-9 grid place-items-center rounded-[var(--r-sm)] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface)] transition-colors" aria-label="Compartir por WhatsApp">
                        <Share2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                      {!ESTADOS_FINALES.includes(c.estado_sunat) && (
                        <button
                          onClick={() => handleReconsultarCdr(c.id)}
                          disabled={reconsultando === c.id}
                          className="ml-auto h-9 px-3 inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border border-[var(--border)] text-[12px] font-medium text-[var(--fg-2)] hover:bg-[var(--surface)] hover:text-[var(--fg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Reconsultar CDR en SUNAT"
                          aria-label="Reconsultar CDR"
                        >
                          {reconsultando === c.id
                            ? <RotateCw className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                            : <RotateCw className="h-3.5 w-3.5" strokeWidth={1.5} />}
                          <span>Reconsultar</span>
                        </button>
                      )}
                    </div>
                    {reconsultaMsg?.id === c.id && (
                      <div className={`text-[11px] mt-1 ${reconsultaMsg.ok ? 'text-[var(--accent)]' : 'text-[var(--danger)]'}`} role="status">
                        {reconsultaMsg.text}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Vista desktop: tabla */}
            <div className="hidden sm:block overflow-x-auto">
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
                    const isNcNd = c.tipo_comprobante === NC_CODE || c.tipo_comprobante === ND_CODE
                    return (
                      <tr key={c.id} className="hover:bg-[var(--surface)] transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                              isFactura ? 'bg-[var(--fg)]' : isNcNd ? 'bg-[var(--warn)]' : 'bg-[var(--accent)]'
                            }`} />
                            <span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-medium text-[var(--fg)]">{c.serie_numero}</span>
                            {isNcNd && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-[var(--r-pill)] text-[10px] font-medium ${
                                c.tipo_comprobante === NC_CODE
                                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                                  : 'bg-[var(--warn-soft)] text-[var(--warn)]'
                              }`}>
                                {tipoComprobanteLabel(c.tipo_comprobante)}
                              </span>
                            )}
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
                            <button onClick={() => handleOpenTicket(c)} className="h-9 w-9 md:h-7 md:w-7 grid place-items-center rounded-[var(--r-sm)] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors" title="Ver ticket" aria-label="Ver ticket">
                              <Printer className="h-4 w-4 md:h-3.5 md:w-3.5" strokeWidth={1.5} />
                            </button>
                            <button onClick={() => handleWhatsApp(c)} className="h-9 w-9 md:h-7 md:w-7 grid place-items-center rounded-[var(--r-sm)] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface)] transition-colors" title="Compartir por WhatsApp" aria-label="Compartir por WhatsApp">
                              <Share2 className="h-4 w-4 md:h-3.5 md:w-3.5" strokeWidth={1.5} />
                            </button>
                            {!ESTADOS_FINALES.includes(c.estado_sunat) && (
                              <button
                                onClick={() => handleReconsultarCdr(c.id)}
                                disabled={reconsultando === c.id}
                                className="h-9 w-9 md:h-7 md:w-7 grid place-items-center rounded-[var(--r-sm)] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Reconsultar CDR"
                                aria-label="Reconsultar CDR"
                              >
                                {reconsultando === c.id
                                  ? <RotateCw className="h-4 w-4 md:h-3.5 md:w-3.5 animate-spin" strokeWidth={1.5} />
                                  : <RotateCw className="h-4 w-4 md:h-3.5 md:w-3.5" strokeWidth={1.5} />}
                              </button>
                            )}
                          </div>
                          {reconsultaMsg?.id === c.id && (
                            <div className={`text-[11px] mt-1 ${reconsultaMsg.ok ? 'text-[var(--accent)]' : 'text-[var(--danger)]'}`} role="status">
                              {reconsultaMsg.text}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {isModalOpen && selectedTicket && (
        <TicketModal
          isOpen={isModalOpen}
          isPreview={false}
          onClose={() => setIsModalOpen(false)}
          comprobante={{ ...selectedTicket, cliente: selectedTicket.cliente, documento: selectedTicket.documento, items: selectedTicket.items, estadoSunat: selectedTicket.estadoSunat, serieNumero: selectedTicket.serieNumero }}
        />
      )}
    </main>
  )
}
