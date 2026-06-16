import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, differenceInYears } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFecha(fecha: string, fmt = 'dd/MM/yyyy') {
  try { return format(parseISO(fecha), fmt, { locale: es }) }
  catch { return fecha }
}

export function formatFechaHora(fecha: string) {
  return formatFecha(fecha, "dd/MM/yyyy 'a las' HH:mm")
}

export function calcularEdad(fechaNacimiento: string) {
  try { return differenceInYears(new Date(), parseISO(fechaNacimiento)) }
  catch { return 0 }
}

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const DIAS_CORTO  = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function diasLabel(dias: number[]) {
  return dias.map(d => DIAS_CORTO[d]).join(' · ')
}

export const ESTADO_TURNO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', confirmado: 'Confirmado',
  cancelado: 'Cancelado', atendido: 'Atendido', ausente: 'Ausente',
}

export const ESTADO_TURNO_COLOR: Record<string, string> = {
  pendiente:  'bg-orange-100 text-orange-700',
  confirmado: 'bg-green-100 text-green-700',
  cancelado:  'bg-gray-100 text-gray-600',
  atendido:   'bg-blue-100 text-blue-700',
  ausente:    'bg-red-100 text-red-700',
}

export const TIPO_TURNO_LABEL: Record<string, string> = {
  consulta: 'Consulta', control: 'Control', urgente: 'Urgente',
  primera_vez: 'Primera vez', interconsulta: 'Interconsulta',
}

export const GRUPOS_SANGUINEOS = ['A+','A-','B+','B-','O+','O-','AB+','AB-']
