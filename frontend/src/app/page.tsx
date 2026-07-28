'use client'

import React, { useState } from 'react'
import { Building2, ShieldCheck, Zap, Receipt, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [ruc, setRuc] = useState('')
  const [razonSocial, setRazonSocial] = useState('')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white font-sans">
      {/* Dynamic Background Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      </div>

      {/* Header Navigation */}
      <header className="relative z-10 border-b border-slate-800/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-tr from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Receipt className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              FacturaSUNAT AI
            </span>
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Multi-Tenant
            </span>
          </div>
        </div>

        <button 
          onClick={() => setIsRegister(!isRegister)}
          className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
        >
          {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : 'Registrar mi MYPE'}
        </button>
      </header>

      {/* Main Content Hero */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-12 grid md:grid-cols-2 gap-12 items-center">
        
        {/* Left Column: Value Prop */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-indigo-400 font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Facturación Electrónica UBL 2.1 + IA Gemini</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Emisión de Facturas y Boletas en <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">3 Clics</span> para MYPES
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed">
            Plataforma Multi-Empresa ultra-rápida, adaptada a celulares y laptops. Envío directo a SUNAT (SEE Emisor), firma digital automática, lectura OCR de gastos con IA y reportes para SIRE.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Aislamiento RLS Multi-Tenant</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Certificado CDT encriptado</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>WhatsApp & Ticketera BT</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>OCR Compras con Gemini</span>
            </div>
          </div>
        </div>

        {/* Right Column: Auth Box */}
        <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-xl p-8 rounded-2xl shadow-2xl shadow-indigo-950/50">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">
              {isRegister ? 'Registrar Empresa (Tenant)' : 'Iniciar Sesión'}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {isRegister ? 'Ingresa los datos de tu MYPE para activar tu espacio aislado.' : 'Ingresa tus credenciales para acceder a tu panel de facturación.'}
            </p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">RUC de la empresa</label>
                  <div className="relative">
                    <input 
                      type="text"
                      maxLength={11}
                      placeholder="20123456789"
                      value={ruc}
                      onChange={(e) => setRuc(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                    <Building2 className="absolute right-3 top-2.5 h-5 w-5 text-slate-600" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Razón Social</label>
                  <input 
                    type="text"
                    placeholder="MI EMPRESA S.A.C."
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Correo Electrónico</label>
              <input 
                type="email"
                placeholder="admin@empresa.pe"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Contraseña</label>
              <input 
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all group"
            >
              <span>{isRegister ? 'Crear Empresa y Cuenta' : 'Ingresar al Sistema'}</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>FacturaSUNAT AI &copy; 2026 — Sistema SaaS Multi-Tenant Peruano. Conectado a SUNAT SEE (BETA / PROD).</p>
      </footer>
    </div>
  )
}
