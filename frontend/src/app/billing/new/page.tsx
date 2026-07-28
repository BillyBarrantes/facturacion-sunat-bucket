'use client'

import React, { useState } from 'react'
import Navbar from '@/components/navbar'
import TicketModal from '@/components/ticket_modal'
import { UserCheck, ShoppingBag, Send, Plus, Trash2, ShieldAlert, Sparkles } from 'lucide-react'

export default function NewInvoicePage() {
  const [tipoComprobante, setTipoComprobante] = useState('01') // 01: Factura, 03: Boleta
  const [serie, setSerie] = useState('F001')
  const [numero, setNumero] = useState(1)
  
  // Paso 1: Cliente
  const [clienteTipoDoc, setClienteTipoDoc] = useState('6') // 6: RUC, 1: DNI
  const [clienteNumDoc, setClienteNumDoc] = useState('20600000001')
  const [clienteRazonSocial, setClienteRazonSocial] = useState('CLIENTE DE PRUEBA S.A.C.')

  // Paso 2: Ítems
  const [items, setItems] = useState([
    { codigo: 'PROD01', descripcion: 'DESARROLLO DE SOFTWARE / SERVICIO', unidad_medida: 'NIU', cantidad: 1, precio_unitario: 118.0 }
  ])
  const [newDesc, setNewDesc] = useState('')
  const [newPrecio, setNewPrecio] = useState('')

  // Estado de Emisión
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [comprobanteEmitido, setComprobanteEmitido] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleTipoChange = (tipo: string) => {
    setTipoComprobante(tipo)
    if (tipo === '01') {
      setSerie('F001')
      setClienteTipoDoc('6')
    } else {
      setSerie('B001')
      setClienteTipoDoc('1')
    }
  }

  const handleAddItem = () => {
    if (!newDesc || !newPrecio) return
    setItems([
      ...items,
      {
        codigo: `PROD${String(items.length + 1).padStart(2, '0')}`,
        descripcion: newDesc,
        unidad_medida: 'NIU',
        cantidad: 1,
        precio_unitario: parseFloat(newPrecio)
      }
    ])
    setNewDesc('')
    setNewPrecio('')
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // Cálculos en vivo
  const totalInclinclsive = items.reduce((acc, item) => acc + (item.precio_unitario * item.cantidad), 0)
  const totalGravado = totalInclinclsive / 1.18
  const totalIgv = totalInclinclsive - totalGravado

  const handleEmitir = async () => {
    setIsSubmitting(true)
    setErrorMsg('')

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://backend-fastapi-d2wt.onrender.com'
      const response = await fetch(`${apiUrl}/api/v1/comprobantes/emitir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Simulamos autorización bearer para la sesión
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          tipo_comprobante: tipoComprobante,
          serie: serie,
          numero: numero,
          cliente_tipo_doc: clienteTipoDoc,
          cliente_num_doc: clienteNumDoc,
          cliente_razon_social: clienteRazonSocial,
          moneda: 'PEN',
          metodo_pago: 'EFECTIVO',
          items: items
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Error al emitir comprobante')
      }

      setComprobanteEmitido({
        serieNumero: `${serie}-${String(numero).padStart(8, '0')}`,
        cliente: clienteRazonSocial,
        documento: clienteNumDoc,
        montoTotal: totalInclinclsive,
        igv: totalIgv,
        hashCpe: data.hash_cpe || 'HASH-BETA-SUNAT-12345678',
        items: items.map(i => ({ descripcion: i.descripcion, cantidad: i.cantidad, total: i.precio_unitario * i.cantidad }))
      })

      setModalOpen(true)
      setNumero(numero + 1) // Incrementar correlativo
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión con el API Backend')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-20 md:pb-0">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6">
        
        {/* Banner de Estado SUNAT */}
        <div className="bg-indigo-950/40 border border-indigo-500/20 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Emisión Directa en 3 Clics</h2>
              <p className="text-xs text-indigo-300">Conectado a SUNAT SEE (Ambiente BETA Activo)</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleTipoChange('01')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tipoComprobante === '01' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              Factura (01)
            </button>
            <button
              onClick={() => handleTipoChange('03')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tipoComprobante === '03' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              Boleta (03)
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/50 border border-rose-800 p-4 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* PASO 1: DATOS DEL CLIENTE */}
        <section className="bg-slate-900/60 border border-slate-800 backdrop-blur-xl p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="h-6 w-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center">1</span>
            <h3 className="font-semibold text-sm text-white">Datos del Cliente</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Tipo Doc.</label>
              <select
                value={clienteTipoDoc}
                onChange={(e) => setClienteTipoDoc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="6">RUC (6)</option>
                <option value="1">DNI (1)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">N° Documento</label>
              <input
                type="text"
                value={clienteNumDoc}
                onChange={(e) => setClienteNumDoc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Razón Social / Nombre</label>
              <input
                type="text"
                value={clienteRazonSocial}
                onChange={(e) => setClienteRazonSocial(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* PASO 2: PRODUCTOS E ÍTEMS */}
        <section className="bg-slate-900/60 border border-slate-800 backdrop-blur-xl p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="h-6 w-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center">2</span>
            <h3 className="font-semibold text-sm text-white">Detalle de Productos / Servicios</h3>
          </div>

          {/* Formulario rápido para agregar ítem */}
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Descripción del ítem o producto..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Precio (S/)"
              value={newPrecio}
              onChange={(e) => setNewPrecio(e.target.value)}
              className="w-28 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={handleAddItem}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition-all"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Lista de Ítems */}
          <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
            {items.map((item, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white">{item.descripcion}</div>
                  <div className="text-slate-500 text-[10px]">Cant: {item.cantidad} NIU</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-bold text-emerald-400">S/ {(item.precio_unitario * item.cantidad).toFixed(2)}</div>
                  <button
                    onClick={() => handleRemoveItem(idx)}
                    className="text-slate-600 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desglose de Totales */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Op. Gravada:</span>
              <span>S/ {totalGravado.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>IGV (18%):</span>
              <span>S/ {totalIgv.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-white border-t border-slate-800 pt-2">
              <span>IMPORTE TOTAL:</span>
              <span className="text-emerald-400">S/ {totalInclinclsive.toFixed(2)}</span>
            </div>
          </div>
        </section>

        {/* PASO 3: EMITIR A SUNAT */}
        <button
          onClick={handleEmitir}
          disabled={isSubmitting || items.length === 0}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 text-base transition-all disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
          <span>{isSubmitting ? 'Firmando y Enviando a SUNAT...' : `Emitir ${tipoComprobante === '01' ? 'Factura' : 'Boleta'} ${serie}-${String(numero).padStart(8, '0')}`}</span>
        </button>

      </main>

      {/* Ticket Modal de Confirmación e Impresión */}
      {comprobanteEmitido && (
        <TicketModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          comprobante={comprobanteEmitido}
        />
      )}
    </div>
  )
}
