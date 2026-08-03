'use client'

import React from 'react'
import { Source_Serif_4 } from 'next/font/google'
import { Building, User, CreditCard, Bell, Shield, ChevronRight } from 'lucide-react'

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif-4',
  subsets: ['latin'],
  weight: ['400', '500'],
})

const sections = [
  {
    id: 'empresa',
    icon: Building,
    title: 'Datos de la empresa',
    description: 'RUC, razón social, dirección fiscal y datos de contacto.',
    fields: [
      { label: 'RUC', value: '20000000001', mono: true },
      { label: 'Razón social', value: 'EMPRESA MYPE DE PRUEBA S.A.C.' },
      { label: 'Dirección fiscal', value: 'AV. PRINCIPAL 123 - LIMA' },
      { label: 'Teléfono', value: '(01) 555-1234' },
      { label: 'Email', value: 'admin@empresa.pe' },
    ],
  },
  {
    id: 'usuario',
    icon: User,
    title: 'Perfil de usuario',
    description: 'Nombre, correo electrónico y preferencias de cuenta.',
    fields: [
      { label: 'Nombre', value: 'Admin MYPE' },
      { label: 'Correo', value: 'admin@empresa.pe' },
      { label: 'Rol', value: 'Administrador' },
    ],
  },
  {
    id: 'facturacion',
    icon: CreditCard,
    title: 'Configuración de facturación',
    description: 'Series, correlativos, moneda por defecto y opciones de impresión.',
    fields: [
      { label: 'Serie Factura', value: 'F001', mono: true },
      { label: 'Serie Boleta', value: 'B001', mono: true },
      { label: 'Moneda por defecto', value: 'PEN (Soles)' },
      { label: 'Formato de ticket', value: 'Térmico 80mm' },
    ],
  },
  {
    id: 'notificaciones',
    icon: Bell,
    title: 'Notificaciones',
    description: 'Alertas de comprobantes, vencimientos y reportes SIRE.',
    fields: [
      { label: 'Email de alertas', value: 'admin@empresa.pe' },
      { label: 'Frecuencia resumen', value: 'Semanal' },
    ],
  },
  {
    id: 'seguridad',
    icon: Shield,
    title: 'Seguridad',
    description: 'Contraseña, sesiones activas y autenticación.',
    fields: [
      { label: 'Último cambio de contraseña', value: 'Hace 30 días' },
      { label: 'Sesiones activas', value: '1' },
    ],
  },
]

export default function SettingsPage() {
  return (
    <main className={`${sourceSerif.variable} flex-1 max-w-[1100px] w-full mx-auto px-5 md:px-10 py-8 md:py-14 space-y-6 md:space-y-8`}>
      {/* Encabezado */}
      <header className="animate-fade-in-up">
        <div className="text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--accent)] mb-2">
          Cuenta
        </div>
        <h1 className="font-[family-name:var(--font-source-serif-4)] text-[28px] md:text-[36px] font-medium leading-[1.1] tracking-[var(--tracking-heading)] text-[var(--fg)]">
          Configuración
        </h1>
        <p className="text-[13px] md:text-[14px] text-[var(--muted)] mt-1.5">
          Administra los datos de tu empresa y preferencias de la cuenta.
        </p>
      </header>

      {/* Secciones */}
      <div className="space-y-4">
        {sections.map((section, idx) => {
          const Icon = section.icon
          return (
            <section
              key={section.id}
              className={`bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] overflow-hidden shadow-[var(--shadow-card)] animate-fade-in-up animate-delay-${Math.min(idx, 4)}`}
            >
              {/* Section header */}
              <div className="flex items-center justify-between p-5 md:p-6 border-b border-[var(--border-soft)]">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-[var(--r-sm)] bg-[var(--surface)] grid place-items-center">
                    <Icon className="h-4.5 w-4.5 text-[var(--fg-2)]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold text-[var(--fg)] tracking-tight">{section.title}</h2>
                    <p className="text-[12px] text-[var(--muted)] mt-0.5">{section.description}</p>
                  </div>
                </div>
                <button
                  className="h-8 px-3 rounded-[var(--r-sm)] border border-[var(--border)] text-[12px] font-medium text-[var(--fg-2)] hover:bg-[var(--surface)] transition-colors duration-[var(--dur-fast)] inline-flex items-center gap-1.5 opacity-50 cursor-not-allowed"
                  disabled
                  aria-label={`Editar ${section.title}`}
                >
                  Editar
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>

              {/* Fields */}
              <div className="p-5 md:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                  {section.fields.map((field) => (
                    <div key={field.label}>
                      <span className="block text-[11px] font-semibold text-[var(--muted)] mb-1 tracking-[var(--tracking-caps)] uppercase">
                        {field.label}
                      </span>
                      <span className={`text-[14px] text-[var(--fg-2)] ${field.mono ? 'font-[family-name:var(--font-geist-mono)]' : ''}`}>
                        {field.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )
        })}
      </div>

      {/* Footer info */}
      <div className="text-center py-6 animate-fade-in-up animate-delay-4">
        <p className="text-[12px] text-[var(--muted-2)]">
          Para cambios en RUC o datos legales, contacta soporte.
        </p>
      </div>
    </main>
  )
}
