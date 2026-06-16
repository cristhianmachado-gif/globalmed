'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Clock, Building2 } from 'lucide-react'
import { Card, LoadingSpinner } from '@/components/ui'
import { formatMoney, MESES_LABEL } from '@/types/finanzas'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

function StatCard({ label, value, sub, icon, color = 'navy', trend }:
  { label: string; value: string; sub?: string; icon: React.ReactNode; color?: string; trend?: 'up'|'down' }) {
  const colors: Record<string, string> = {
    navy: 'bg-navy-light text-navy', orange: 'bg-orange-100 text-orange-600',
    green: 'bg-green-100 text-green-700', red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>{icon}</div>
      <div className="text-xl font-bold text-navy leading-tight">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      {sub && (
        <div className={`text-[11px] mt-1.5 flex items-center gap-1 ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
          {trend === 'up' ? <TrendingUp size={11}/> : trend === 'down' ? <TrendingDown size={11}/> : null}
          {sub}
        </div>
      )}
    </div>
  )
}

const COLORS = ['#1a2e4a','#e67e22','#27ae60','#c0392b','#88aaee','#5dca8a','#f0a45a','#8b2419']

export default function DashboardFinanzasPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(new Date())

  // Datos
  const [cobrosDelMes, setCobrosDelMes] = useState(0)
  const [cobrosOS, setCobrosOS] = useState(0)
  const [gastosDelMes, setGastosDelMes] = useState(0)
  const [saldoOS, setSaldoOS] = useState(0)
  const [seniasPendientes, setSeniasPendientes] = useState(0)
  const [gastosVencidos, setGastosVencidos] = useState(0)
  const [serieIngresos, setSerieIngresos] = useState<any[]>([])
  const [gastosCategoria, setGastosCategoria] = useState<any[]>([])
  const [cuentaCorrienteOS, setCuentaCorrienteOS] = useState<any[]>([])
  const [produccionProf, setProduccionProf] = useState<any[]>([])

  useEffect(() => { loadData() }, [mes])

  async function loadData() {
    setLoading(true)
    const mesStr = format(mes, 'yyyy-MM')
    const mesStart = format(startOfMonth(mes), 'yyyy-MM-dd')
    const mesEnd = format(endOfMonth(mes), 'yyyy-MM-dd')

    const [
      { data: cobros },
      { data: pagosOS },
      { data: gastos },
      { data: ccos },
      { data: senias },
      { data: gastosV },
      { data: profs },
    ] = await Promise.all([
      supabase.from('cobros_paciente').select('monto_cobrado,concepto').gte('fecha_cobro', mesStart).lte('fecha_cobro', mesEnd).in('estado',['cobrado','parcial']),
      supabase.from('pagos_os').select('monto_pagado').gte('fecha_pago', mesStart).lte('fecha_pago', mesEnd),
      supabase.from('gastos').select('monto,categoria:categorias_gasto(nombre,color)').gte('fecha', mesStart).lte('fecha', mesEnd).eq('estado','pagado'),
      supabase.from('v_cuenta_corriente_os').select('*').gt('saldo_pendiente', 0),
      supabase.from('senias').select('monto').eq('estado','cobrada'),
      supabase.from('gastos').select('id').eq('estado','vencido'),
      supabase.from('v_produccion_profesional').select('*').limit(5),
    ])

    const totalCobros = (cobros||[]).reduce((a:number,c:any) => a + (c.monto_cobrado||0), 0)
    const totalOS = (pagosOS||[]).reduce((a:number,p:any) => a + (p.monto_pagado||0), 0)
    const totalGastos = (gastos||[]).reduce((a:number,g:any) => a + (g.monto||0), 0)
    const totalSaldoOS = (ccos||[]).reduce((a:number,c:any) => a + (c.saldo_pendiente||0), 0)
    const totalSenias = (senias||[]).reduce((a:number,s:any) => a + (s.monto||0), 0)

    setCobrosDelMes(totalCobros)
    setCobrosOS(totalOS)
    setGastosDelMes(totalGastos)
    setSaldoOS(totalSaldoOS)
    setSeniasPendientes(totalSenias)
    setGastosVencidos(gastosV?.length || 0)
    setCuentaCorrienteOS((ccos||[]).slice(0,6))
    setProduccionProf(profs||[])

    // Agrupar gastos por categoría
    const catMap: Record<string,{nombre:string;color:string;total:number}> = {}
    ;(gastos||[]).forEach((g:any) => {
      const nom = g.categoria?.nombre || 'Otros'
      const col = g.categoria?.color || '#6c757d'
      if (!catMap[nom]) catMap[nom] = { nombre: nom, color: col, total: 0 }
      catMap[nom].total += g.monto
    })
    setGastosCategoria(Object.values(catMap).sort((a,b) => b.total - a.total))

    // Serie últimos 6 meses
    const serie = []
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(mes, i)
      const s = format(startOfMonth(m), 'yyyy-MM-dd')
      const e = format(endOfMonth(m), 'yyyy-MM-dd')
      const [{ data: c }, { data: g }, { data: p }] = await Promise.all([
        supabase.from('cobros_paciente').select('monto_cobrado').gte('fecha_cobro',s).lte('fecha_cobro',e).in('estado',['cobrado','parcial']),
        supabase.from('gastos').select('monto').gte('fecha',s).lte('fecha',e).eq('estado','pagado'),
        supabase.from('pagos_os').select('monto_pagado').gte('fecha_pago',s).lte('fecha_pago',e),
      ])
      serie.push({
        mes: MESES_LABEL[m.getMonth()].slice(0,3),
        ingresos: (c||[]).reduce((a:number,x:any)=>a+x.monto_cobrado,0) + (p||[]).reduce((a:number,x:any)=>a+x.monto_pagado,0),
        gastos: (g||[]).reduce((a:number,x:any)=>a+x.monto,0),
      })
    }
    setSerieIngresos(serie)
    setLoading(false)
  }

  const resultadoNeto = cobrosDelMes + cobrosOS - gastosDelMes

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-navy">Dashboard financiero</h1>
          <p className="text-xs text-gray-500 mt-0.5">Resumen económico del centro</p>
        </div>
        <select value={format(mes,'yyyy-MM')} onChange={e => setMes(new Date(e.target.value + '-01'))}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-navy">
          {Array.from({length:12},(_,i) => {
            const d = subMonths(new Date(), i)
            return <option key={i} value={format(d,'yyyy-MM')}>{MESES_LABEL[d.getMonth()]} {d.getFullYear()}</option>
          })}
        </select>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Cobros directos" value={formatMoney(cobrosDelMes)} icon={<DollarSign size={18}/>} color="green" sub="coseguros + particulares" />
        <StatCard label="Cobros de OS" value={formatMoney(cobrosOS)} icon={<Building2 size={18}/>} color="navy" sub="pagos recibidos del mes" />
        <StatCard label="Gastos del mes" value={formatMoney(gastosDelMes)} icon={<TrendingDown size={18}/>} color="orange" />
        <StatCard label="Resultado neto" value={formatMoney(resultadoNeto)} icon={<TrendingUp size={18}/>}
          color={resultadoNeto >= 0 ? 'green' : 'red'}
          sub={resultadoNeto >= 0 ? 'Superávit' : 'Déficit'} trend={resultadoNeto >= 0 ? 'up' : 'down'} />
      </div>

      {/* Alertas */}
      {(saldoOS > 0 || seniasPendientes > 0 || gastosVencidos > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {saldoOS > 0 && (
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-orange-500 flex-shrink-0"/>
              <div><div className="text-xs font-medium text-orange-800">Deuda pendiente de OS</div><div className="text-sm font-bold text-orange-700">{formatMoney(saldoOS)}</div></div>
            </div>
          )}
          {seniasPendientes > 0 && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <Clock size={16} className="text-blue-500 flex-shrink-0"/>
              <div><div className="text-xs font-medium text-blue-800">Señas sin aplicar</div><div className="text-sm font-bold text-blue-700">{formatMoney(seniasPendientes)}</div></div>
            </div>
          )}
          {gastosVencidos > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0"/>
              <div><div className="text-xs font-medium text-red-800">Gastos vencidos</div><div className="text-sm font-bold text-red-700">{gastosVencidos} sin pagar</div></div>
            </div>
          )}
        </div>
      )}

      {/* Gráficos fila 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

        {/* Evolución ingresos vs gastos */}
        <Card className="p-4">
          <h2 className="text-sm font-medium text-navy mb-4">Ingresos vs Gastos — últimos 6 meses</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={serieIngresos} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4"/>
              <XAxis dataKey="mes" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:10}} tickFormatter={v => '$'+Math.round(v/1000)+'k'} axisLine={false} tickLine={false}/>
              <Tooltip formatter={(v:number) => formatMoney(v)} labelStyle={{fontSize:12}}/>
              <Legend iconSize={10} wrapperStyle={{fontSize:11}}/>
              <Bar dataKey="ingresos" name="Ingresos" fill="#27ae60" radius={[4,4,0,0]}/>
              <Bar dataKey="gastos" name="Gastos" fill="#c0392b" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Gastos por categoría */}
        <Card className="p-4">
          <h2 className="text-sm font-medium text-navy mb-4">Gastos por categoría</h2>
          {gastosCategoria.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">Sin gastos registrados</div>
          ) : (
            <div className="flex gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={gastosCategoria} dataKey="total" nameKey="nombre" cx="50%" cy="50%" innerRadius={45} outerRadius={75}>
                    {gastosCategoria.map((entry, i) => <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v:number) => formatMoney(v)}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[180px]">
                {gastosCategoria.map((c,i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:c.color}}/>
                      <span className="text-xs text-gray-700 truncate">{c.nombre}</span>
                    </div>
                    <span className="text-xs font-medium text-navy flex-shrink-0">{formatMoney(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Gráficos fila 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Cuenta corriente OS */}
        <Card className="p-4">
          <h2 className="text-sm font-medium text-navy mb-4">Saldo pendiente por obra social</h2>
          {cuentaCorrienteOS.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">Sin deuda pendiente</div>
          ) : (
            <div className="space-y-2">
              {cuentaCorrienteOS.map((os:any,i:number) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700 font-medium">{os.obra_social}</span>
                    <span className="text-navy font-semibold">{formatMoney(os.saldo_pendiente)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-navy"
                      style={{width: `${Math.min(100, (os.saldo_pendiente / (cuentaCorrienteOS[0]?.saldo_pendiente||1)) * 100)}%`}}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Producción profesional */}
        <Card className="p-4">
          <h2 className="text-sm font-medium text-navy mb-4">Producción por profesional</h2>
          {produccionProf.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">Sin datos de producción</div>
          ) : (
            <div className="space-y-3">
              {produccionProf.map((p:any,i:number) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-navy-light text-navy text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                    {p.profesional?.split(' ').map((n:string)=>n[0]).join('').slice(0,2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-navy truncate">{p.profesional}</div>
                    <div className="text-[10px] text-gray-400">{p.total_prestaciones} prestaciones</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-semibold text-navy">{formatMoney(p.total_generado)}</div>
                    <div className="text-[10px] text-green-600">{formatMoney(p.ingreso_centro)} centro</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
