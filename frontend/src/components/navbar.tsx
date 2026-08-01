'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FilePlus2, ReceiptText, LayoutDashboard, ScanLine, FileText } from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname()

  const navItems = [
    { label: 'Emitir', href: '/billing/new', icon: FilePlus2 },
    { label: 'Historial', href: '/billing/history', icon: ReceiptText },
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Compras OCR', href: '/expenses', icon: ScanLine },
  ]

  return (
    <>
      {/* Sidebar (Desktop ≥ 768px) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-[var(--border)] bg-[var(--surface)] z-40" role="navigation" aria-label="Menú principal">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-[var(--border)]">
          <div className="h-7 w-7 rounded-[var(--r-sm)] bg-[var(--fg)] flex items-center justify-center">
            <FileText className="h-4 w-4 text-white" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <span className="font-semibold text-[15px] text-[var(--fg)] tracking-tight">FacturaSUNAT</span>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1" aria-label="Navegación de secciones">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-sm)] text-[14px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--bg)] text-[var(--fg)] shadow-[var(--shadow-card)]'
                    : 'text-[var(--muted)] hover:text-[var(--fg-2)] hover:bg-[rgba(13,13,13,0.04)]'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-6 py-4 border-t border-[var(--border)]">
          <p className="text-[11px] text-[var(--muted-2)] tracking-[var(--tracking-small)]">UBL 2.1 · SUNAT SEE</p>
        </div>
      </aside>

      {/* Bottom-bar (Mobile < 768px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg)]/95 backdrop-blur-sm border-t border-[var(--border)] flex items-stretch justify-around px-1" role="navigation" aria-label="Navegación móvil" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[52px] flex-1 px-2 py-2 rounded-[var(--r-sm)] text-[10px] font-medium transition-colors relative ${
                isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              <span className="leading-tight">{item.label}</span>
              {isActive && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 h-[3px] w-5 rounded-full bg-[var(--accent)]" />
              )}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
