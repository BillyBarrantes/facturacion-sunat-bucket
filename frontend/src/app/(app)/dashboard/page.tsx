'use client'

import React, { useState, useEffect } from 'react'
import { RefreshCw, FileSpreadsheet, TrendingUp, Receipt, Wallet } from 'lucide-react'
import { api, ApiClientError } from '@/lib/api-client'
import type { MetricsResponse } from '@/lib/api-types'

export default function DashboardPage() {
  const [loadingAi, setLoadingAi] = useState(false)
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [aiSummary, setAiSummary] = useState('')

  const [metrics, setMetrics] = useState<MetricsResponse>({
    total_ventas: 0,
    igv_ventas: 0,
    conteo_comprobantes: 0,
    total_compras: 0,
    igv_compras: 0,
    conteo_compras: 0,
    igv_estimado_a_pagar: 0,
    desglose_metodos_pago: {
      EFECTIVO: 0,
      YAPE_PLIN: 0,
      TRANSFERENCIA: 0,
      TARJETA: 0,
    },
  })

  const fetchMetrics = async () => {
    setLoadingMetrics(true)
    try {
      const data = await api.metrics()
      setMetrics(data)
    } catch (e) {
      if (e instanceof ApiClientError) console.error('Error fetching metrics:', e.detail)
      else console.error(e)
    } finally {
      setLoadingMetrics(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  const handleDownloadSire = async () => {
    try {
      const res = await api.sireExcel('202607')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (e) {
      if (e instanceof ApiClientError) console.error('Error descargando SIRE:', e.detail)
      else console.error(e)
    }
  }

  const handleExplainAi = async () => {
    setLoadingAi(true)
    try {
      const data = await api.aiSummary()
      setAiSummary(data.resumen_ejecutivo || '')
    } catch {
      setAiSummary(`Durante este mes has registrado S/ ${metrics.total_ventas.toFixed(2)} en ventas distribuidas en ${metrics.conteo_comprobantes} comprobantes. Tu crédito fiscal suma S/ ${metrics.igv_compras.toFixed(2)}, estimando un IGV a pagar de S/ ${metrics.igv_estimado_a_pagar.toFixed(2)}.`)
    } finally {
      setLoadingAi(false)
    }
  }

  const totalDigital = metrics.desglose_metodos_pago.YAPE_PLIN + metrics.desglose_metodos_pago.TRANSFERENCIA + metrics.desglose_metodos_pago.TARJETA

  return (
    <main className="flex-1 max-w-[1100px] w-full mx-auto px-5 md:px-10 py-8 md:py-14 space-y-8 md:space-y-10">

      {/* Encabezado */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <div className="text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--accent)] mb-2">
            Panel financiero
          </div>
          <h1 className="font-[family-name:var(--font-source-serif-4)] text-[28px] md:text-[36px] font-medium leading-[1.1] tracking-[var(--tracking-heading)] text-[var(--fg)]">
            Dashboard MYPE
          </h1>
          <p className="text-[13px] md:text-[14px] text-[var(--muted)] mt-1.5">
            Métricas en tiempo real, estimación de IGV y exportación SIRE.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchMetrics}
            disabled={loadingMetrics}
            className="h-9 w-9 grid place-items-center rounded-[var(--r-sm)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
            title="Actualizar métricas"
            aria-label="Actualizar métricas"
          >
            <RefreshCw className={`h-4 w-4 ${loadingMetrics ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          </button>

          <button
            onClick={handleExplainAi}
            disabled={loadingAi}
            className="h-9 px-3.5 rounded-[var(--r-sm)] border border-[var(--border)] text-[13px] font-medium text-[var(--fg-2)] hover:bg-[var(--surface)] transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          >
            <TrendingUp className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.5} />
            <span>{loadingAi ? 'Analizando...' : 'Resumen con IA'}</span>
          </button>

          <button
            onClick={handleDownloadSire}
            className="h-9 px-3.5 rounded-[var(--r-sm)] bg-[var(--fg)] hover:bg-[var(--fg-hover)] text-white text-[13px] font-medium inline-flex items-center gap-2 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" strokeWidth={1.5} />
            <span>Exportar SIRE</span>
          </button>
        </div>
      </header>

      {/* Resumen IA */}
      {aiSummary && (
        <section className="bg-[var(--accent-soft)] border border-[var(--accent)]/15 rounded-[var(--r-lg)] p-6">
          <div className="flex items-center gap-2 mb-2.5">
            <TrendingUp className="h-3.5 w-3.5 text-[var(--accent)]" strokeWidth={1.75} />
            <span className="text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--accent)]">
              Resumen ejecutivo · IA
            </span>
          </div>
          <p className="text-[14px] leading-[var(--leading-body)] text-[var(--fg-2)] max-w-[72ch]">{aiSummary}</p>
        </section>
      )}

      {/* KPIs principales — 3 sobrios */}
      <section className="animate-fade-in-up animate-delay-1">
        <h2 className="text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--muted)] mb-4">
          Resumen del período
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] p-5 md:p-6 flex flex-col gap-1.5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-hover)]">
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-soft)]">
              <span className="text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--muted)]">Ventas totales</span>
              <Receipt className="h-4 w-4 text-[var(--muted-2)]" strokeWidth={1.5} />
            </div>
            {loadingMetrics ? (
              <div className="h-[36px] w-40 rounded skeleton-shimmer" />
            ) : (
              <div className="font-[family-name:var(--font-geist-mono)] text-[28px] md:text-[32px] font-medium tracking-[var(--tracking-display)] text-[var(--fg)] leading-[1.1]">
                {`S/ ${metrics.total_ventas.toFixed(2)}`}
              </div>
            )}
            <div className="text-[12px] text-[var(--muted)]">{loadingMetrics ? '—' : `${metrics.conteo_comprobantes} comprobantes emitidos`}</div>
          </div>

          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] p-5 md:p-6 flex flex-col gap-1.5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-hover)]">
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-soft)]">
              <span className="text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--muted)]">Crédito fiscal</span>
              <Wallet className="h-4 w-4 text-[var(--muted-2)]" strokeWidth={1.5} />
            </div>
            {loadingMetrics ? (
              <div className="h-[36px] w-40 rounded skeleton-shimmer" />
            ) : (
              <div className="font-[family-name:var(--font-geist-mono)] text-[28px] md:text-[32px] font-medium tracking-[var(--tracking-display)] text-[var(--fg)] leading-[1.1]">
                {`S/ ${metrics.total_compras.toFixed(2)}`}
              </div>
            )}
            <div className="text-[12px] text-[var(--muted)]">{loadingMetrics ? '—' : `IGV de compras: S/ ${metrics.igv_compras.toFixed(2)}`}</div>
          </div>

          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] p-5 md:p-6 flex flex-col gap-1.5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-hover)]">
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-soft)]">
              <span className="text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--muted)]">IGV a pagar</span>
              <span className="h-4 w-4 grid place-items-center text-[var(--muted-2)] text-[12px] font-mono">S/</span>
            </div>
            {loadingMetrics ? (
              <div className="h-[36px] w-40 rounded skeleton-shimmer" />
            ) : (
              <div className="font-[family-name:var(--font-geist-mono)] text-[28px] md:text-[32px] font-medium tracking-[var(--tracking-display)] text-[var(--fg)] leading-[1.1]">
                {`S/ ${metrics.igv_estimado_a_pagar.toFixed(2)}`}
              </div>
            )}
            <div className="text-[12px] text-[var(--muted)]">{loadingMetrics ? '—' : 'IGV ventas menos crédito fiscal'}</div>
          </div>
        </div>
      </section>

      {/* Composición de cobros — Donut chart */}
      <section className="animate-fade-in-up animate-delay-2">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--muted)]">
            Composición de cobros
          </h2>
          <span className="text-[12px] text-[var(--muted-2)] font-[family-name:var(--font-geist-mono)]">
            Efectivo S/ {metrics.desglose_metodos_pago.EFECTIVO.toFixed(2)} · Digital S/ {totalDigital.toFixed(2)}
          </span>
        </div>

        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] p-5 md:p-8 shadow-[var(--shadow-card)]">
          {loadingMetrics ? (
            <div className="flex items-center justify-center h-[280px]">
              <div className="w-[160px] h-[160px] md:w-[200px] md:h-[200px] rounded-full skeleton-shimmer" />
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12">
              {/* Donut chart SVG */}
              <div className="relative flex-shrink-0">
                <svg
                  viewBox="0 0 200 200"
                  className="w-[160px] h-[160px] md:w-[200px] md:h-[200px] -rotate-90"
                  role="img"
                  aria-label={`Distribución de cobros: Efectivo ${((metrics.desglose_metodos_pago.EFECTIVO / (metrics.total_ventas || 1)) * 100).toFixed(0)}%, Digital ${((totalDigital / (metrics.total_ventas || 1)) * 100).toFixed(0)}%`}
                >
                  {(() => {
                    const total = metrics.total_ventas || 1
                    const segments = [
                      { value: metrics.desglose_metodos_pago.EFECTIVO, color: 'var(--fg)' },
                      { value: metrics.desglose_metodos_pago.YAPE_PLIN, color: 'var(--accent)' },
                      { value: metrics.desglose_metodos_pago.TRANSFERENCIA, color: 'var(--muted)' },
                      { value: metrics.desglose_metodos_pago.TARJETA, color: 'var(--border)' },
                    ]
                    const radius = 70
                    const circumference = 2 * Math.PI * radius
                    let cumulativePercent = 0

                    return segments.map((seg, i) => {
                      const percent = (seg.value / total) * 100
                      const dashArray = `${(percent / 100) * circumference} ${circumference}`
                      const dashOffset = -((cumulativePercent / 100) * circumference)
                      cumulativePercent += percent
                      return (
                        <circle
                          key={i}
                          cx="100"
                          cy="100"
                          r={radius}
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="24"
                          strokeDasharray={dashArray}
                          strokeDashoffset={dashOffset}
                          strokeLinecap="butt"
                          className="transition-[stroke-dasharray] duration-700 ease-out"
                          opacity={seg.value > 0 ? 1 : 0}
                        />
                      )
                    })
                  })()}
                </svg>
                {/* Centro del donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--muted)]">
                    Total
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-[20px] font-medium tracking-[-0.02em] text-[var(--fg)] leading-[1.1]">
                    S/ {(metrics.total_ventas || 0).toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Leyenda */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 min-w-0">
                {[
                  { label: 'Efectivo', value: metrics.desglose_metodos_pago.EFECTIVO, color: 'var(--fg)' },
                  { label: 'Yape / Plin', value: metrics.desglose_metodos_pago.YAPE_PLIN, color: 'var(--accent)' },
                  { label: 'Transferencia', value: metrics.desglose_metodos_pago.TRANSFERENCIA, color: 'var(--muted)' },
                  { label: 'Tarjeta', value: metrics.desglose_metodos_pago.TARJETA, color: 'var(--border)' },
                ].map((item) => {
                  const total = metrics.total_ventas || 1
                  const pct = ((item.value / total) * 100).toFixed(1)
                  return (
                    <div key={item.label} className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-[var(--fg-2)] truncate">{item.label}</div>
                        <div className="font-[family-name:var(--font-geist-mono)] text-[12px] text-[var(--muted)]">
                          S/ {item.value.toFixed(2)} <span className="text-[var(--muted-2)]">({pct}%)</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </section>

    </main>
  )
}
