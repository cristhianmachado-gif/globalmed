import { createClient } from '@/lib/supabase/server'
import { Users, Calendar, Stethoscope, AlertCircle, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { formatFecha, ESTADO_TURNO_COLOR, ESTADO_TURNO_LABEL } from '@/lib/utils'
import { format } from 'date-fns'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [
    { count: totalPacientes },
    { count: turnosHoy },
    { count: totalProfesionales },
    { count: urgenciasHoy },
    { data: proximosTurnos },
    { data: ultimosMensajes },
    { data: perfil },
  ] = await Promise.all([
    supabase.from('pacientes').select('*', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('turnos').select('*', { count: 'exact', head: true }).eq('fecha', today),
    supabase.from('profesionales').select('*', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('turnos').select('*', { count: 'exact', head: true }).eq('fecha', today).eq('tipo', 'urgente'),
    supabase.from('turnos').select(`*, paciente:pacientes(nombre,apellido), profesional:profesionales(nombre,apellido,especialidad:especialidades(nombre))`).eq('fecha', today).order('hora').limit(5),
    supabase.from('mensajes').select(`*, from:perfiles!mensajes_from_id_fkey(nombre,apellido)`).eq('to_id', user!.id).eq('leido', false).order('created_at', { ascending: false }).limit(4),
    supabase.from('perfiles').select('*').eq('id', user!.id).single(),
  ])

  const stats = [
    { label: 'Pacientes activos', value: totalPacientes ?? 0, icon: <Users size={18} />, color: 'sn', href: '/pacientes' },
    { label: 'Turnos hoy', value: turnosHoy ?? 0, icon: <Calendar size={18} />, color: 'so', href: '/agenda' },
    { label: 'Profesionales', value: totalProfesionales ?? 0, icon: <Stethoscope size={18} />, color: 'sg', href: '/profesionales' },
    { label: 'Urgencias hoy', value: urgenciasHoy ?? 0, icon: <AlertCircle size={18} />, color: 'sr', href: '/turnos' },
  ]

  const colorMap: Record<string, string> = {
    sn: 'bg-navy-light text-navy',
    so: 'bg-orange-100 text-orange-600',
    sg: 'bg-green-100 text-green-700',
    sr: 'bg-red-100 text-red-600',
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-navy">
          Buen día{perfil ? `, ${perfil.nombre}` : ''} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {format(new Date(), "EEEE d 'de' MMMM 'de' yyyy", { locale: require('date-fns/locale/es').es })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.map(stat => (
          <Link key={stat.label} href={stat.href}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colorMap[stat.color]}`}>
              {stat.icon}
            </div>
            <div className="text-2xl font-bold text-navy">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Turnos de hoy */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-navy">Turnos de hoy</h2>
            <Link href="/agenda" className="text-xs text-orange-500 hover:text-orange-600 font-medium">
              Ver agenda →
            </Link>
          </div>
          {!proximosTurnos?.length ? (
            <p className="text-xs text-gray-400 text-center py-6">Sin turnos para hoy</p>
          ) : (
            <div className="space-y-2">
              {proximosTurnos.map((t: any) => (
                <div key={t.id} className={`flex items-center gap-3 p-2.5 rounded-lg border-l-2 ${
                  t.tipo === 'urgente' ? 'border-red-400 bg-red-50' :
                  t.estado === 'confirmado' ? 'border-green-400 bg-green-50' :
                  'border-orange-300 bg-orange-50'
                }`}>
                  <span className="text-xs text-gray-500 w-10 flex-shrink-0">{t.hora?.slice(0,5)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-navy truncate">
                      {t.paciente ? `${t.paciente.apellido}, ${t.paciente.nombre}` : 'Turno libre'}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {t.profesional ? `Dr/a. ${t.profesional.apellido}` : ''} {t.motivo ? `· ${t.motivo}` : ''}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ESTADO_TURNO_COLOR[t.estado]}`}>
                    {ESTADO_TURNO_LABEL[t.estado]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mensajes sin leer */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-navy">Mensajes sin leer</h2>
            <Link href="/mensajes" className="text-xs text-orange-500 hover:text-orange-600 font-medium">
              Ver todos →
            </Link>
          </div>
          {!ultimosMensajes?.length ? (
            <div className="text-center py-6">
              <MessageSquare size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Sin mensajes nuevos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ultimosMensajes.map((m: any) => (
                <Link key={m.id} href={`/mensajes/${m.id}`}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-navy-light text-navy text-[10px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {m.from?.nombre?.[0]}{m.from?.apellido?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-navy">{m.from?.nombre} {m.from?.apellido}</div>
                    <div className="text-xs font-medium text-gray-700 truncate">{m.asunto}</div>
                    <div className="text-[10px] text-gray-400 truncate">{m.cuerpo}</div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0 mt-1.5" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
