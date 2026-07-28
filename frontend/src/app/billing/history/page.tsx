'use client'

import React, { useState, useEffect } from 'react'
import Navbar from '@/components/navbar'
import TicketModal from '@/components/ticket_modal'
import { FileText, Download, Printer, Share2, Search, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

export default function HistoryPage() {
  const [filterTipo, setFilterTipo] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Datos mock de comprobantes emitidos (en producción se conectan a Supabase via useEffect)
  const [comprobantes, setComprobantes] = useState([
    {
      id: '1',
      tipo: '01',
      serieNumero: 'F001-00000001',
      cliente: 'DISTRIBUIDORA NORTE S.A.C.',
      documento: '20601234567',
      fecha: '2026-07-28 17:40',
      total: 1180.00,
      estado: 'ACEPTADO',
      hash: 'HASH-BETA-SUNAT-ABC12345',
      items: [{ descripcion: 'CONSOLA DE SOFTWARE SAAS', cantidad: 1, total: 1180.00 }]
    },
    {
      id: '2',
      tipo: '03',
      serieNumero: 'B001-00000001',
      cliente: 'JUAN PÉREZ VÁSQUEZ',
      documento: '45678912',
      fecha: '2026-07-28 16:15',
      total: 153.40,
      estado: 'ACEPTADO',
      hash: 'HASH-BETA-SUNAT-XYZ98765',
      items: [{ descripcion: 'LICENCIA ANUAL MYPE', cantidad: 1, total: 153.40 }]
    }
  ])

  const filteredComprobantes = comprobantes.filter(c => {
    const matchesTipo = filterTipo === 'ALL' || c.tipo === filterTipo
    const matchesSearch = c.serieNumero.toLowerCase().includes(searchTerm.toLowerCase()) || c.cliente.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesTipo && matchesSearch
  })

  const handleOpenTicket = (c: any) => {
    setSelectedTicket({
      serieNumero: c.serieNumero,
      cliente: c.cliente,
      documento: c.documento,
      montoTotal: c.total,
      igv: c.total - (c.total / 1.18),
      hashCpe: c.hash,
      items: c.items
    })
    setIsModalOpen(true)
  }

  const handleWhatsApp = (c: any) => {
    const text = encodeURIComponent(
      `*COMPROBANTE ELECTRÓNICO SUNAT*\n` +
      `Serie: ${c.serieNumero}\n` +
      `Cliente: ${c.cliente}\n` +
      `Total: S/ ${c.total.toFixed(2)}\n` +
      `Estado: ACEPTADO POR SUNAT`
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
            <h1 className="text-2xl font-bold text-white">Historial de Comprobantes</h1>
            <p className="text-slate-400 text-xs">Registro oficial de Facturas, Boletas y Notas transmitidas a SUNAT.</p>
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
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterTipo === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterTipo('01')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterTipo === '01' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            Facturas (01)
          </button>
          <button
            onClick={() => setFilterTipo('03')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterTipo === '03' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            Boletas (03)
          </button>
        </div>

        {/* Tabla de Historial */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-4">Comprobante</th>
                  <th className="p-4">Cliente / RUC</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Estado SUNAT</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredComprobantes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <FileText className="h-4 w-4 text-indigo-400" />
                      <span>{c.serieNumero}</span>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-200">{c.cliente}</div>
                      <div className="text-[10px] text-slate-500">{c.documento}</div>
                    </td>
                    <td className="p-4 text-slate-400">{c.fecha}</td>
                    <td className="p-4 font-bold text-emerald-400">S/ {c.total.toFixed(2)}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" />
                        {c.estado}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenTicket(c)}
                          title="Imprimir Ticket"
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleWhatsApp(c)}
                          title="Enviar por WhatsApp"
                          className="p-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 transition-colors"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Ticket Modal */}
      {selectedTicket && (
        <TicketModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          comprobante={selectedTicket}
        />
      )}
    </div>
  )
}
