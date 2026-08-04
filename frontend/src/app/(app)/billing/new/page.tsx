'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Source_Serif_4 } from 'next/font/google'
import ClientForm from './client-form'
import { ClipboardList, Send, Plus, Trash2, Pencil, ShieldAlert, Building, Percent, FileText, Receipt } from 'lucide-react'
import { api, ApiClientError } from '@/lib/api-client'
import type { DocLookupResponse, DetalleItemIn, ComprobanteOut } from '@/lib/api-types'
import type { LineItem, ComprobantePreview } from './types'

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif-4',
  subsets: ['latin'],
  weight: ['400', '500'],
})

const TicketModal = dynamic(() => import('@/components/ticket_modal'), { ssr: false })

// Códigos SUNAT para los 4 tipos de comprobante soportados en esta pantalla.
const TIPO_FACTURA = '01'
const TIPO_BOLETA = '03'
const TIPO_NC = '07'      // Nota de Crédito
const TIPO_ND = '08'      // Nota de Débito

// Series reales usadas por el backend. El frontend no inventa correlativos NC01-*/ND01-*.
const SERIE_FACTURA = 'F001'
const SERIE_BOLETA = 'B001'

const MOTIVOS_NC = [
  'ANULACION DE LA OPERACION',
  'DEVOLUCION TOTAL',
  'DEVOLUCION PARCIAL',
  'ERROR EN EL RUC DEL CLIENTE',
  'OTRO',
]
const MOTIVOS_ND = [
  'AUMENTO EN EL VALOR',
  'INTERESES POR MORA',
  'OTRO',
]

const TIPO_NOMBRE_COMPLETO: Record<string, string> = {
  [TIPO_FACTURA]: 'FACTURA ELECTRÓNICA',
  [TIPO_BOLETA]: 'BOLETA DE VENTA ELECTRÓNICA',
  [TIPO_NC]: 'NOTA DE CRÉDITO ELECTRÓNICA',
  [TIPO_ND]: 'NOTA DE DÉBITO ELECTRÓNICA',
}

const isNcNd = (t: string) => t === TIPO_NC || t === TIPO_ND

export default function NewInvoicePage() {
  const [tipoComprobante, setTipoComprobante] = useState('01')
  const [serie, setSerie] = useState('F001')
  const [numero, setNumero] = useState(1)
  
  const [emisorRuc, setEmisorRuc] = useState('20000000001')
  const [emisorRazonSocial, setEmisorRazonSocial] = useState('EMPRESA MYPE DE PRUEBA S.A.C.')
  const [emisorDireccion, setEmisorDireccion] = useState('AV. PRINCIPAL 123 - LIMA')

  const [clienteTipoDoc, setClienteTipoDoc] = useState('6')
  const [clienteNumDoc, setClienteNumDoc] = useState('')
  const [clienteRazonSocial, setClienteRazonSocial] = useState('')
  const [clienteDireccion, setClienteDireccion] = useState('')
  
  const [isSearchingDoc, setIsSearchingDoc] = useState(false)
  const [docBadge, setDocBadge] = useState<string | null>(null)

  const [modoIgv, setModoIgv] = useState<'INC' | 'SIN'>('INC')
  
  const [items, setItems] = useState<LineItem[]>([])
  
  const [newCantidad, setNewCantidad] = useState('1')
  const [newDesc, setNewDesc] = useState('')
  const [newPrecio, setNewPrecio] = useState('')

  const [descuentoGlobal, setDescuentoGlobal] = useState<string>('0')
  const [anticipoTotal, setAnticipoTotal] = useState<string>('0')

  // Estados exclusivos de NC/ND
  const [comprobantesReferenciables, setComprobantesReferenciables] = useState<ComprobanteOut[]>([])
  const [referenciaId, setReferenciaId] = useState('')
  const [motivoNota, setMotivoNota] = useState('')
  const [observacionesNota, setObservacionesNota] = useState('')
  const [montoAjuste, setMontoAjuste] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [comprobanteEmitido, setComprobanteEmitido] = useState<ComprobantePreview | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const fetchCorrelativo = async () => {
    if (isNcNd(tipoComprobante)) return  // El correlativo real de NC/ND lo reserva el backend
    try {
      const data = await api.correlativo(tipoComprobante, serie)
      setNumero(data.siguiente_numero)
    } catch (e) {
      if (e instanceof ApiClientError) console.error('Error fetching correlativo:', e.detail)
      else console.error(e)
    }
  }

  useEffect(() => {
    fetchCorrelativo()
  }, [tipoComprobante, serie])

  const fetchComprobantesReferenciables = async () => {
    try {
      const data = await api.listar()
      const ref = data.comprobantes.filter(
        c => c.tipo_comprobante === TIPO_FACTURA || c.tipo_comprobante === TIPO_BOLETA
      )
      setComprobantesReferenciables(ref)
    } catch (e) {
      console.error('Error cargando comprobantes referenciables:', e)
    }
  }

  const handleSelectTab = (tipo: string) => {
    setTipoComprobante(tipo)
    setErrorMsg('')
    setDocBadge(null)
    // Reset completo — nada se arrastra entre tabs
    setItems([])
    setNewDesc('')
    setNewPrecio('')
    setNewCantidad('1')
    setModoIgv('INC')
    setDescuentoGlobal('0')
    setAnticipoTotal('0')
    setMontoAjuste('')
    setReferenciaId('')
    setMotivoNota('')
    setObservacionesNota('')

    if (tipo === TIPO_FACTURA) {
      setSerie(SERIE_FACTURA)
      setClienteTipoDoc('6')
      setClienteNumDoc('')
      setClienteRazonSocial('')
      setClienteDireccion('')
    } else if (tipo === TIPO_BOLETA) {
      setSerie(SERIE_BOLETA)
      setClienteTipoDoc('0')
      setClienteNumDoc('00000000')
      setClienteRazonSocial('CLIENTES VARIOS')
      setClienteDireccion('')
    } else {
      // NC/ND — la serie la define el comprobante referencia
      setSerie(SERIE_FACTURA)
      setClienteTipoDoc('6')
      setClienteNumDoc('')
      setClienteRazonSocial('')
      setClienteDireccion('')
      fetchComprobantesReferenciables()
    }
  }

  const handleSelectTipoDoc = (tipo: string) => {
    setClienteTipoDoc(tipo)
    setErrorMsg('')
    setDocBadge(null)

    if (tipo === '0') {
      setClienteNumDoc('00000000')
      setClienteRazonSocial('CLIENTES VARIOS')
      setClienteDireccion('')
    } else {
      setClienteNumDoc('')
      setClienteRazonSocial('')
      setClienteDireccion('')
    }
  }

  const handleNumDocChange = (val: string) => {
    setClienteNumDoc(val)
    if (val.trim() === '') {
      setClienteRazonSocial('')
      setClienteDireccion('')
      setDocBadge(null)
    }
  }

  const handleConsultarDoc = async (numDoc: string) => {
    const docClean = numDoc.trim()
    if (docClean.length !== 8 && docClean.length !== 11) return

    setIsSearchingDoc(true)
    setDocBadge(null)

    try {
      const data: DocLookupResponse = await api.consultarDoc(docClean)

      if (data.found && data.razon_social) {
        setClienteRazonSocial(data.razon_social)
        setClienteDireccion(data.direccion || '')
        const srcText = data.source === 'DATABASE' ? 'En base de datos' : (data.tipo_doc === '6' ? 'SUNAT' : 'RENIEC')
        setDocBadge(`✓ ${srcText}`)
        setErrorMsg('')
      } else {
        setClienteRazonSocial('')
        setClienteDireccion('')
        setDocBadge('✗ No encontrado en padrón')
      }
    } catch (err) {
      console.error('Error consultando RUC/DNI:', err)
      setClienteRazonSocial('')
      setClienteDireccion('')
      setDocBadge('✗ Error en búsqueda')
    } finally {
      setIsSearchingDoc(false)
    }
  }

  useEffect(() => {
    if (clienteTipoDoc !== '0' && clienteNumDoc !== '00000000' && (clienteNumDoc.length === 8 || clienteNumDoc.length === 11)) {
      const timer = setTimeout(() => {
        handleConsultarDoc(clienteNumDoc)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [clienteNumDoc, clienteTipoDoc])

  const handleAddItem = () => {
    if (!newDesc || !newPrecio || parseFloat(newPrecio) <= 0) return
    
    const cant = parseFloat(newCantidad) > 0 ? parseFloat(newCantidad) : 1
    const monto = parseFloat(newPrecio)

    let valU = 0
    let precU = 0

    if (tipoComprobante === '01' && modoIgv === 'SIN') {
      valU = monto
      precU = monto * 1.18
    } else {
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
        unidad_medida: 'NIU',
        monto_ingresado: monto,
        modo_ingreso: modoIgv
      }
    ])
    setNewDesc('')
    setNewPrecio('')
    setNewCantidad('1')
    fetchCorrelativo()
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleEditItem = (index: number) => {
    const item = items[index]
    setNewDesc(item.descripcion)
    
    if (item.monto_ingresado !== undefined) {
      setNewPrecio(item.monto_ingresado.toString())
      setModoIgv(item.modo_ingreso || 'INC')
    } else {
      setNewPrecio(item.precio_unitario.toFixed(2))
      setModoIgv('INC')
    }
    
    setNewCantidad(item.cantidad.toString())
    setItems(items.filter((_, i) => i !== index))
  }

  const subtotalGravadoBruto = items.reduce((acc, item) => acc + (item.valor_unitario * item.cantidad), 0)
  const valDescuento = parseFloat(descuentoGlobal) > 0 ? parseFloat(descuentoGlobal) : 0
  const valAnticipo = parseFloat(anticipoTotal) > 0 ? parseFloat(anticipoTotal) : 0

  const subtotalGravadoNeto = Math.max(0, subtotalGravadoBruto - valDescuento)
  const totalIgvCalculado = subtotalGravadoNeto * 0.18
  const totalImporteCalculado = Math.max(0, subtotalGravadoNeto + totalIgvCalculado - valAnticipo)

  // Valores derivados para NC/ND (independientes de items[])
  const montoAjusteNum = parseFloat(montoAjuste) || 0
  const baseGravadaNcNd = montoAjusteNum / 1.18
  const igvNcNdCalculado = baseGravadaNcNd * 0.18
  const totalNcNd = montoAjusteNum

  const boletaAlerta700 = tipoComprobante === '03' && totalImporteCalculado > 700.0 && (!clienteNumDoc || clienteNumDoc === '00000000')

  const [isPreview, setIsPreview] = useState(true)
  const [isEmitting, setIsEmitting] = useState(false)

  const handleAbrirPreview = () => {
    const ncNd = isNcNd(tipoComprobante)
    let refSerieNumero: string | undefined

    // Validaciones para Factura/Boleta
    if (!ncNd) {
      if (tipoComprobante === '01' && (clienteNumDoc.length !== 11 || docBadge?.startsWith('✗'))) {
        setErrorMsg('Para Factura Electrónica es obligatorio un RUC válido de 11 dígitos, encontrado en el padrón.')
        return
      }
      if (items.length === 0) {
        setErrorMsg('Agrega al menos un producto o servicio.')
        return
      }
      if (boletaAlerta700) {
        setErrorMsg('Norma SUNAT: el total supera los S/ 700.00. Es obligatorio registrar DNI/RUC y nombre del comprador.')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      if (tipoComprobante === '01' && clienteTipoDoc !== '6') {
        setErrorMsg('Las facturas electrónicas se emiten exclusivamente a receptores con RUC de 11 dígitos.')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
    } else {
      // Validaciones para NC/ND
      if (comprobantesReferenciables.length === 0) {
        setErrorMsg('Aún no tienes comprobantes emitidos. Emite primero una factura o boleta para poder generar una nota.')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      const ref = comprobantesReferenciables.find(c => c.id === referenciaId)
      if (!ref) {
        setErrorMsg('Selecciona el comprobante original al que aplica la nota.')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      if (!motivoNota) {
        setErrorMsg('El motivo de la nota es obligatorio.')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      if (totalNcNd <= 0) {
        setErrorMsg('El monto a ajustar debe ser mayor a cero.')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      // Sincroniza cliente con el del comprobante referencia (NC/ND conserva cliente)
      setClienteNumDoc(ref.cliente_num_doc || '00000000')
      setClienteRazonSocial(ref.cliente_razon_social || 'CLIENTES VARIOS')
      setClienteDireccion(ref.cliente_direccion || '')
      refSerieNumero = ref.serie_numero
    }

    setErrorMsg('')
    // Para NC/ND el número final lo asigna el backend — el preview lo declara honestamente
    const seriePreview = ncNd ? '—' : serie
    const numeroPreview = ncNd ? '—' : String(numero).padStart(8, '0')
    const serieNumeroPreview = `${seriePreview}-${numeroPreview}`
    setComprobanteEmitido({
      serieNumero: serieNumeroPreview,
      tipoComprobanteNombre: TIPO_NOMBRE_COMPLETO[tipoComprobante] || 'COMPROBANTE',
      fechaEmision: new Date().toLocaleDateString('es-PE'),
      emisorRazonSocial: emisorRazonSocial,
      emisorRuc: emisorRuc,
      emisorDireccion: emisorDireccion,
      clienteRazonSocial: clienteRazonSocial,
      clienteRuc: clienteNumDoc,
      clienteDireccion: clienteDireccion,
      items: ncNd
        ? [{
            descripcion: `${motivoNota}${observacionesNota ? ' — ' + observacionesNota : ''}`,
            cantidad: 1,
            valor_unitario: baseGravadaNcNd,
            precio_unitario: montoAjusteNum,
            unidad_medida: 'ZZ',
            monto_ingresado: montoAjusteNum,
            modo_ingreso: 'INC'
          }]
        : items,
      opGravada: ncNd ? baseGravadaNcNd : subtotalGravadoNeto,
      descuento: ncNd ? 0 : valDescuento,
      anticipo: ncNd ? 0 : valAnticipo,
      igv: ncNd ? igvNcNdCalculado : totalIgvCalculado,
      montoTotal: ncNd ? totalNcNd : totalImporteCalculado,
      hashCpe: '',
      comprobanteReferencia: ncNd ? refSerieNumero : undefined,
    })
    setIsPreview(true)
    setModalOpen(true)
  }

  const handleConfirmarEmitir = async () => {
    setIsEmitting(true)
    try {
      const ncNd = isNcNd(tipoComprobante)

      let itemsPayload: DetalleItemIn[]
      const payload: Record<string, unknown> = {
        tipo_comprobante: tipoComprobante,
        serie,
        numero,
        cliente_tipo_doc: clienteTipoDoc,
        cliente_num_doc: clienteNumDoc,
        cliente_razon_social: clienteRazonSocial,
        cliente_direccion: clienteDireccion || undefined,
        moneda: 'PEN',
        metodo_pago: 'EFECTIVO',
      }

      if (ncNd) {
        const ref = comprobantesReferenciables.find(c => c.id === referenciaId)
        if (!ref) throw new Error('Falta comprobante referencia')
        const [serieRef, numeroRef] = ref.serie_numero.split('-')
        itemsPayload = [{
          codigo: 'NC01',
          descripcion: `${motivoNota}${observacionesNota ? ' — ' + observacionesNota : ''}`,
          unidad_medida: 'ZZ',
          cantidad: 1,
          precio_unitario: montoAjusteNum,
        }]
        payload.serie = ref.tipo_comprobante === TIPO_FACTURA ? SERIE_FACTURA : SERIE_BOLETA
        payload.numero = 0  // backend reserva el real vía next_correlativo de NC/ND
        payload.items = itemsPayload
        payload.comprobante_referencia_tipo = ref.tipo_comprobante
        payload.comprobante_referencia_serie = serieRef
        payload.comprobante_referencia_numero = parseInt(numeroRef, 10)
        payload.motivo = motivoNota
      } else {
        itemsPayload = items.map((item, idx) => ({
          codigo: `PROD${String(idx + 1).padStart(2, '0')}`,
          descripcion: item.descripcion,
          unidad_medida: item.unidad_medida,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
        }))
        payload.descuento_global = valDescuento || undefined
        payload.anticipo_total = valAnticipo || undefined
        payload.items = itemsPayload
      }

      const data = await api.emitir(payload as unknown as Parameters<typeof api.emitir>[0])

      setComprobanteEmitido(prev => prev ? {
        ...prev,
        serieNumero: data.comprobante || prev.serieNumero,
        hashCpe: data.hash_cpe || '',
        estadoSunat: data.estado_sunat || '',
      } : null)

      setIsPreview(false)
      if (!ncNd) setNumero(n => n + 1)
    } catch (err: unknown) {
      const msg = err instanceof ApiClientError ? err.detail : err instanceof Error ? err.message : 'Ocurrió un error al procesar el comprobante.'
      setErrorMsg(`Error al emitir: ${msg}`)
      setModalOpen(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setIsEmitting(false)
    }
  }

  return (
    <main className={`${sourceSerif.variable} flex-1 max-w-[1100px] w-full mx-auto px-5 md:px-10 py-8 md:py-14 space-y-5 md:space-y-6`}>
      {/* Header */}
      <header className="flex flex-col gap-4 pb-6 border-b border-[var(--border)] animate-fade-in-up">
        <div>
          <div className="text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--accent)] mb-2">
            Emisión
          </div>
          <h1 className="font-[family-name:var(--font-source-serif-4)] text-[28px] md:text-[36px] font-medium leading-[1.1] tracking-[var(--tracking-heading)] text-[var(--fg)]">
            Nuevo comprobante
          </h1>
          <p className="text-[13px] md:text-[14px] text-[var(--muted)] mt-1.5">
            Selecciona el tipo y completa los datos del receptor.
          </p>
        </div>

        {/* Tabs Factura / Boleta / NC / ND — segmented sober */}
        <div className="flex gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-sm)] w-full sm:w-fit overflow-x-auto" role="tablist" aria-label="Tipo de comprobante">
          <button
            type="button"
            role="tab"
            id="tab-factura"
            aria-selected={tipoComprobante === TIPO_FACTURA}
            aria-controls="panel-cliente"
            onClick={() => handleSelectTab(TIPO_FACTURA)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-[13px] font-medium rounded-[6px] transition-colors whitespace-nowrap ${
              tipoComprobante === TIPO_FACTURA
                ? 'bg-[var(--bg)] text-[var(--fg)] shadow-[var(--shadow-card)]'
                : 'text-[var(--muted)] hover:text-[var(--fg-2)]'
            }`}
          >
            <FileText className="h-4 w-4" strokeWidth={1.5} />
            <span>Factura · F001</span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-boleta"
            aria-selected={tipoComprobante === TIPO_BOLETA}
            aria-controls="panel-cliente"
            onClick={() => handleSelectTab(TIPO_BOLETA)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-[13px] font-medium rounded-[6px] transition-colors whitespace-nowrap ${
              tipoComprobante === TIPO_BOLETA
                ? 'bg-[var(--bg)] text-[var(--fg)] shadow-[var(--shadow-card)]'
                : 'text-[var(--muted)] hover:text-[var(--fg-2)]'
            }`}
          >
            <Receipt className="h-4 w-4" strokeWidth={1.5} />
            <span>Boleta · B001</span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-nc"
            aria-selected={tipoComprobante === TIPO_NC}
            aria-controls="panel-cliente"
            onClick={() => handleSelectTab(TIPO_NC)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-[13px] font-medium rounded-[6px] transition-colors whitespace-nowrap ${
              tipoComprobante === TIPO_NC
                ? 'bg-[var(--bg)] text-[var(--fg)] shadow-[var(--shadow-card)]'
                : 'text-[var(--muted)] hover:text-[var(--fg-2)]'
            }`}
          >
            <Receipt className="h-4 w-4" strokeWidth={1.5} />
            <span>Nota de crédito</span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-nd"
            aria-selected={tipoComprobante === TIPO_ND}
            aria-controls="panel-cliente"
            onClick={() => handleSelectTab(TIPO_ND)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-[13px] font-medium rounded-[6px] transition-colors whitespace-nowrap ${
              tipoComprobante === TIPO_ND
                ? 'bg-[var(--bg)] text-[var(--fg)] shadow-[var(--shadow-card)]'
                : 'text-[var(--muted)] hover:text-[var(--fg-2)]'
            }`}
          >
            <FileText className="h-4 w-4" strokeWidth={1.5} />
            <span>Nota de débito</span>
          </button>
        </div>
      </header>

      {/* Card Emisor */}
      <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-[var(--r-md)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-[var(--r-sm)] bg-[var(--bg)] border border-[var(--border)] grid place-items-center">
            <Building className="h-5 w-5 text-[var(--fg-2)]" strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[var(--muted)] tracking-[var(--tracking-caps)] uppercase">Emisor</div>
            <div className="text-[14px] font-medium text-[var(--fg)] flex items-center gap-2">
              <span>{emisorRazonSocial}</span>
              <span className="text-[12px] text-[var(--muted)] font-[family-name:var(--font-geist-mono)]">RUC {emisorRuc}</span>
            </div>
            <div className="text-[12px] text-[var(--muted-2)]">{emisorDireccion}</div>
          </div>
        </div>
        <div className="text-right">
          <span className="font-[family-name:var(--font-geist-mono)] text-[12px] font-medium px-2.5 py-1 rounded-[var(--r-pill)] bg-[var(--bg)] border border-[var(--border)] text-[var(--fg-2)]">
            {isNcNd(tipoComprobante) ? 'Se asignará al emitir' : `${serie}-${String(numero).padStart(8, '0')}`}
          </span>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="bg-[var(--danger-soft)] border border-[var(--danger)]/20 text-[var(--danger)] p-4 rounded-[var(--r-sm)] text-[13px] flex items-center gap-3" role="alert" aria-live="assertive">
          <ShieldAlert className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div id="panel-cliente" role="tabpanel" aria-labelledby={
        tipoComprobante === TIPO_FACTURA ? 'tab-factura'
        : tipoComprobante === TIPO_BOLETA ? 'tab-boleta'
        : tipoComprobante === TIPO_NC ? 'tab-nc'
        : 'tab-nd'
      }>
      {/* Sección exclusiva de NC/ND — comprobante referenciado + motivo + monto */}
      {isNcNd(tipoComprobante) && (
        <div className="space-y-5 md:space-y-6 animate-fade-in-up animate-delay-1">
          {/* Comprobante referenciado */}
          <section className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] p-5 md:p-6 space-y-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 pb-4 border-b border-[var(--border-soft)]">
              <Building className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.5} aria-hidden="true" />
              <h2 className="text-[15px] font-semibold text-[var(--fg)] tracking-tight">Comprobante original</h2>
            </div>

            {comprobantesReferenciables.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[14px] font-medium text-[var(--fg-2)] mb-1">Sin comprobantes referenciables</p>
                <p className="text-[13px] text-[var(--muted)] max-w-[44ch] mx-auto">
                  Emite primero un comprobante ({ serie }) para poder vincularlo a esta nota.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">
                  Selecciona comprobante <span className="text-[var(--danger)]">*</span>
                </label>
                <select
                  value={referenciaId}
                  onChange={(e) => { setReferenciaId(e.target.value); setErrorMsg('') }}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] pl-3 pr-9 py-2.5 text-[14px] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors duration-[var(--dur-fast)] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23767670%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[position:right_8px_center] bg-no-repeat"
                >
                  <option value="">— Selecciona —</option>
                  {comprobantesReferenciables.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.serie_numero} · {c.tipo_comprobante === TIPO_FACTURA ? 'Factura' : 'Boleta'} · {c.cliente_razon_social || 'Cliente'} · S/ {c.importe_total.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          {/* Motivo + monto a ajustar */}
          <section className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] p-5 md:p-6 space-y-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 pb-4 border-b border-[var(--border-soft)]">
              <ClipboardList className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.5} aria-hidden="true" />
              <h2 className="text-[15px] font-semibold text-[var(--fg)] tracking-tight">Datos de la nota</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">
                  Motivo <span className="text-[var(--danger)]">*</span>
                </label>
                <select
                  value={motivoNota}
                  onChange={(e) => { setMotivoNota(e.target.value); setErrorMsg('') }}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] pl-3 pr-9 py-2.5 text-[14px] text-[var(--fg)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors duration-[var(--dur-fast)] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23767670%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[position:right_8px_center] bg-no-repeat"
                >
                  <option value="">— Selecciona un motivo —</option>
                  {(tipoComprobante === TIPO_NC ? MOTIVOS_NC : MOTIVOS_ND).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Descripción / Observaciones</label>
                <textarea
                  rows={3}
                  value={observacionesNota}
                  onChange={(e) => setObservacionesNota(e.target.value)}
                  placeholder="Detalle el motivo de la nota (opcional)..."
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 text-[14px] text-[var(--fg)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors duration-[var(--dur-fast)] resize-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">
                  Monto a ajustar (S/) <span className="text-[var(--danger)]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={montoAjuste}
                    onChange={(e) => {
                      setMontoAjuste(e.target.value)
                      setErrorMsg('')
                    }}
                    placeholder="0.00"
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 pr-9 text-[14px] text-[var(--fg)] font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors duration-[var(--dur-fast)]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[var(--muted-2)] font-[family-name:var(--font-geist-mono)] pointer-events-none">S/</span>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">IGV (18%) — informativo</label>
                <input
                  type="text"
                  readOnly
                  value={montoAjusteNum > 0 ? `S/ ${igvNcNdCalculado.toFixed(2)}` : ''}
                  placeholder="S/ 0.00"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 text-[14px] text-[var(--muted)] font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--muted-2)]"
                />
              </div>
            </div>
          </section>

          {/* Totales NC/ND */}
          <section className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] p-5 md:p-6 space-y-4 shadow-[var(--shadow-card)]">
            <div className="flex justify-between w-full text-[15px] font-semibold text-[var(--fg)] pt-1">
              <span>Importe total de la nota</span>
              <span className="font-[family-name:var(--font-geist-mono)] text-[var(--accent)]">S/ {totalNcNd.toFixed(2)}</span>
            </div>
          </section>
        </div>
      )}

      {/* Cliente (solo Factura/Boleta — en NC/ND el cliente se hereda del referencia) */}
      {!isNcNd(tipoComprobante) && (
      <>
      <div className="animate-fade-in-up animate-delay-1">
      <ClientForm
        tipoComprobante={tipoComprobante}
        clienteTipoDoc={clienteTipoDoc}
        clienteNumDoc={clienteNumDoc}
        clienteRazonSocial={clienteRazonSocial}
        clienteDireccion={clienteDireccion}
        isSearchingDoc={isSearchingDoc}
        docBadge={docBadge}
        onSelectTipoDoc={handleSelectTipoDoc}
        onNumDocChange={handleNumDocChange}
        onConsultarDoc={() => handleConsultarDoc(clienteNumDoc)}
        onRazonSocialChange={setClienteRazonSocial}
        onDireccionChange={setClienteDireccion}
      />
      </div>

      {/* Detalle / Items */}
      <section className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] p-5 md:p-6 space-y-4 md:space-y-5 shadow-[var(--shadow-card)] animate-fade-in-up animate-delay-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-soft)]">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.5} aria-hidden="true" />
            <h2 className="text-[15px] font-semibold text-[var(--fg)] tracking-tight">Detalle de la operación</h2>
          </div>

          {tipoComprobante === '01' && (
            <div className="flex items-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border-soft)] rounded-[var(--r-sm)] text-[12px]">
              <span className="px-2 text-[var(--muted-2)]">Modo precio</span>
              <button
                type="button"
                onClick={() => setModoIgv('INC')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  modoIgv === 'INC' ? 'bg-[var(--bg)] text-[var(--fg)] shadow-[var(--shadow-card)]' : 'text-[var(--muted)] hover:text-[var(--fg-2)]'
                }`}
              >
                Incluido IGV
              </button>
              <button
                type="button"
                onClick={() => setModoIgv('SIN')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  modoIgv === 'SIN' ? 'bg-[var(--bg)] text-[var(--fg)] shadow-[var(--shadow-card)]' : 'text-[var(--muted)] hover:text-[var(--fg-2)]'
                }`}
              >
                Sin IGV
              </button>
            </div>
          )}
        </div>

        {/* Form agregar ítem */}
            <div className="bg-[var(--surface)] p-3 md:p-3.5 rounded-[var(--r-sm)] border border-[var(--border)] space-y-3 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3 sm:items-end">
          <div className="sm:col-span-6">
            <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Descripción</label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Descripción del bien o servicio"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 text-[14px] text-[var(--fg)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors duration-[var(--dur-fast)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:contents">
            <div className="sm:col-span-2">
              <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Cant.</label>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                step="any"
                value={newCantidad}
                onChange={(e) => setNewCantidad(e.target.value)}
                placeholder="1"
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 text-[14px] text-[var(--fg)] font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors duration-[var(--dur-fast)] text-center"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Monto S/</label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={newPrecio}
                onChange={(e) => setNewPrecio(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 text-[14px] text-[var(--fg)] font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors duration-[var(--dur-fast)]"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full bg-[var(--fg)] hover:bg-[var(--fg-hover)] text-white text-[13px] font-medium py-2 rounded-[var(--r-sm)] inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} /> Agregar
            </button>
          </div>
        </div>

        {/* Items */}
        {items.length > 0 ? (
          <>
            {/* Vista móvil: cards */}
            <div className="sm:hidden space-y-2">
              {items.map((item, idx) => {
                const totalItem = item.precio_unitario * item.cantidad
                return (
                  <div key={idx} className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-sm)] p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-[var(--fg)] truncate">{item.descripcion}</p>
                      <p className="text-[12px] text-[var(--muted)] mt-0.5">
                        {item.cantidad} × S/ {item.precio_unitario.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <span className="text-[14px] font-medium text-[var(--fg)] font-[family-name:var(--font-geist-mono)]">S/ {totalItem.toFixed(2)}</span>
                      <div className="inline-flex items-center gap-0.5">
                        <button type="button" onClick={() => handleEditItem(idx)} className="h-7 w-7 grid place-items-center rounded-[var(--r-sm)] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--bg)] transition-colors" aria-label="Editar ítem">
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        <button type="button" onClick={() => handleRemoveItem(idx)} className="h-7 w-7 grid place-items-center rounded-[var(--r-sm)] text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--bg)] transition-colors" aria-label="Eliminar ítem">
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Vista desktop: tabla */}
            <div className="hidden sm:block overflow-x-auto border border-[var(--border)] rounded-[var(--r-sm)] shadow-[var(--shadow-card)]">
              <table className="w-full text-left min-w-[580px]">
                <thead className="bg-[var(--surface)] border-b border-[var(--border)]">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--muted)]">Descripción</th>
                    <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--muted)] text-center">Cant.</th>
                    <th scope="col" className="-px-4 py-2.5 text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--muted)] text-right">Valor U.</th>
                    <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--muted)] text-right">Precio U.</th>
                    <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold tracking-[var(--tracking-caps)] uppercase text-[var(--muted)] text-right">Total</th>
                    <th scope="col" className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {items.map((item, idx) => {
                    const totalItem = item.precio_unitario * item.cantidad
                    return (
                      <tr key={idx} className="hover:bg-[var(--surface)] transition-colors">
                        <td className="px-4 py-3 text-[14px] font-medium text-[var(--fg)]">{item.descripcion}</td>
                        <td className="px-4 py-3 text-center font-[family-name:var(--font-geist-mono)] text-[13px] text-[var(--fg-2)]">{item.cantidad}</td>
                        <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] text-[13px] text-[var(--muted)]">S/ {item.valor_unitario.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] text-[13px] text-[var(--fg-2)]">S/ {item.precio_unitario.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-[family-name:var(--font-geist-mono)] text-[14px] font-medium text-[var(--fg)]">S/ {totalItem.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-0.5">
                            <button type="button" onClick={() => handleEditItem(idx)} className="h-7 w-7 grid place-items-center rounded-[var(--r-sm)] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface)] transition-colors" title="Editar ítem" aria-label="Editar ítem">
                              <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                            <button type="button" onClick={() => handleRemoveItem(idx)} className="h-7 w-7 grid place-items-center rounded-[var(--r-sm)] text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--surface)] transition-colors" title="Eliminar ítem" aria-label="Eliminar ítem">
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="py-10 text-center border border-dashed border-[var(--border-strong)] rounded-[var(--r-sm)]">
            <div className="h-10 w-10 mx-auto rounded-full bg-[var(--surface)] grid place-items-center mb-3">
              <ClipboardList className="h-5 w-5 text-[var(--muted-2)]" strokeWidth={1.5} />
            </div>
            <p className="text-[14px] font-medium text-[var(--fg-2)] mb-1">Sin ítems agregados</p>
            <p className="text-[13px] text-[var(--muted)] max-w-[40ch] mx-auto">Completa el formulario de arriba para añadir productos o servicios a tu comprobante.</p>
          </div>
        )}

        {/* Opciones avanzadas (solo Factura) */}
        {tipoComprobante === '01' && (
          <div className="bg-[var(--surface)] p-4 rounded-[var(--r-sm)] border border-[var(--border)] space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-[var(--tracking-caps)]">
              <Percent className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Descuentos & anticipos</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Descuento global (S/)</label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={descuentoGlobal}
                    onChange={(e) => setDescuentoGlobal(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 pr-9 text-[14px] text-[var(--fg)] font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors duration-[var(--dur-fast)]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[var(--muted-2)] font-[family-name:var(--font-geist-mono)] pointer-events-none">S/</span>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5 tracking-[var(--tracking-small)]">Anticipo recibido (S/)</label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={anticipoTotal}
                    onChange={(e) => setAnticipoTotal(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-2.5 pr-9 text-[14px] text-[var(--fg)] font-[family-name:var(--font-geist-mono)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] transition-colors duration-[var(--dur-fast)]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[var(--muted-2)] font-[family-name:var(--font-geist-mono)] pointer-events-none">S/</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Totales */}
        <div className="flex flex-col items-end pt-3 border-t border-[var(--border-soft)] text-[13px] space-y-1.5">
          <div className="flex justify-between w-full sm:w-64 text-[var(--muted)]">
            <span>Op. gravada bruta</span>
            <span className="font-[family-name:var(--font-geist-mono)] text-[var(--fg-2)]">S/ {subtotalGravadoBruto.toFixed(2)}</span>
          </div>

          {valDescuento > 0 && (
            <div className="flex justify-between w-full sm:w-64 text-[var(--danger)]">
              <span>(-) Descuento global</span>
              <span className="font-[family-name:var(--font-geist-mono)]">- S/ {valDescuento.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between w-full sm:w-64 text-[var(--fg-2)] font-medium">
            <span>Base imponible neta</span>
            <span className="font-[family-name:var(--font-geist-mono)]">S/ {subtotalGravadoNeto.toFixed(2)}</span>
          </div>

          <div className="flex justify-between w-full sm:w-64 text-[var(--muted)]">
            <span>IGV (18%)</span>
            <span className="font-[family-name:var(--font-geist-mono)] text-[var(--fg-2)]">S/ {totalIgvCalculado.toFixed(2)}</span>
          </div>

          {valAnticipo > 0 && (
            <div className="flex justify-between w-full sm:w-64 text-[var(--muted)]">
              <span>(-) Anticipo</span>
              <span className="font-[family-name:var(--font-geist-mono)]">- S/ {valAnticipo.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between w-full sm:w-64 text-[15px] font-semibold text-[var(--fg)] pt-2 border-t border-[var(--border-soft)] mt-1.5">
            <span>Importe total</span>
            <span className="font-[family-name:var(--font-geist-mono)] text-[var(--accent)]">S/ {totalImporteCalculado.toFixed(2)}</span>
          </div>
        </div>
      </section>
      </>
      )}
      {/* Fin bloque Factura/Boleta */}

      {/* CTA — sobrio, no grito */}
      <div className="pt-2 animate-fade-in-up animate-delay-3">
        <button
          type="button"
          onClick={handleAbrirPreview}
          disabled={(!isNcNd(tipoComprobante) && items.length === 0)}
          className="w-full bg-[var(--fg)] hover:bg-[var(--fg-hover)] text-white text-[15px] font-medium py-3.5 rounded-[var(--r-sm)] inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed press-feedback"
        >
          <Send className="h-4 w-4" strokeWidth={1.5} />
          {isNcNd(tipoComprobante) ? (
            <span>Vista previa y emisión · Se asignará al emitir</span>
          ) : (
            <span>Vista previa y emisión · {serie}-{String(numero).padStart(8, '0')}</span>
          )}
        </button>
      </div>
      </div>

      {modalOpen && comprobanteEmitido && (
        <TicketModal
          isOpen={modalOpen}
          isPreview={isPreview}
          isEmitting={isEmitting}
          onClose={() => setModalOpen(false)}
          onConfirmEmit={handleConfirmarEmitir}
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
            igv: comprobanteEmitido.igv,
            montoTotal: comprobanteEmitido.montoTotal,
            hashCpe: comprobanteEmitido.hashCpe,
            estadoSunat: comprobanteEmitido.estadoSunat,
            comprobanteReferencia: comprobanteEmitido.comprobanteReferencia,
            items: comprobanteEmitido.items.map(i => ({
              descripcion: i.descripcion,
              cantidad: i.cantidad,
              total: i.precio_unitario * i.cantidad,
              precio_unitario: i.precio_unitario,
            })),
          }}
        />
      )}
    </main>
  )
}
