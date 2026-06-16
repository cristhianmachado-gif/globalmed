// ─── TIPOS FINANCIEROS ────────────────────────────────────────────────────────

export type FormaPago = 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque' | 'debito_automatico'
export type EstadoCobro = 'pendiente' | 'cobrado' | 'parcial' | 'eximido'
export type EstadoSenia = 'cobrada' | 'aplicada' | 'retenida' | 'devuelta'
export type EstadoLiquidacion = 'borrador' | 'presentada' | 'pagada' | 'con_diferencias' | 'cancelada'
export type EstadoGasto = 'pagado' | 'pendiente' | 'vencido'
export type TipoGasto = 'fijo' | 'variable' | 'extraordinario'
export type OrigenDistribucion = 'coseguro' | 'particular' | 'os'

export interface AcuerdoProfesional {
  id: string
  profesional_id: string
  pct_prof_particular: number
  pct_prof_coseguro: number
  pct_prof_os: number
  vigente_desde: string
  created_at: string
}

export interface Arancel {
  id: string
  profesional_id: string
  profesional?: { nombre: string; apellido: string }
  obra_social_id?: string
  obra_social?: { nombre: string }
  tipo_turno: string
  precio_os: number
  coseguro: number
  activo: boolean
  created_at: string
}

export interface Senia {
  id: string
  paciente_id: string
  paciente?: { nombre: string; apellido: string; dni: string }
  turno_id?: string
  turno?: { fecha: string; hora: string }
  monto: number
  forma_pago: FormaPago
  estado: EstadoSenia
  fecha_cobro: string
  devolucion_autorizada: boolean
  devolucion_autorizada_por?: string
  devolucion_fecha?: string
  motivo_devolucion?: string
  cobrado_por?: string
  observaciones?: string
  created_at: string
}

export interface CobroPaciente {
  id: string
  turno_id: string
  turno?: {
    fecha: string; hora: string
    paciente?: { nombre: string; apellido: string; dni: string }
    profesional?: { nombre: string; apellido: string }
  }
  concepto: 'coseguro' | 'particular'
  monto_esperado: number
  senia_aplicada: number
  monto_cobrado: number
  saldo_pendiente: number
  forma_pago?: FormaPago
  estado: EstadoCobro
  fecha_cobro?: string
  cobrado_por?: string
  observaciones?: string
  created_at: string
}

export interface Liquidacion {
  id: string
  obra_social_id: string
  obra_social?: { nombre: string }
  periodo_mes: number
  periodo_anio: number
  total_prestaciones: number
  total_facturado: number
  estado: EstadoLiquidacion
  fecha_presentacion?: string
  numero_liquidacion?: string
  observaciones?: string
  created_at: string
  items?: LiquidacionItem[]
  pagos?: PagoOS[]
}

export interface LiquidacionItem {
  id: string
  liquidacion_id: string
  turno_id: string
  turno?: {
    fecha: string; hora: string
    paciente?: { nombre: string; apellido: string; dni: string }
    profesional?: { nombre: string; apellido: string }
  }
  arancel_aplicado: number
  estado: 'incluido' | 'debitado' | 'objetado'
  motivo_debito?: string
}

export interface PagoOS {
  id: string
  liquidacion_id: string
  obra_social_id: string
  obra_social?: { nombre: string }
  monto_facturado: number
  monto_pagado: number
  diferencia: number
  fecha_pago: string
  numero_pago?: string
  observaciones?: string
  created_at: string
}

export interface Distribucion {
  id: string
  turno_id: string
  profesional_id: string
  profesional?: { nombre: string; apellido: string }
  origen: OrigenDistribucion
  monto_total: number
  pct_profesional: number
  monto_profesional: number
  pct_centro: number
  monto_centro: number
  estado: 'pendiente' | 'liquidado' | 'pagado_al_prof'
  fecha_liquidacion?: string
}

export interface CategoriaGasto {
  id: string
  nombre: string
  tipo: TipoGasto
  color: string
  activa: boolean
  orden: number
}

export interface Gasto {
  id: string
  fecha: string
  categoria_id: string
  categoria?: CategoriaGasto
  concepto: string
  monto: number
  forma_pago: FormaPago
  comprobante_nro?: string
  estado: EstadoGasto
  fecha_vencimiento?: string
  es_recurrente: boolean
  recurrencia_dia?: number
  gasto_padre_id?: string
  registrado_por?: string
  observaciones?: string
  created_at: string
}

// ─── TIPOS PARA VISTAS / REPORTES ─────────────────────────────────────────────

export interface ResumenMensual {
  mes: string
  total_coseguros: number
  total_particulares: number
  total_cobros: number
}

export interface CuentaCorrienteOS {
  obra_social_id: string
  obra_social: string
  total_liquidaciones: number
  total_facturado: number
  total_cobrado: number
  saldo_pendiente: number
}

export interface ProduccionProfesional {
  profesional_id: string
  profesional: string
  especialidad: string
  total_prestaciones: number
  total_generado: number
  honorarios_profesional: number
  ingreso_centro: number
}

export interface DashboardFinanciero {
  // Ingresos del mes
  cobros_mes: number
  cobros_coseguros: number
  cobros_particulares: number
  cobros_os: number
  // Gastos del mes
  gastos_mes: number
  gastos_por_categoria: { categoria: string; total: number; color: string }[]
  // Resultado
  resultado_neto: number
  // Pendientes
  saldo_os_pendiente: number
  senias_pendientes: number
  gastos_vencidos: number
  // Serie temporal (últimos 6 meses)
  serie_ingresos: { mes: string; total: number }[]
  serie_gastos: { mes: string; total: number }[]
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export const FORMA_PAGO_LABEL: { [key: string]: string } = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  cheque: 'Cheque',
  debito_automatico: 'Débito automático',
}

export const ESTADO_COBRO_LABEL: { [key: string]: string } = {
  pendiente: 'Pendiente', cobrado: 'Cobrado', parcial: 'Pago parcial', eximido: 'Eximido',
}

export const ESTADO_COBRO_COLOR: { [key: string]: string } = {
  pendiente: 'bg-orange-100 text-orange-700',
  cobrado:   'bg-green-100 text-green-700',
  parcial:   'bg-blue-100 text-blue-700',
  eximido:   'bg-gray-100 text-gray-500',
}

export const ESTADO_SENIA_LABEL: { [key: string]: string } = {
  cobrada: 'Cobrada', aplicada: 'Aplicada', retenida: 'Retenida', devuelta: 'Devuelta',
}

export const ESTADO_SENIA_COLOR: { [key: string]: string } = {
  cobrada:  'bg-blue-100 text-blue-700',
  aplicada: 'bg-green-100 text-green-700',
  retenida: 'bg-orange-100 text-orange-700',
  devuelta: 'bg-gray-100 text-gray-500',
}

export const ESTADO_LIQ_LABEL: { [key: string]: string } = {
  borrador: 'Borrador', presentada: 'Presentada', pagada: 'Pagada',
  con_diferencias: 'Con diferencias', cancelada: 'Cancelada',
}

export const ESTADO_LIQ_COLOR: { [key: string]: string } = {
  borrador:         'bg-gray-100 text-gray-600',
  presentada:       'bg-blue-100 text-blue-700',
  pagada:           'bg-green-100 text-green-700',
  con_diferencias:  'bg-orange-100 text-orange-700',
  cancelada:        'bg-red-100 text-red-600',
}

export const ESTADO_GASTO_COLOR: { [key: string]: string } = {
  pagado:   'bg-green-100 text-green-700',
  pendiente:'bg-orange-100 text-orange-700',
  vencido:  'bg-red-100 text-red-700',
}

export const TIPO_GASTO_LABEL: { [key: string]: string } = {
  fijo: 'Fijo', variable: 'Variable', extraordinario: 'Extraordinario',
}

export const MESES_LABEL = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

export function formatMoney(n: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}
