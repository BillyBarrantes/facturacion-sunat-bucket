export type LineItem = {
  descripcion: string
  cantidad: number
  valor_unitario: number
  precio_unitario: number
  unidad_medida: string
  monto_ingresado?: number
  modo_ingreso?: 'INC' | 'SIN'
}

export type ComprobantePreview = {
  tipoComprobanteNombre: string
  serieNumero: string
  fechaEmision: string
  emisorRazonSocial: string
  emisorRuc: string
  emisorDireccion: string
  clienteRazonSocial: string
  clienteRuc: string
  clienteDireccion: string
  items: LineItem[]
  opGravada: number
  descuento: number
  anticipo: number
  igv: number
  montoTotal: number
  hashCpe: string
}
