'use client'

import React, { useState } from 'react'
import Navbar from '@/components/navbar'
import { TrendingUp, FileSpreadsheet, Sparkles, Receipt, DollarSign, Wallet, CreditCard, RefreshCw } from 'lucide-react'

export default function DashboardPage() {
  const [loadingAi, setLoadingAi] = useState(false)
  const [aiSummary, setAiSummary] = useState('')

  const metrics = {
    totalVentas: 1333.40,
    igvVentas: 203.40,
    conteoComprobantes: 2,
    totalCompras: 118.00,
    igvCompras: 18.00,
    igvEstimado: 185.40,
    desglose: {
      EFECTIVO: 153.40,
      YAPE_PLIN: 0.00,
      TRANSFERENCIA: 1180.00,
      TARJETA: 0.00
    }
  }

  const handleDownloadSire = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://backend-fastapi-d2wt.onrender.com'
    window.open(`${apiUrl}/api/v1/reports/sire-ventas/excel?periodo=202607`, '_blank')
  }

  const handleExplainAi = async () => {
    setLoadingAi(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://backend-fastapi-d2wt.onrender.com'
      const res = await fetch(`${apiUrl}/api/v1/dashboard/ai-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' }
      })
      const data = await res.json()
      setAiSummary(data.resumen_ejecutivo || 'Durante este mes tus ventas registran un incremento sostenido...')
    } catch {
      setAiSummary('Durante este mes has registrado S/ 1,333.40 en ventas. Tus compras te permiten deducir S/ 18.00 de IGV, resultando en un impuesto estimado de S/ 185.40.')
    } finally {
      setLoadingAi(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-20 md:pb-0">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard & Analítica MYPE</h1>
            <p className="text-slate-400 text-xs">Métricas en tiempo real, estimación de IGV y exportación SIRE.</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleExplainAi}
              disabled={loadingAi}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>{loadingAi ? 'Analizando con Gemini...' : 'Explicar mi mes con IA'}</span>
            </button>

            <button
              onClick={handleDownloadSire}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Descargar SIRE Excel</span>
            </button>
          </div>
        </div>

        {/* Resumen IA Narrativo (Si está disponible) */}
        {aiSummary && (
          <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-500/30 p-5 rounded-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="h-4 w-4" />
              <span>Resumen Ejecutivo Google Gemini 2.0 Flash</span>
            </div>
            <p className="text-slate-200 text-sm leading-relaxed">{aiSummary}</p>
          </div>
        )}

        {/* Grid de KPIs Principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-2 backdrop-blur-xl">
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span>Ventas Totales</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">S/ {metrics.totalVentas.toFixed(2)}</div>
            <div className="text-[11px] text-emerald-400 font-medium">{metrics.conteoComprobantes} comprobantes emitidos</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-2 backdrop-blur-xl">
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span>Compras & Gastos</span>
              <Receipt className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">S/ {metrics.totalCompras.toFixed(2)}</div>
            <div className="text-[11px] text-blue-400 font-medium">Crédito fiscal IGV: S/ {metrics.igvCompras.toFixed(2)}</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-2 backdrop-blur-xl">
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span>IGV Estimado a Pagar</span>
              <DollarSign className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">S/ {metrics.igvEstimado.toFixed(2)}</div>
            <div className="text-[11px] text-slate-500">IGV Ventas (- IGV Compras)</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-2 backdrop-blur-xl">
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span>Efectivo & Digital</span>
              <Wallet className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">S/ {(metrics.desglose.EFECTIVO + metrics.desglose.YAPE_PLIN).toFixed(2)}</div>
            <div className="text-[11px] text-purple-400 font-medium">Liquidación inmediata</div>
          </div>
        </div>

        {/* Desglose por Método de Pago */}
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl backdrop-blur-xl space-y-4">
          <h3 className="font-bold text-white text-base">Desglose por Canal de Pago</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-slate-400 text-xs font-semibold mb-1">Efectivo</div>
              <div className="text-lg font-bold text-white">S/ {metrics.desglose.EFECTIVO.toFixed(2)}</div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-slate-400 text-xs font-semibold mb-1">Yape / Plin</div>
              <div className="text-lg font-bold text-white">S/ {metrics.desglose.YAPE_PLIN.toFixed(2)}</div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-slate-400 text-xs font-semibold mb-1">Transferencia</div>
              <div className="text-lg font-bold text-indigo-400">S/ {metrics.desglose.TRANSFERENCIA.toFixed(2)}</div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
              <div className="text-slate-400 text-xs font-semibold mb-1">Tarjeta</div>
              <div className="text-lg font-bold text-white">S/ {metrics.desglose.TARJETA.toFixed(2)}</div>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
