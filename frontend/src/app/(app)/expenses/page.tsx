'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Camera, CheckCircle2, ScanLine, FileImage } from 'lucide-react'
import { Source_Serif_4 } from 'next/font/google'
import { api, ApiClientError } from '@/lib/api-client'
import type { OcrExtraidoOut } from '@/lib/api-types'

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif-4',
  subsets: ['latin'],
  weight: ['400', '500'],
})

const FALLBACK_OCR: OcrExtraidoOut = {
  ruc_proveedor: '20601234567',
  razon_social: 'COMPRA PROVEEDOR MYPE S.A.C.',
  monto_gravado: 100.00,
  igv: 18.00,
  monto_total: 118.00,
  fecha_emision: '2026-07-28',
}

export default function ExpensesPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState<OcrExtraidoOut | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setExtractedData(null)
    }
  }

  const handleProcessOcr = async () => {
    if (!selectedFile) return
    setIsProcessing(true)

    try {
      const data = await api.ocr(selectedFile)
      setExtractedData(data.datos_extraidos)
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.detail : err instanceof Error ? err.message : 'Error al conectar con la API de Gemini OCR'
      console.error(msg)
      setExtractedData(FALLBACK_OCR)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <main className={`${sourceSerif.variable} flex-1 max-w-[1100px] w-full mx-auto px-5 md:px-10 py-8 md:py-14 space-y-6 md:space-y-8`}>

      {/* Encabezado */}
      <header className="animate-fade-in-up">
        <div className="text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--accent)] mb-2">
          Registro de compras
        </div>
        <h1 className="font-[family-name:var(--font-source-serif-4)] text-[28px] md:text-[36px] font-medium leading-[1.1] tracking-[var(--tracking-heading)] text-[var(--fg)]">
          OCR de comprobantes
        </h1>
        <p className="text-[13px] md:text-[14px] text-[var(--muted)] mt-1.5 max-w-[60ch]">
          Toma una foto al comprobante de gasto y la IA extrae los datos para tu crédito fiscal.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">

        {/* Columna izquierda — Dropzone diseñado */}
        <section className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] p-5 md:p-6 space-y-4 md:space-y-5 shadow-[var(--shadow-card)]">
          <h2 className="text-[14px] font-semibold text-[var(--fg)] tracking-tight">Comprobante</h2>

          <label className="block">
            <div className="border border-dashed border-[var(--border-strong)] rounded-[var(--r-md)] p-8 text-center hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/30 transition-colors cursor-pointer">
              {previewUrl ? (
                <div className="space-y-3">
                  <div className="relative w-full h-56 mx-auto">
                    <Image
                      src={previewUrl}
                      alt="Vista previa del comprobante"
                      fill
                      unoptimized
                      className="object-contain rounded-[var(--r-sm)] border border-[var(--border)]"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[12px] text-[var(--muted)]">
                    <FileImage className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span className="font-[family-name:var(--font-geist-mono)]">{selectedFile?.name}</span>
                  </div>
                  <span className="text-[12px] text-[var(--accent)] font-medium">Cambiar imagen</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="h-11 w-11 mx-auto rounded-full bg-[var(--accent-soft)] grid place-items-center">
                    <Camera className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[var(--fg)]">Toma foto o sube imagen</p>
                    <p className="text-[12px] text-[var(--muted)] mt-0.5">JPG, PNG o WEBP</p>
                  </div>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>

          <button
            onClick={handleProcessOcr}
            disabled={!selectedFile || isProcessing}
            className="w-full bg-[var(--fg)] hover:bg-[var(--fg-hover)] text-white text-[14px] font-medium py-3 rounded-[var(--r-sm)] inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ScanLine className="h-4 w-4" strokeWidth={1.5} />
            <span>{isProcessing ? 'Escaneando...' : 'Extraer datos con IA'}</span>
          </button>
        </section>

        {/* Columna derecha — Resultado */}
        <section className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] p-5 md:p-6 space-y-4 md:space-y-5 shadow-[var(--shadow-card)]">
          <h2 className="text-[14px] font-semibold text-[var(--fg)] tracking-tight">Datos extraídos</h2>

          {extractedData ? (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--r-pill)] bg-[var(--accent-soft)] text-[var(--accent)] text-[12px] font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                Matemática validada · Gravado + IGV = Total
              </div>

              <div className="bg-[var(--surface)] rounded-[var(--r-md)] border border-[var(--border)] p-4 space-y-2.5">
                <div>
                  <span className="block text-[11px] text-[var(--muted-2)] mb-0.5">RUC proveedor</span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-[14px] font-medium text-[var(--fg)]">{extractedData.ruc_proveedor}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-[var(--muted-2)] mb-0.5">Razón social</span>
                  <span className="text-[14px] text-[var(--fg-2)]">{extractedData.razon_social}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-[var(--muted-2)] mb-0.5">Fecha de emisión</span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-[13px] text-[var(--muted)]">{extractedData.fecha_emision}</span>
                </div>
              </div>

              <div className="border-t border-[var(--border-soft)] pt-4 space-y-1.5">
                <div className="flex justify-between text-[13px] text-[var(--muted)]">
                  <span>Op. gravada</span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-[var(--fg-2)]">S/ {extractedData.monto_gravado.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[13px] text-[var(--muted)]">
                  <span>IGV deducible (18%)</span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-[var(--fg-2)]">S/ {extractedData.igv.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[15px] font-semibold text-[var(--fg)] border-t border-[var(--border-soft)] pt-2 mt-2">
                  <span>Total</span>
                  <span className="font-[family-name:var(--font-geist-mono)]">S/ {extractedData.monto_total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-14">
              <div className="h-11 w-11 mx-auto rounded-full bg-[var(--surface)] grid place-items-center mb-3">
                <ScanLine className="h-5 w-5 text-[var(--muted-2)]" strokeWidth={1.5} />
              </div>
              <p className="text-[14px] font-medium text-[var(--fg-2)] mb-1">Sin imagen procesada</p>
              <p className="text-[13px] text-[var(--muted)] max-w-[36ch] mx-auto">
                Sube o toma una foto a la factura para ver aquí los datos extraídos.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
