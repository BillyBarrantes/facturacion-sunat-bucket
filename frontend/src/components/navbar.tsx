'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PlusCircle, History, LayoutDashboard, ShoppingBag, Receipt, Sparkles } from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname()

  const navItems = [
    { label: 'Emitir', href: '/billing/new', icon: PlusCircle, highlight: true },
    { label: 'Historial', href: '/billing/history', icon: History },
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Compras OCR', href: '/expenses', icon: ShoppingBag },
  ]

  return (
    <>
      {/* Top Header Navigation (Desktop / Laptop) */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-6 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-9 w-9 bg-gradient-to-tr from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight">FacturaSUNAT</span>
            <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              BETA SUNAT
            </span>
          </div>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  item.highlight
                    ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-blue-700'
                    : isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </header>

      {/* Bottom Navigation Bar (Mobile / Touchscreen PWA) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-2xl border-t border-slate-800 px-4 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-all ${
                item.highlight
                  ? 'text-indigo-400 font-bold'
                  : isActive
                  ? 'text-white font-semibold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className={`h-5 w-5 ${item.highlight ? 'text-indigo-400 animate-pulse' : ''}`} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </>
  )
}
