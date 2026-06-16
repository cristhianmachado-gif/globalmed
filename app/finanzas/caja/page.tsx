'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Clock, AlertCircle, DollarSign, Banknote, CreditCard, Smartphone } from 'lucide-react'
import { Button, Modal, Select, Input, Card, LoadingSpinner, PageHeader } from '@/components/ui'
import { formatMoney, FORMA_PAGO_LABEL, ESTADO_COBRO_COLOR, ESTADO_COBRO_LABEL, type FormaPago } from '@/types/finanzas'
import { format } from 'date-fns'
import { formatFecha } from '@/lib/utils'

const FORMAS: { value: FormaPago; label: string; icon: React.ReactNode }[] = [
  { value: 'efectivo',      label: 'Efectivo',      icon: <Banknote size={16}/> },
  { value: 'transferencia', label: 'Transferencia',  icon: <Smartphone size={16}/> },
  { value: 'tarjeta',       label: 'Tarjeta',        icon: <CreditCard size={16}/> },
]

export default function CajaPage() {
  const supabase = createClient()
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [cobros, setCobros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [formaPago, setFormaPago] = useState<FormaPago>('efectivo')
  const [montoCobrar, setMontoCobrar] = useState('')
  const [saving, setSaving] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')

  useEffect(() => { init() }, [])
  useEffect(() => { loadCobros() }, [fecha])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)
  }

  async function loadCobros() {
    setLoading(true)
    const { data } = await supabase.from('cobros_paciente')
      .select(`*, turno:turnos(fecha, hora, tipo, profesional:profesionales(nombre,apellido), paciente:pacientes(nombre,apellido,dni,obra_social:obras_sociales(nombre)))`)
      .eq('turno.fecha', fecha)
      .order('created_at', { ascending: false })
    if (data) setCobros(data.filter((c:any) => c.turno))
    setLoading(false)
  }

  function openCobro(c: any) {
    setSelected(c)
    const saldo = c.monto_esperado - c.senia_aplicada - c.monto_cobrado
    setMontoCobrar(saldo > 0 ? String(saldo) : '0')
    setFormaPago('efectivo')
    setModalOpen(true)
  }

  async function handleCobrar() {
    if (!selected) return
    setSaving(true)
    const monto = parseFloat(montoCobrar) || 0
    const nuevoTotal = selected.monto_cobrado + monto
    const saldoNuevo = selected.monto_esperado - selected.senia_aplicada - nuevoTotal
    const nuevoEstado = saldoNuevo <= 0 ? 'cobrado' : 'parcial'

    await supabase.from('cobros_paciente').update({
      monto_cobrado: nuevoTotal,
      forma_pago: formaPago,
      estado: nuevoEstado,
      fecha_cobro: fecha,
      cobrado_por: currentUserId || null,
    }).eq('id', selected.id)

    // Generar distribución automática
    if (nuevoEstado === 'cobrado') {
      await generarDistribucion(selected, nuevoTotal)
    }

    setSaving(false)
    setModalOpen(false)
    loadCobros()
  }

  async function generarDistribucion(cobro: any, montoTotal: number) {
    const profId = cobro.turno?.profesional?.id
    if (!profId) return
    const { data: acuerdo } = await supabase.from('acuerdos_profesionales')
      .select('*').eq('profesional_id', profId).order('vigente_desde', { ascending: false }).limit(1).single()
    const pctProf = cobro.concepto === 'particular'
      ? (acuerdo?.pct_prof_particular || 70)
      : (acuerdo?.pct_prof_coseguro || 70)
    const montoProf = (montoTotal * pctProf) / 100
    await supabase.from('distribuciones').upsert({
      turno_id: cobro.turno_id,
      profesional_id: profId,
      origen: cobro.concepto,
      monto_total: montoTotal,
      pct_profesional: pctProf,
      monto_profesional: montoProf,
      pct_centro: 100 - pctProf,
      monto_centro: montoTotal - montoProf,
      estado: 'pendiente',
    }, { onConflict: 'turno_id,origen' })
  }

  // Totales del día
  const totalEsperado = cobros.reduce((a, c) => a + (c.monto_esperado - c.senia_aplicada), 0)
  const totalCobrado  = cobros.reduce((a, c) => a + c.monto_cobrado, 0)
  const totalPendiente = cobros.filter(c => c.estado === 'pendiente' || c.estado === 'parcial').length

  const porFormaPago = cobros.filter(c=>c.estado==='cobrado').reduce((acc:any, c:any) => {
    acc[c.forma_pago] = (acc[c.forma_pago] || 0) + c.monto_cobrado; return acc
  }, {})

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader title="Caja del día" subtitle="Cobro de coseguros y particulares" />

      {/* Selector fecha */}
      <div className="flex items-center gap-3 mb-5">
        <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-44" label="" />
        <div className="text-xs text-gray-500">{cobros.length} cobros registrados</div>
      </div>

      {/* Resumen del día */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Total esperado</div>
          <div className="text-lg font-bold text-navy">{formatMoney(totalEsperado)}</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4">
          <div className="text-xs text-green-600 mb-1">Cobrado</div>
          <div className="text-lg font-bold text-green-700">{formatMoney(totalCobrado)}</div>
        </div>
        <div className="bg-orange-50 rounded-xl border border-orange-100 p-4">
          <div className="text-xs text-orange-600 mb-1">Pendientes</div>
          <div className="text-lg font-bold text-orange-700">{totalPendiente} turnos</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Por forma de pago</div>
          {Object.entries(porFormaPago).map(([fp, monto]:any) => (
            <div key={fp} className="text-xs flex justify-between"><span className="text-gray-600 capitalize">{fp}</span><span className="font-medium">{formatMoney(monto)}</span></div>
          ))}
          {!Object.keys(porFormaPago).length && <div className="text-xs text-gray-400">Sin cobros aún</div>}
        </div>
      </div>

      {/* Lista de cobros */}
      <Card className="overflow-hidden">
        {cobros.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <DollarSign size={32} className="mx-auto mb-2 opacity-30"/>
            <p className="text-sm">Sin cobros para esta fecha</p>
            <p className="text-xs mt-1">Los cobros se generan automáticamente cuando se atiende un turno</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Hora','Paciente','Profesional','Concepto','OS','Esperado','Seña','Cobrado','Estado',''].map(h => (
                    <th key={h} className="text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cobros.map((c:any, i:number) => {
                  const t = c.turno
                  const saldo = c.monto_esperado - c.senia_aplicada - c.monto_cobrado
                  return (
                    <tr key={c.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 ${i%2===1?'bg-gray-50/30':''}`}>
                      <td className="px-4 py-3 text-sm font-mono text-navy">{t?.hora?.slice(0,5)}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-navy">{t?.paciente?.apellido}, {t?.paciente?.nombre}</div>
                        <div className="text-xs text-gray-400">{t?.paciente?.dni}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">Dr/a. {t?.profesional?.apellido}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.concepto==='particular'?'bg-navy-light text-navy':'bg-blue-100 text-blue-700'}`}>
                          {c.concepto === 'particular' ? 'Particular' : 'Coseguro'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{t?.paciente?.obra_social?.nombre || '—'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">{formatMoney(c.monto_esperado)}</td>
                      <td className="px-4 py-3 text-sm text-blue-600">{c.senia_aplicada > 0 ? `-${formatMoney(c.senia_aplicada)}` : '—'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-green-700">{c.monto_cobrado > 0 ? formatMoney(c.monto_cobrado) : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_COBRO_COLOR[c.estado as keyof typeof ESTADO_COBRO_COLOR]}`}>
                          {ESTADO_COBRO_LABEL[c.estado as keyof typeof ESTADO_COBRO_LABEL]}
                        </span>
                        {saldo > 0 && c.estado !== 'eximido' && (
                          <div className="text-[10px] text-orange-600 mt-0.5">Debe {formatMoney(saldo)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {(c.estado === 'pendiente' || c.estado === 'parcial') && (
                          <Button size="sm" variant="success" icon={<CheckCircle2 size={12}/>} onClick={() => openCobro(c)}>
                            Cobrar
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal cobro */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar cobro" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button variant="success" onClick={handleCobrar} loading={saving} icon={<CheckCircle2 size={14}/>}>Confirmar cobro</Button>
        </>}>
        {selected && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <div className="text-xs font-medium text-navy">{selected.turno?.paciente?.apellido}, {selected.turno?.paciente?.nombre}</div>
              <div className="text-xs text-gray-500">
                {selected.concepto === 'particular' ? 'Pago particular' : 'Coseguro'} · Dr/a. {selected.turno?.profesional?.apellido}
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-200 mt-1">
                <span className="text-xs text-gray-500">Monto esperado</span>
                <span className="text-xs font-medium">{formatMoney(selected.monto_esperado)}</span>
              </div>
              {selected.senia_aplicada > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs text-blue-600">Seña aplicada</span>
                  <span className="text-xs font-medium text-blue-600">-{formatMoney(selected.senia_aplicada)}</span>
                </div>
              )}
              {selected.monto_cobrado > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs text-green-600">Ya cobrado</span>
                  <span className="text-xs font-medium text-green-600">-{formatMoney(selected.monto_cobrado)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-gray-200">
                <span className="text-xs font-semibold text-navy">Saldo a cobrar</span>
                <span className="text-sm font-bold text-navy">
                  {formatMoney(selected.monto_esperado - selected.senia_aplicada - selected.monto_cobrado)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Monto a cobrar ahora</label>
              <input type="number" value={montoCobrar} onChange={e => setMontoCobrar(e.target.value)}
                className="w-full px-3 py-2.5 text-lg font-bold border border-gray-300 rounded-lg outline-none focus:border-navy text-center"
                placeholder="0"/>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Forma de pago</label>
              <div className="grid grid-cols-3 gap-2">
                {FORMAS.map(fp => (
                  <button key={fp.value} type="button" onClick={() => setFormaPago(fp.value)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-colors ${formaPago === fp.value ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-navy'}`}>
                    {fp.icon}
                    {fp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
