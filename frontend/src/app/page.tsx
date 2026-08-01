import { Source_Serif_4 } from 'next/font/google'
import { CheckCircle2, FileText } from 'lucide-react'
import AuthForm, { Toggle, AuthCard } from './AuthForm'

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif-4',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export default function Home() {
  return (
    <div className={`${sourceSerif.variable} min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col`}>
      <AuthForm>
        <header className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-[var(--r-sm)] bg-[var(--fg)] flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" strokeWidth={1.5} />
            </div>
            <span className="font-semibold text-[15px] tracking-tight text-[var(--fg)]">FacturaSUNAT AI</span>
          </div>
          <Toggle />
        </header>

        <main className="flex-1 max-w-[1100px] w-full mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[var(--r-pill)] bg-[var(--accent-soft)] text-[var(--accent)] text-[11px] font-medium tracking-[var(--tracking-caps)] uppercase">
              UBL 2.1 · SUNAT SEE
            </div>

            <h1 className="font-[family-name:var(--font-source-serif-4)] text-[44px] md:text-[52px] font-medium leading-[1.1] tracking-[var(--tracking-display)] text-[var(--fg)]">
              Facturación electrónica para MYPES peruanas.
            </h1>

            <p className="text-[18px] leading-[var(--leading-body)] text-[var(--muted)] max-w-[52ch]">
              Emite facturas y boletas directamente a SUNAT, con firma digital automática, lectura OCR
              de gastos y reportes para SIRE — en una sola herramienta sobria y confiable.
            </p>

            <ul className="space-y-2.5 pt-2">
              {[
                'Envío directo a SUNAT con firma digital',
                'Búsqueda automática de RUC y DNI',
                'OCR de comprobantes de compra con IA',
                'Estimación de IGV y exportación SIRE',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-[14px] text-[var(--fg-2)]">
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)] shrink-0" strokeWidth={1.5} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[var(--bg)] border border-[var(--border-soft)] rounded-[var(--r-lg)] p-8 shadow-[var(--shadow-card)]">
            <AuthCard />
          </div>
        </main>

        <footer className="border-t border-[var(--border)] py-6 text-center text-[12px] text-[var(--muted-2)]">
          <p>FacturaSUNAT AI © 2026 — Sistemas SaaS de facturación electrónica</p>
        </footer>
      </AuthForm>
    </div>
  )
}