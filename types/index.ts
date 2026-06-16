export type Rol = 'administrador' | 'administrativo' | 'profesional'
export type EstadoTurno = 'pendiente' | 'confirmado' | 'cancelado' | 'atendido' | 'ausente'
export type TipoTurno = 'consulta' | 'control' | 'urgente' | 'primera_vez' | 'interconsulta'
export type TipoEstudio = 'laboratorio' | 'imagen' | 'anatomia' | 'otro'
export type TipoEvolucion = 'consulta' | 'control' | 'urgencia' | 'interconsulta' | 'primera_vez'

export interface Perfil {
  id: string
  nombre: string
  apellido: string
  rol: Rol
  avatar_url?: string
  activo: boolean
  created_at: string
}

export interface ObraSocial {
  id: string
  nombre: string
  codigo?: string
  activa: boolean
  created_at: string
}

export interface Especialidad {
  id: string
  nombre: string
  activa: boolean
}

export interface Profesional {
  id: string
  perfil_id?: string
  nombre: string
  apellido: string
  dni: string
  matricula: string
  especialidad_id?: string
  especialidad?: Especialidad
  telefono?: string
  email: string
  universidad?: string
  anio_egreso?: string
  dias_atencion: number[]   // 0=Lun ... 5=Sáb
  hora_inicio: string
  hora_fin: string
  duracion_turno: number
  activo: boolean
  created_at: string
}

export interface Paciente {
  id: string
  nombre: string
  apellido: string
  dni: string
  fecha_nacimiento: string
  sexo?: 'M' | 'F' | 'Otro'
  telefono?: string
  email?: string
  direccion?: string
  ciudad?: string
  obra_social_id?: string
  obra_social?: ObraSocial
  numero_afiliado?: string
  grupo_sanguineo?: string
  medico_cabecera_id?: string
  medico_cabecera?: Profesional
  activo: boolean
  created_at: string
}

export interface Turno {
  id: string
  paciente_id?: string
  paciente?: Paciente
  profesional_id: string
  profesional?: Profesional
  fecha: string
  hora: string
  duracion: number
  tipo: TipoTurno
  motivo?: string
  estado: EstadoTurno
  obra_social_id?: string
  obra_social?: ObraSocial
  observaciones?: string
  creado_por?: string
  created_at: string
}

export interface HCEvolucion {
  id: string
  paciente_id: string
  profesional_id: string
  profesional?: Profesional
  fecha: string
  tipo: TipoEvolucion
  titulo: string
  subjetivo?: string
  objetivo?: string
  diagnostico?: string
  plan?: string
  ta?: string
  fc?: string
  temperatura?: string
  peso?: string
  talla?: string
  saturacion?: string
  created_at: string
}

export interface HCEstudio {
  id: string
  paciente_id: string
  profesional_id?: string
  fecha: string
  tipo: TipoEstudio
  nombre: string
  descripcion?: string
  archivo_url?: string
  archivo_nombre?: string
  created_at: string
}

export interface HCEpicrisis {
  id: string
  paciente_id: string
  profesional_id: string
  profesional?: Profesional
  fecha_ingreso: string
  fecha_egreso: string
  diagnostico_ingreso?: string
  diagnostico_egreso: string
  procedimientos?: string
  indicaciones_alta?: string
  observaciones?: string
  created_at: string
}

export interface HCAntecedentes {
  id: string
  paciente_id: string
  personales: string[]
  familiares: string[]
  alergias: string[]
  medicacion_actual: string[]
  vacunas: string[]
  habitos?: string
  updated_at: string
}

export interface Mensaje {
  id: string
  from_id: string
  from?: Perfil
  to_id: string
  to?: Perfil
  asunto: string
  cuerpo: string
  leido: boolean
  nota_adjunta?: {
    titulo: string
    contenido: string
    paciente_id?: string
  }
  respondiendo_a?: string
  created_at: string
}

export interface Configuracion {
  id: string
  clave: string
  valor?: string
  descripcion?: string
}
