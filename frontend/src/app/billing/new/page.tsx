'use client'

import React, { useState, useEffect } from 'react'
import Navbar from '@/components/navbar'
import TicketModal from '@/components/ticket_modal'
import { UserCheck, ShoppingBag, Send, Plus, Trash2, ShieldAlert, Sparkles, Search, CheckCircle2, Loader2 } from 'lucide-react'

export default function NewInvoicePage() {
  const [tipoComprobante, setTipoComprobante] = useState('01') // 01: Factura, 03: Boleta
  const [serie, setSerie] = useState('F001')
  const [numero, setNumero] = useState(1)
  
  // Paso 1: Cliente
  const [clienteTipoDoc, setClienteTipoDoc] = useState('6') // 6: RUC, 1: DNI
  const [clienteNumDoc, setClienteNumDoc] = useState('20600000001')
  const [clienteRazonSocial, setClienteRazonSocial] = useState('CLIENTE DE PRUEBA S.A.C.')
  
  // Consulta de RUC/DNI en vivo
  const [isSearchingDoc, setIsSearchingDoc] = useState(false)
  const [docBadge, setDocBadge] = useState<string | null>(null)

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

  // Función de Búsqueda Automática de RUC/DNI
  const handleConsultarDoc = async (numDoc: string) => {
    const docClean = numDoc.trim()
    if (docClean.length !== 8 && docClean.length !== 11) return

    setIsSearchingDoc(true)
    setDocBadge(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://backend-fastapi-d2wt.onrender.com'
      const token = localStorage.getItem('sunat_token') || 'test-token'

      const response = await fetch(`${apiUrl}/api/v1/comprobantes/consultar-doc/${docClean}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.found && data.razon_social) {
          setClienteRazonSocial(data.razon_social)
          const srcText = data.source === 'DATABASE' ? '✓ Base de Datos' : (data.tipo_doc === '6' ? '✓ SUNAT Oficial' : '✓ RENIEC Oficial')
          setDocBadge(srcText)
        } else {
          setDocBadge('No encontrado en padrón')
        }
      }
    } catch (err) {
      console.error('Error consultando RUC/DNI:', err)
    } finally {
      setIsSearchingDoc(false)
    }
  }

  // Auto-consulta al completar 8 u 11 dígitos
  useEffect(() => {
    if (clienteNumDoc.length === 8 || clienteNumDoc.length === 11) {
      const timer = setTimeout(() => {
        handleConsultarDoc(clienteNumDoc)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [clienteNumDoc])

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
      const token = localStorage.getItem('sunat_token') || 'test-token'

      const response = await fetch(`${apiUrl}/api/v1/comprobantes/emitir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
        tipoComprobante: tipoComprobante === '01' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA',
        fechaEmision: new Date().toLocaleDateString('es-PE'),
        emisorRazonSocial: 'EMPRESA MYPE DE PRUEBA S.A.C.',
        emisorRuc: '20000000001',
        emisorDireccion: 'AV. PRINCIPAL 123 - LIMA',
        clienteRazonSocial: clienteRazonSocial,
        clienteRuc: clienteNumDoc,
        items: items,
        opGravada: totalGravado,
        igv: totalIgv,
        total: totalInclinclsive,
        hashCpe: data.hash_cpe || 'A1B2C3D4E5F67890=',
        qrCodeBase64: data.qr_code_base64
      })

      setModalOpen(true)
      setNumero(n => n + 1)
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error al procesar el comprobante.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-6">
        
        {/* Header de la Acción */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-white">Nueva Emisión Rápida</h1>
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> 3 Clics
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">Generación de XML UBL 2.1, Firma Digital y Envío a SUNAT en tiempo real.</p>
          </div>

          {/* Selección Tipo de Comprobante */}
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => handleTipoChange('01')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                tipoComprobante === '01' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              FACTURA (F001)
            </button>
            <button
              onClick={() => handleTipoChange('03')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                tipoComprobante === '03' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              BOLETA (B001)
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-4 rounded-xl text-sm flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Clic 1: Datos del Cliente */}
        <section className="bg-slate-900/60 border border-slate-800 backdrop-blur-md p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <UserCheck className="h-4 w-4" />
              <span>Clic 1: Cliente & Documento (Autocompletado SUNAT / RENIEC)</span>
            </div>

            {docBadge && (
              <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {docBadge}
              </span>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Documento</label>
              <select
                value={clienteTipoDoc}
                onChange={(e) => setClienteTipoDoc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
              >
                <option value="6">RUC (Empresa)</option>
                <option value="1">DNI (Persona Natural)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Número de Doc (RUC/DNI)</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={clienteNumDoc}
                  onChange={(e) => setClienteNumDoc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-10 py-2 text-sm text-white focus:border-indigo-500 outline-none font-mono"
                  placeholder="20601234567"
                />
                <button
                  type="button"
                  onClick={() => handleConsultarDoc(clienteNumDoc)}
                  disabled={isSearchingDoc}
                  className="absolute right-2 text-slate-400 hover:text-indigo-400 p-1"
                  title="Consultar en SUNAT/RENIEC"
                >
                  {isSearchingDoc ? <Loader2 className="h-4 w-4 animate-spin text-indigo-400" /> : <Search className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Razón Social / Nombre Completo</label>
              <input
                type="text"
                value={clienteRazonSocial}
                onChange={(e) => setClienteRazonSocial(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                placeholder="Razón Social del Cliente"
              />
            </div>
          </div>
        </section>

        {/* Clic 2: Detalle de Productos / Servicios */}
        <section className="bg-slate-900/60 border border-slate-800 backdrop-blur-md p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <ShoppingBag className="h-4 w-4" />
              <span>Clic 2: Productos y Servicios a Cobrar</span>
            </div>
          </div>

          {/* Formulario Agregar Item */}
          <div className="grid sm:grid-cols-12 gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
            <div className="sm:col-span-7">
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Descripción del Producto / Servicio"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="sm:col-span-3">
              <input
                type="number"
                value={newPrecio}
                onChange={(e) => setNewPrecio(e.target.value)}
                placeholder="Precio Inc. IGV (S/)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1 transition-all"
              >
                <Plus className="h-4 w-4" /> Agregar
              </button>
            </div>
          </div>

          {/* Tabla de Ítems */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Descripción</th>
                  <th className="py-2.5 px-3 text-right">Cant.</th>
                  <th className="py-2.5 px-3 text-right">P. Unit</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{item.codigo}</td>
                    <td className="py-2.5 px-3 font-medium text-white">{item.descripcion}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{item.cantidad}</td>
                    <td className="py-2.5 px-3 text-right font-mono">S/ {item.precio_unitario.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">
                      S/ {(item.precio_unitario * item.cantidad).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumen Totales */}
          <div className="flex flex-col items-end pt-3 border-t border-slate-800/80 text-xs space-y-1">
            <div className="flex justify-between w-48 text-slate-400">
              <span>Op. Gravada:</span>
              <span className="font-mono">S/ {totalGravado.toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-48 text-slate-400">
              <span>IGV (18%):</span>
              <span className="font-mono">S/ {totalIgv.toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-48 text-sm font-bold text-white pt-1 border-t border-slate-800">
              <span>Total Importe:</span>
              <span className="font-mono text-emerald-400">S/ {totalInclinclsive.toFixed(2)}</span>
            </div>
          </div>
        </section>

        {/* Clic 3: Botón de Emisión Final */}
        <div className="pt-2">
          <button
            onClick={handleEmitir}
            disabled={isSubmitting || items.length === 0}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-4 rounded-xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 text-base transition-all disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
            <span>{isSubmitting ? 'Firmando y enviando a SUNAT...' : 'Clic 3: EMITIR Y FIRMAR COMPROBANTE HASTA SUNAT'}</span>
          </button>
        </div>

      </main>

      {/* Ticketera / Impresión Modal */}
      {modalOpen && comprobanteEmitido && (
        <TicketModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          comprobante={{
            serieNumero: comprobanteEmitido.serieNumero,
            cliente: comprobanteEmitido.clienteRazonSocial,
            documento: comprobanteEmitido.clienteRuc,
            montoTotal: comprobanteEmitido.total,
            igv: comprobanteEmitido.igv,
            hashCpe: comprobanteEmitido.hashCpe,
            items: comprobanteEmitido.items.map((i: any) => ({
              descripcion: i.descripcion,
              cantidad: i.cantidad,
              total: i.precio_unitario * i.cantidad
            }))
          }}
        />
      )}
    </div>
  )
}
