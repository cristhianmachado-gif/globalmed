'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, Filter } from 'lucide-react'
import { Button, Select, Input, Card, PageHeader, LoadingSpinner, EmptyState, Badge } from '@/components/ui'
import { ESTADO_TURNO_COLOR, ESTADO_TURNO_LABEL, TIPO_TURNO_LABEL, formatFecha } from '@/lib/utils'
import { format } from 'date-fns'
import type { Turno, Profesional } from '@/types'

export default function TurnosPage() {
  const supabase = createClient()
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [profesionales, setProfesionales] = useState<Profesional[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ fecha: format(new Date(),'yyyy-MM-dd'), profesional_id: '', estado: '', tipo: '' })

  useEffect(() => { init() }, [])
  useEffect(() => { loadTurnos() }, [filters])

  async function init() {
    const { data: profs } = await supabase.from('profesionales').select('id,nombre,apellido').eq('activo',true).order('apellido')
    if (profs) setProfesionales(profs as any)
    setLoading(false)
  }

  async function loadTurnos() {
    let q = supabase.from('turnos').select('*, paciente:pacientes(nombre,apellido,dni), profesional:profesionales(nombre,apellido,especialidad:especialidades(nombre)), obra_social:obras_sociales(nombre)')
    if (filters.fecha) q = q.eq('fecha', filters.fecha)
    if (filters.profesional_id) q = q.eq('profesional_id', filters.profesional_id)
    if (filters.estado) q = q.eq('estado', filters.estado)
    if (filters.tipo) q = q.eq('tipo', filters.tipo)
    const { data } = await q.order('hora')
    if (data) setTurnos(data as any)
  }

  async function cambiarEstado(id: string, estado: string) {
    await supabase.from('turnos').update({ estado }).eq('id', id)
    loadTurnos()
  }

  const stats = useMemo(() => ({
    total: turnos.length,
    confirmados: turnos.filter(t => t.estado === 'confirmado').length,
    atendidos: turnos.filter(t => t.estado === 'atendido').length,
    urgentes: turnos.filter(t => t.tipo === 'urgente').length,
    cancelados: turnos.filter(t => t.estado === 'cancelado').length,
  }), [turnos])

  const ff = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setFilters(p => ({...p, [k]: e.target.value}))

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="Gestión de turnos" subtitle={`${turnos.length} turnos encontrados`} />

      {/* Filtros */}
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-600">Filtros</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Input type="date" label="Fecha" value={filters.fecha} onChange={ff('fecha')} />
          <Select label="Profesional" value={filters.profesional_id} onChange={ff('profesional_id')}
            options={[{value:'',label:'Todos'}, ...profesionales.map(p => ({value:p.id, label:`Dr/a. ${p.apellido}`}))]} />
          <Select label="Estado" value={filters.estado} onChange={ff('estado')}
            options={[{value:'',label:'Todos'},{value:'pendiente',label:'Pendiente'},{value:'confirmado',label:'Confirmado'},{value:'atendido',label:'Atendido'},{value:'cancelado',label:'Cancelado'},{value:'ausente',label:'Ausente'}]} />
          <Select label="Tipo" value={filters.tipo} onChange={ff('tipo')}
            options={[{value:'',label:'Todos'},{value:'consulta',label:'Consulta'},{value:'control',label:'Control'},{value:'urgente',label:'Urgente'},{value:'primera_vez',label:'Primera vez'}]} />
        </div>
      </Card>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {[
          { label:'Total', value: stats.total, color:'bg-navy-light text-navy' },
          { label:'Confirmados', value: stats.confirmados, color:'bg-green-100 text-green-700' },
          { label:'Atendidos', value: stats.atendidos, color:'bg-blue-100 text-blue-700' },
          { label:'Urgentes', value: stats.urgentes, color:'bg-red-100 text-red-700' },
          { label:'Cancelados', value: stats.cancelados, color:'bg-gray-100 text-gray-600' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl px-3 py-2.5 ${s.color}`}>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-[11px] opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {turnos.length === 0 ? (
          <EmptyState icon={<Clock size={36}/>} title="Sin turnos" description="Ajustá los filtros para ver resultados" />
        ) : turnos.map(t => (
          <Card key={t.id} className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="text-xs font-mono font-medium text-navy w-12">{t.hora?.slice(0,5)}</div>
                <div>
                  <div className="text-sm font-medium text-navy">
                    {(t as any).paciente ? `${(t as any).paciente.apellido}, ${(t as any).paciente.nombre}` : '—'}
                  </div>
                  <div className="text-xs text-gray-500">
                    Dr/a. {(t as any).profesional?.apellido} · {TIPO_TURNO_LABEL[t.tipo]}
                  </div>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_TURNO_COLOR[t.estado]}`}>
                {ESTADO_TURNO_LABEL[t.estado]}
              </span>
            </div>
            {t.estado !== 'atendido' && t.estado !== 'cancelado' && (
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="success" onClick={() => cambiarEstado(t.id, 'atendido')}>Atendido</Button>
                <Button size="sm" variant="danger" onClick={() => cambiarEstado(t.id, 'cancelado')}>Cancelar</Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Hora','Paciente','Profesional','Especialidad','Tipo','Motivo','Obra social','Estado','Acciones'].map(h => (
                  <th key={h} className="text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {turnos.length === 0 ? (
                <tr><td colSpan={9}><EmptyState icon={<Clock size={36}/>} title="Sin turnos" description="Ajustá los filtros" /></td></tr>
              ) : turnos.map((t, i) => (
                <tr key={t.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 ${i%2===1?'bg-gray-50/30':''} ${t.tipo==='urgente'?'bg-red-50/30':''}`}>
                  <td className="px-4 py-3 text-sm font-mono font-medium text-navy">{t.hora?.slice(0,5)}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-navy">
                      {(t as any).paciente ? `${(t as any).paciente.apellido}, ${(t as any).paciente.nombre}` : '—'}
                    </div>
                    <div className="text-xs text-gray-400">{(t as any).paciente?.dni}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">Dr/a. {(t as any).profesional?.apellido || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{(t as any).profesional?.especialidad?.nombre || '—'}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.tipo==='urgente'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-600'}`}>{TIPO_TURNO_LABEL[t.tipo]}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[150px] truncate">{t.motivo || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{(t as any).obra_social?.nombre || '—'}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_TURNO_COLOR[t.estado]}`}>{ESTADO_TURNO_LABEL[t.estado]}</span></td>
                  <td className="px-4 py-3">
                    {t.estado !== 'atendido' && t.estado !== 'cancelado' && (
                      <div className="flex gap-1.5">
                        <button onClick={() => cambiarEstado(t.id,'atendido')} className="text-[10px] px-2 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium">Atendido</button>
                        <button onClick={() => cambiarEstado(t.id,'cancelado')} className="text-[10px] px-2 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium">Cancelar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
