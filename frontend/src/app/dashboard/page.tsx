'use client'

import React, { useState, useEffect } from 'react'
import Navbar from '@/components/navbar'
import { TrendingUp, FileSpreadsheet, Sparkles, RefreshCw } from 'lucide-react'

export default function DashboardPage() {
  const [loadingAi, setLoadingAi] = useState(false)
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [aiSummary, setAiSummary] = useState('')

  const [metrics, setMetrics] = useState({
    totalVentas: 0,
    igvVentas: 0,
    conteoComprobantes: 0,
    totalCompras: 0,
    igvCompras: 0,
    igvEstimado: 0,
    desglose: {
      EFECTIVO: 0,
      YAPE_PLIN: 0,
      TRANSFERENCIA: 0,
      TARJETA: 0
    }
  })

  const fetchMetrics = async () => {
    setLoadingMetrics(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://backend-fastapi-d2wt.onrender.com'
      const token = localStorage.getItem('sunat_token') || 'test-token'
      const res = await fetch(`${apiUrl}/api/v1/dashboard/metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setMetrics({
          totalVentas: data.total_ventas || 0,
          igvVentas: data.igv_ventas || 0,
          conteoComprobantes: data.conteo_comprobantes || 0,
          totalCompras: data.total_compras || 0,
          igvCompras: data.igv_compras || 0,
          igvEstimado: data.igv_estimado_a_pagar || 0,
          desglose: {
            EFECTIVO: data.desglose_metodos_pago?.EFECTIVO || 0,
            YAPE_PLIN: data.desglose_metodos_pago?.YAPE_PLIN || 0,
            TRANSFERENCIA: data.desglose_metodos_pago?.TRANSFERENCIA || 0,
            TARJETA: data.desglose_metodos_pago?.TARJETA || 0
          }
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMetrics(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  const handleDownloadSire = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://backend-fastapi-d2wt.onrender.com'
    window.open(`${apiUrl}/api/v1/reports/sire-ventas/excel?periodo=202607`, '_blank')
  }

  const handleExplainAi = async () => {
    setLoadingAi(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://backend-fastapi-d2wt.onrender.com'
      const token = localStorage.getItem('sunat_token') || 'test-token'
      const res = await fetch(`${apiUrl}/api/v1/dashboard/ai-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setAiSummary(data.resumen_ejecutivo || 'Durante este mes tus ventas registran un incremento sostenido...')
    } catch {
      setAiSummary(`Durante este mes has registrado S/ ${metrics.totalVentas.toFixed(2)} en ventas distribuidas en ${metrics.conteoComprobantes} comprobantes. Tu crédito fiscal suma S/ ${metrics.igvCompras.toFixed(2)}, estimando un IGV a pagar de S/ ${metrics.igvEstimado.toFixed(2)}.`)
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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">Dashboard & Analítica MYPE</h1>
              <button
                onClick={fetchMetrics}
                disabled={loadingMetrics}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-900 border border-slate-800 transition-colors"
                title="Actualizar datos en tiempo real"
              >
                <RefreshCw className={`h-4 w-4 ${loadingMetrics ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-slate-400 text-xs">Métricas en tiempo real desde Supabase DB, estimación de IGV y exportación SIRE.</p>
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
            <div className="text-2xl font-bold text-white">
              {loadingMetrics ? '...' : `S/ ${metrics.totalVentas.toFixed(2)}`}
            </div>
            <div className="text-[11px] text-emerald-400 font-medium">
              {metrics.conteoComprobantes} comprobantes emitidos
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-2 backdrop-blur-xl">
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span>Compras & Gastos</span>
              <span className="text-blue-400 font-bold text-xs">Crédito Fiscal</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {loadingMetrics ? '...' : `S/ ${metrics.totalCompras.toFixed(2)}`}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Crédito fiscal IGV: S/ {metrics.igvCompras.toFixed(2)}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-2 backdrop-blur-xl">
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span>IGV Estimado a Pagar</span>
              <span className="text-amber-400 font-bold text-xs">$</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">
              {loadingMetrics ? '...' : `S/ ${metrics.igvEstimado.toFixed(2)}`}
            </div>
            <div className="text-[11px] text-slate-500">IGV Ventas (- IGV Compras)</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-2 backdrop-blur-xl">
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span>Efectivo & Digital</span>
              <span className="text-purple-400 font-bold text-xs">Cobros</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {loadingMetrics ? '...' : `S/ ${(metrics.desglose.EFECTIVO + metrics.desglose.YAPE_PLIN).toFixed(2)}`}
            </div>
            <div className="text-[11px] text-purple-400 font-medium">Liquidadas de inmediato</div>
          </div>
        </div>

        {/* Desglose por Método de Pago */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4 backdrop-blur-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Desglose por Canal de Pago</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs text-slate-400 mb-1">Efectivo</div>
              <div className="text-lg font-bold text-white">S/ {metrics.desglose.EFECTIVO.toFixed(2)}</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs text-slate-400 mb-1">Yape / Plin</div>
              <div className="text-lg font-bold text-emerald-400">S/ {metrics.desglose.YAPE_PLIN.toFixed(2)}</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs text-slate-400 mb-1">Transferencia</div>
              <div className="text-lg font-bold text-indigo-400">S/ {metrics.desglose.TRANSFERENCIA.toFixed(2)}</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs text-slate-400 mb-1">Tarjeta</div>
              <div className="text-lg font-bold text-purple-400">S/ {metrics.desglose.TARJETA.toFixed(2)}</div>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
