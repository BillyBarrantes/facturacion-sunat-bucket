'use client'

import React, { useState, useEffect } from 'react'
import Navbar from '@/components/navbar'
import TicketModal from '@/components/ticket_modal'
import { UserCheck, ShoppingBag, Send, Plus, Trash2, ShieldAlert, Sparkles, Search, CheckCircle2, Loader2, Building, Percent, DollarSign, FileText, Receipt } from 'lucide-react'

export default function NewInvoicePage() {
  // Pestaña Seleccionada: '01' = Factura, '03' = Boleta
  const [tipoComprobante, setTipoComprobante] = useState('01')
  const [serie, setSerie] = useState('F001')
  const [numero, setNumero] = useState(1)
  
  // Datos del Emisor
  const [emisorRuc, setEmisorRuc] = useState('20000000001')
  const [emisorRazonSocial, setEmisorRazonSocial] = useState('EMPRESA MYPE DE PRUEBA S.A.C.')
  const [emisorDireccion, setEmisorDireccion] = useState('AV. PRINCIPAL 123 - LIMA')

  // Paso 1: Cliente / Receptor
  const [clienteTipoDoc, setClienteTipoDoc] = useState('6') // 6: RUC, 1: DNI, 0: Sin Doc
  const [clienteNumDoc, setClienteNumDoc] = useState('20600000001')
  const [clienteRazonSocial, setClienteRazonSocial] = useState('CLIENTE DE PRUEBA S.A.C.')
  const [clienteDireccion, setClienteDireccion] = useState('AV. LOS OLIVOS 456 - LIMA')
  
  // Consulta de RUC/DNI en vivo
  const [isSearchingDoc, setIsSearchingDoc] = useState(false)
  const [docBadge, setDocBadge] = useState<string | null>(null)

  // Paso 2: Ítems y Configuración de Precios
  // Modo de Precios (Solo Factura): 'INC' = Incluido IGV, 'SIN' = Sin IGV (Valor Venta)
  const [modoIgv, setModoIgv] = useState<'INC' | 'SIN'>('INC')
  
  const [items, setItems] = useState<Array<{
    descripcion: string
    cantidad: number
    valor_unitario: number
    precio_unitario: number
    unidad_medida: string
  }>>([
    { descripcion: 'DESARROLLO DE SOFTWARE / SERVICIO', cantidad: 1, valor_unitario: 100.0, precio_unitario: 118.0, unidad_medida: 'NIU' }
  ])
  
  const [newCantidad, setNewCantidad] = useState('1')
  const [newDesc, setNewDesc] = useState('')
  const [newPrecio, setNewPrecio] = useState('')

  // Opciones Avanzadas (Solo Facturas)
  const [descuentoGlobal, setDescuentoGlobal] = useState<string>('0')
  const [anticipoTotal, setAnticipoTotal] = useState<string>('0')

  // Estado de Emisión
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [comprobanteEmitido, setComprobanteEmitido] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Cambio de Pestaña: Factura / Boleta
  const handleSelectTab = (tipo: string) => {
    setTipoComprobante(tipo)
    setErrorMsg('')
    setDocBadge(null)

    if (tipo === '01') {
      // Configuración para FACTURA
      setSerie('F001')
      setClienteTipoDoc('6')
      if (clienteNumDoc === '00000000' || clienteNumDoc === '20600000001') {
        setClienteNumDoc('20600000001')
        setClienteRazonSocial('CLIENTE DE PRUEBA S.A.C.')
        setClienteDireccion('AV. LOS OLIVOS 456 - LIMA')
      }
    } else {
      // Configuración para BOLETA
      setSerie('B001')
      setClienteTipoDoc('1')
      // Resetear campos avanzados de factura
      setDescuentoGlobal('0')
      setAnticipoTotal('0')
      setModoIgv('INC')

      if (!clienteNumDoc || clienteNumDoc === '20600000001') {
        setClienteNumDoc('00000000')
        setClienteRazonSocial('CLIENTES VARIOS')
        setClienteDireccion('')
      }
    }
  }

  // Búsqueda Automática de RUC/DNI en SUNAT/RENIEC
  const handleConsultarDoc = async (numDoc: string) => {
    const docClean = numDoc.trim()
    if (docClean.length !== 8 && docClean.length !== 11) return

    setIsSearchingDoc(true)
    setDocBadge(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://backend-fastapi-d2wt.onrender.com'
      const token = localStorage.getItem('sunat_token') || 'test-token'

      const response = await fetch(`${apiUrl}/api/v1/comprobantes/consultar-doc/${docClean}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.found && data.razon_social) {
          setClienteRazonSocial(data.razon_social)
          if (data.direccion) {
            setClienteDireccion(data.direccion)
          }
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

  // Agregar Ítem a la lista
  const handleAddItem = () => {
    if (!newDesc || !newPrecio || parseFloat(newPrecio) <= 0) return
    
    const cant = parseFloat(newCantidad) > 0 ? parseFloat(newCantidad) : 1
    const monto = parseFloat(newPrecio)

    let valU = 0
    let precU = 0

    if (tipoComprobante === '01' && modoIgv === 'SIN') {
      // El monto ingresado es SIN IGV (Valor Venta)
      valU = monto
      precU = monto * 1.18
    } else {
      // El monto ingresado INCLUYE IGV (Precio Final)
      precU = monto
      valU = monto / 1.18
    }

    setItems([
      ...items,
      {
        descripcion: newDesc,
        cantidad: cant,
        valor_unitario: valU,
        precio_unitario: precU,
        unidad_medida: 'NIU'
      }
    ])
    setNewDesc('')
    setNewPrecio('')
    setNewCantidad('1')
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // Cálculos Dinámicos en Vivo
  const subtotalGravadoBruto = items.reduce((acc, item) => acc + (item.valor_unitario * item.cantidad), 0)
  const valDescuento = parseFloat(descuentoGlobal) > 0 ? parseFloat(descuentoGlobal) : 0
  const valAnticipo = parseFloat(anticipoTotal) > 0 ? parseFloat(anticipoTotal) : 0

  const subtotalGravadoNeto = Math.max(0, subtotalGravadoBruto - valDescuento)
  const totalIgvCalculado = subtotalGravadoNeto * 0.18
  const totalImporteCalculado = Math.max(0, subtotalGravadoNeto + totalIgvCalculado - valAnticipo)

  // Validación de Alerta SUNAT para Boleta > S/ 700.00
  const boletaAlerta700 = tipoComprobante === '03' && totalImporteCalculado > 700.0 && (!clienteNumDoc || clienteNumDoc === '00000000')

  const handleEmitir = async () => {
    if (boletaAlerta700) {
      setErrorMsg('Exigencia SUNAT: Para Boletas de Venta mayores a S/ 700.00 es obligatorio identificar al comprador (DNI / RUC y Nombre).')
      return
    }

    if (tipoComprobante === '01' && clienteTipoDoc !== '6') {
      setErrorMsg('Exigencia SUNAT: Las Facturas electrónicas se emiten exclusivamente a receptores con RUC de 11 dígitos para crédito fiscal.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg('')

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://backend-fastapi-d2wt.onrender.com'
      const token = localStorage.getItem('sunat_token') || 'test-token'

      const payloadBody = {
        tipo_comprobante: tipoComprobante,
        serie: serie,
        numero: numero,
        cliente_tipo_doc: clienteTipoDoc,
        cliente_num_doc: clienteNumDoc,
        cliente_razon_social: clienteRazonSocial,
        cliente_direccion: clienteDireccion,
        moneda: 'PEN',
        metodo_pago: 'EFECTIVO',
        descuento_global: valDescuento,
        anticipo_total: valAnticipo,
        items: items.map((item, idx) => ({
          codigo: `PROD${String(idx + 1).padStart(2, '0')}`,
          descripcion: item.descripcion,
          unidad_medida: item.unidad_medida,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario
        }))
      }

      const response = await fetch(`${apiUrl}/api/v1/comprobantes/emitir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payloadBody)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Error al emitir comprobante')
      }

      setComprobanteEmitido({
        serieNumero: data.comprobante || `${serie}-${String(numero).padStart(8, '0')}`,
        tipoComprobanteNombre: tipoComprobante === '01' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA',
        fechaEmision: new Date().toLocaleDateString('es-PE'),
        emisorRazonSocial: emisorRazonSocial,
        emisorRuc: emisorRuc,
        emisorDireccion: emisorDireccion,
        clienteRazonSocial: clienteRazonSocial,
        clienteRuc: clienteNumDoc,
        clienteDireccion: clienteDireccion,
        items: items,
        opGravada: subtotalGravadoNeto,
        descuento: valDescuento,
        anticipo: valAnticipo,
        igv: totalIgvCalculado,
        montoTotal: totalImporteCalculado,
        hashCpe: data.hash_cpe || 'A1B2C3D4E5F67890='
      })

      setModalOpen(true)
      setNumero(n => n + 1)
    } catch (err: any) {
      const msg = err.message || 'Ocurrió un error al procesar el comprobante.'
      setErrorMsg(msg)
      alert(`Atención al emitir comprobante:\n\n${msg}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-6">
        
        {/* Header Principal de Selección por Pestañas (Factura / Boleta) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-white">Nueva Emisión de Comprobantes</h1>
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> UBL 2.1 SUNAT
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">Selecciona el tipo de comprobante que vas a generar a tu cliente.</p>
          </div>

          {/* PESTAÑAS PRINCIPALES: FACTURA / BOLETA */}
          <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => handleSelectTab('01')}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-lg transition-all ${
                tipoComprobante === '01' 
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/30' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>FACTURA (F001)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab('03')}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-lg transition-all ${
                tipoComprobante === '03' 
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-600/30' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Receipt className="h-4 w-4" />
              <span>BOLETA (B001)</span>
            </button>
          </div>
        </div>

        {/* Card Datos del Emisor (Tu Empresa) */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center border border-indigo-500/20">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Emisor (Tu Empresa)</div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{emisorRazonSocial}</span>
                <span className="text-indigo-400 font-mono text-xs">(RUC: {emisorRuc})</span>
              </div>
              <div className="text-xs text-slate-500">{emisorDireccion}</div>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <span className={`text-xs font-mono font-bold px-3 py-1 rounded-md border ${
              tipoComprobante === '01' 
                ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' 
                : 'text-teal-400 bg-teal-500/10 border-teal-500/20'
            }`}>
              {tipoComprobante === '01' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA'} {serie}-{String(numero).padStart(8, '0')}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-4 rounded-xl text-sm flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {boletaAlerta700 && (
          <div className="bg-amber-950/60 border border-amber-800 text-amber-300 p-4 rounded-xl text-xs flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
            <span><b>Norma SUNAT:</b> El total supera los S/ 700.00. Es obligatorio registrar el DNI/RUC y Nombre completo del comprador.</span>
          </div>
        )}

        {/* Clic 1: Datos del Cliente / Receptor */}
        <section className="bg-slate-900/60 border border-slate-800 backdrop-blur-md p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <UserCheck className="h-4 w-4" />
              <span>Clic 1: Cliente / Receptor ({tipoComprobante === '01' ? 'Exigencia RUC para Crédito Fiscal' : 'Autocompletado RUC / DNI'})</span>
            </div>

            {docBadge && (
              <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {docBadge}
              </span>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo Documento</label>
              <select
                value={clienteTipoDoc}
                onChange={(e) => setClienteTipoDoc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
              >
                {tipoComprobante === '01' ? (
                  <option value="6">RUC (Obligatorio en Facturas)</option>
                ) : (
                  <>
                    <option value="1">DNI (Persona Natural)</option>
                    <option value="6">RUC (Empresa)</option>
                    <option value="0">Sin Documento (Clientes Varios)</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Número (RUC / DNI)</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={clienteNumDoc}
                  onChange={(e) => setClienteNumDoc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-10 py-2 text-sm text-white focus:border-indigo-500 outline-none font-mono"
                  placeholder={clienteTipoDoc === '6' ? '20601234567' : '45678912'}
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
              <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre / Razón Social</label>
              <input
                type="text"
                value={clienteRazonSocial}
                onChange={(e) => setClienteRazonSocial(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                placeholder="Razón Social del Cliente"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Dirección Fiscal (Si aplica)</label>
              <input
                type="text"
                value={clienteDireccion}
                onChange={(e) => setClienteDireccion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                placeholder="Av. Principal 123"
              />
            </div>
          </div>
        </section>

        {/* Clic 2: Productos y Servicios a Cobrar */}
        <section className="bg-slate-900/60 border border-slate-800 backdrop-blur-md p-6 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <ShoppingBag className="h-4 w-4" />
              <span>Clic 2: Productos y Servicios a Cobrar</span>
            </div>

            {/* SELECTOR DE MODO DE PRECIOS (SOLO FACTURA) */}
            {tipoComprobante === '01' && (
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1 rounded-lg text-xs">
                <span className="text-slate-400 pl-2 font-medium">Modo Precio:</span>
                <button
                  type="button"
                  onClick={() => setModoIgv('INC')}
                  className={`px-2.5 py-1 rounded font-semibold transition-all ${
                    modoIgv === 'INC'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Incluido IGV
                </button>
                <button
                  type="button"
                  onClick={() => setModoIgv('SIN')}
                  className={`px-2.5 py-1 rounded font-semibold transition-all ${
                    modoIgv === 'SIN'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sin IGV (Valor Venta)
                </button>
              </div>
            )}
          </div>

          {/* Formulario Agregar Ítem con Selección de Cantidad */}
          <div className="grid sm:grid-cols-12 gap-3 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/50 items-center">
            {/* Campo Cantidad */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Cantidad</label>
              <input
                type="number"
                min={1}
                step="any"
                value={newCantidad}
                onChange={(e) => setNewCantidad(e.target.value)}
                placeholder="1"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none text-center font-mono font-bold"
              />
            </div>

            {/* Campo Descripción */}
            <div className="sm:col-span-6">
              <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Descripción del Bien / Servicio</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Descripción del bien vendido o servicio prestado"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
              />
            </div>

            {/* Campo Precio/Monto */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                {tipoComprobante === '01' ? (modoIgv === 'SIN' ? 'Monto Sin IGV (S/)' : 'Monto Inc. IGV (S/)') : 'Precio Inc. IGV (S/)'}
              </label>
              <input
                type="number"
                step="any"
                value={newPrecio}
                onChange={(e) => setNewPrecio(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none font-mono"
              />
            </div>

            {/* Botón Agregar */}
            <div className="sm:col-span-2 flex items-end h-full pt-4 sm:pt-0">
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1 transition-all shadow-md shadow-indigo-600/20"
              >
                <Plus className="h-4 w-4" /> Agregar
              </button>
            </div>
          </div>

          {/* Tabla de Ítems (SIN Columna Código) */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Descripción del Bien / Servicio</th>
                  <th className="py-2.5 px-3 text-center">Cant.</th>
                  <th className="py-2.5 px-3 text-right">Valor U. (Sin IGV)</th>
                  <th className="py-2.5 px-3 text-right">Precio U. (Inc. IGV)</th>
                  <th className="py-2.5 px-3 text-right">Importe Total</th>
                  <th className="py-2.5 px-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {items.map((item, idx) => {
                  const totalItem = item.precio_unitario * item.cantidad
                  return (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-medium text-white">{item.descripcion}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold bg-slate-950/40">{item.cantidad}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">S/ {item.valor_unitario.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">S/ {item.precio_unitario.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">
                        S/ {totalItem.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                          title="Eliminar ítem"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* OPCIONES AVANZADAS: ANTICIPOS Y DESCUENTOS (SOLO FACTURA) */}
          {tipoComprobante === '01' && (
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3 pt-4 mt-4">
              <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5" />
                <span>Opciones Avanzadas de Facturación (Descuentos & Anticipos)</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Descuento Global a la Op. Gravada (S/)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={descuentoGlobal}
                      onChange={(e) => setDescuentoGlobal(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none font-mono"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">S/</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Anticipo Recibido Previamente (S/)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={anticipoTotal}
                      onChange={(e) => setAnticipoTotal(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none font-mono"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">S/</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Resumen Totales y Desglose IGV 18% */}
          <div className="flex flex-col items-end pt-3 border-t border-slate-800/80 text-xs space-y-1.5">
            <div className="flex justify-between w-64 text-slate-400">
              <span>Subtotal Gravado Bruto:</span>
              <span className="font-mono">S/ {subtotalGravadoBruto.toFixed(2)}</span>
            </div>

            {valDescuento > 0 && (
              <div className="flex justify-between w-64 text-rose-400">
                <span>(-) Descuento Global:</span>
                <span className="font-mono">- S/ {valDescuento.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between w-64 text-slate-300 font-medium">
              <span>Base Imponible Neta:</span>
              <span className="font-mono">S/ {subtotalGravadoNeto.toFixed(2)}</span>
            </div>

            <div className="flex justify-between w-64 text-slate-400">
              <span>IGV (18%):</span>
              <span className="font-mono">S/ {totalIgvCalculado.toFixed(2)}</span>
            </div>

            {valAnticipo > 0 && (
              <div className="flex justify-between w-64 text-blue-400">
                <span>(-) Anticipo Aplicado:</span>
                <span className="font-mono">- S/ {valAnticipo.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between w-64 text-sm font-bold text-white pt-2 border-t border-slate-800">
              <span>IMPORTE TOTAL:</span>
              <span className="font-mono text-emerald-400 text-base">S/ {totalImporteCalculado.toFixed(2)}</span>
            </div>
          </div>
        </section>

        {/* Clic 3: Botón de Emisión Final */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleEmitir}
            disabled={isSubmitting || items.length === 0}
            className={`w-full text-white font-bold py-4 rounded-xl shadow-xl flex items-center justify-center gap-2 text-base transition-all disabled:opacity-50 ${
              tipoComprobante === '01'
                ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-blue-800 shadow-indigo-600/25'
                : 'bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-700 hover:from-emerald-600 hover:to-teal-800 shadow-emerald-500/25'
            }`}
          >
            <Send className="h-5 w-5" />
            <span>
              {isSubmitting
                ? 'Firmando y enviando a SUNAT...'
                : `Clic 3: EMITIR Y FIRMAR ${tipoComprobante === '01' ? 'FACTURA' : 'BOLETA'} ${serie}-${String(numero).padStart(8, '0')}`}
            </span>
          </button>
        </div>

      </main>

      {/* Ticketera / Impresión Modal */}
      {modalOpen && comprobanteEmitido && (
        <TicketModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          comprobante={{
            tipoComprobanteNombre: comprobanteEmitido.tipoComprobanteNombre,
            serieNumero: comprobanteEmitido.serieNumero,
            fechaEmision: comprobanteEmitido.fechaEmision,
            emisorRazonSocial: comprobanteEmitido.emisorRazonSocial,
            emisorRuc: comprobanteEmitido.emisorRuc,
            emisorDireccion: comprobanteEmitido.emisorDireccion,
            cliente: comprobanteEmitido.clienteRazonSocial,
            documento: comprobanteEmitido.clienteRuc,
            clienteDireccion: comprobanteEmitido.clienteDireccion,
            opGravada: comprobanteEmitido.opGravada,
            descuento: comprobanteEmitido.descuento,
            anticipo: comprobanteEmitido.anticipo,
            igv: comprobanteEmitido.igv ?? 0,
            montoTotal: comprobanteEmitido.montoTotal ?? comprobanteEmitido.total ?? 0,
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
