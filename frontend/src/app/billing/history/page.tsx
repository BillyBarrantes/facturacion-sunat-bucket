'use client'

import React, { useState, useEffect } from 'react'
import Navbar from '@/components/navbar'
import TicketModal from '@/components/ticket_modal'
import { FileText, Search, RefreshCw, Printer, Share2 } from 'lucide-react'

export default function HistoryPage() {
  const [filterTipo, setFilterTipo] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const [comprobantes, setComprobantes] = useState<any[]>([])

  const fetchComprobantes = async () => {
    setLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://backend-fastapi-d2wt.onrender.com'
      const token = localStorage.getItem('sunat_token') || 'test-token'
      const res = await fetch(`${apiUrl}/api/v1/comprobantes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setComprobantes(data.comprobantes || [])
      }
    } catch (e) {
      console.error(e)
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

  const handleOpenTicket = (c: any) => {
    setSelectedTicket({
      tipoComprobanteNombre: c.tipo_comprobante === '01' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA',
      serieNumero: c.serie_numero,
      fechaEmision: c.fecha_emision,
      cliente: c.cliente_razon_social || 'CLIENTES VARIOS',
      documento: c.cliente_num_doc || '00000000',
      montoTotal: c.importe_total,
      igv: c.importe_total - (c.importe_total / 1.18),
      hashCpe: c.hash_cpe || 'EC3CfOGm+qqj4kQWP4KPL4TtKpGj',
      items: c.items || [{ descripcion: 'OPERACIÓN DE VENTA / SERVICIO', cantidad: 1, total: c.importe_total }]
    })
    setIsModalOpen(true)
  }

  const handleWhatsApp = (c: any) => {
    const text = encodeURIComponent(
      `*COMPROBANTE ELECTRÓNICO SUNAT*\n` +
      `Serie: ${c.serie_numero}\n` +
      `Cliente: ${c.cliente_razon_social || 'CLIENTES VARIOS'}\n` +
      `Total: S/ ${c.importe_total.toFixed(2)}\n` +
      `Estado: ${c.estado_sunat}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-20 md:pb-0">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">Historial de Comprobantes</h1>
              <button
                onClick={fetchComprobantes}
                disabled={loading}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-900 border border-slate-800 transition-colors"
                title="Actualizar historial de Supabase DB"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-slate-400 text-xs">Registro oficial de Facturas y Boletas transmitidas a SUNAT en Supabase DB.</p>
          </div>

          {/* Buscador */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Buscar por cliente o serie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          </div>
        </div>

        {/* Filtros por Tipo */}
        <div className="flex gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setFilterTipo('ALL')}
            className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all ${
              filterTipo === 'ALL'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Todos ({comprobantes.length})
          </button>

          <button
            onClick={() => setFilterTipo('01')}
            className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all ${
              filterTipo === '01'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Facturas ({comprobantes.filter(c => c.tipo_comprobante === '01').length})
          </button>

          <button
            onClick={() => setFilterTipo('03')}
            className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all ${
              filterTipo === '03'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Boletas ({comprobantes.filter(c => c.tipo_comprobante === '03').length})
          </button>
        </div>

        {/* Tabla de Comprobantes */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Cargando historial desde Supabase DB...</div>
          ) : filteredComprobantes.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No se encontraron comprobantes registrados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Comprobante</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Monto Total</th>
                    <th className="px-6 py-4">Estado SUNAT</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredComprobantes.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          <FileText className={`h-4 w-4 ${c.tipo_comprobante === '01' ? 'text-indigo-400' : 'text-emerald-400'}`} />
                          <span>{c.serie_numero}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{c.fecha_emision}</td>
                      <td className="px-6 py-4 font-bold text-white">S/ {c.importe_total.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${
                          c.estado_sunat === 'ACEPTADO'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {c.estado_sunat}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenTicket(c)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Ticket</span>
                        </button>
                        <button
                          onClick={() => handleWhatsApp(c)}
                          className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* Modal de Ticketera */}
      {isModalOpen && selectedTicket && (
        <TicketModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          comprobante={selectedTicket}
        />
      )}
    </div>
  )
}
