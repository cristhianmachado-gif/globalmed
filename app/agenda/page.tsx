'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, Clock, AlertTriangle, MessageSquare, CheckCircle2 } from 'lucide-react'
import { Button, Modal, Select, Input, FormRow, LoadingSpinner, Card, Textarea } from '@/components/ui'
import { ESTADO_TURNO_COLOR, ESTADO_TURNO_LABEL, TIPO_TURNO_LABEL, formatFecha } from '@/lib/utils'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Profesional, Paciente, ObraSocial } from '@/types'

const DIAS_CAL = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function generarSlots(hi: string, hf: string, dur: number): string[] {
  const slots: string[] = []
  const [hI, mI] = hi.split(':').map(Number)
  const [hF, mF] = hf.split(':').map(Number)
  let min = hI * 60 + mI
  const fin = hF * 60 + mF
  while (min < fin) {
    slots.push(`${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`)
    min += dur
  }
  return slots
}

function Toast({ msg, type, onClose }: { msg: string; type: 'success'|'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-5 right-5 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${type==='success'?'bg-green-600':'bg-red-600'}`}>
      {type==='success' ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>} {msg}
    </div>
  )
}

export default function AgendaPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [profesionales, setProfesionales] = useState<Profesional[]>([])
  const [selectedProfId, setSelectedProfId] = useState('')
  const [turnosDia, setTurnosDia] = useState<any[]>([])
  const [fechasConTurnos, setFechasConTurnos] = useState<string[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [obras, setObras] = useState<ObraSocial[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDia, setLoadingDia] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [modalTurno, setModalTurno] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sobreturnoDatos, setSobreturnoDatos] = useState<any>(null)
  const [showConfirmST, setShowConfirmST] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(false)
  const [selectedTurno, setSelectedTurno] = useState<any>(null)
  const [toast, setToast] = useState<{msg:string;type:'success'|'error'}|null>(null)
  const emptyForm = { paciente_id:'', profesional_id:'', fecha:format(new Date(),'yyyy-MM-dd'), hora:'', tipo:'consulta', motivo:'', obra_social_id:'', es_sobreturno:false, motivo_sobreturno:'' }
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState<Record<string,string>>({})
  const [motivoST, setMotivoST] = useState('')
  const [errorMotivo, setErrorMotivo] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)
      const [{ data: profs }, { data: pacs }, { data: obs }] = await Promise.all([
        supabase.from('profesionales').select('*, especialidad:especialidades(nombre)').eq('activo',true).order('apellido'),
        supabase.from('pacientes').select('id,nombre,apellido,dni,obra_social_id').eq('activo',true).order('apellido'),
        supabase.from('obras_sociales').select('*').eq('activa',true).order('nombre'),
      ])
      if (profs?.length) {
        setProfesionales(profs as any)
        const profParam = searchParams.get('prof') || profs[0].id
        setSelectedProfId(profParam)
        setForm(prev => ({ ...prev, profesional_id: profParam }))
      }
      if (pacs) setPacientes(pacs as any)
      if (obs) setObras(obs)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => { if (selectedProfId) { loadFechas(); loadDia() } }, [selectedProfId, currentMonth, selectedDate])

  async function loadFechas() {
    const s = format(startOfMonth(currentMonth),'yyyy-MM-dd'), e = format(endOfMonth(currentMonth),'yyyy-MM-dd')
    const { data } = await supabase.from('turnos').select('fecha').eq('profesional_id',selectedProfId).gte('fecha',s).lte('fecha',e).neq('estado','cancelado')
    if (data) {
      const fechas = data.map((t:any) => t.fecha)
      const unicas = fechas.filter((f:string, i:number) => fechas.indexOf(f) === i)
      setFechasConTurnos(unicas)
    }
  }

  async function loadDia() {
    setLoadingDia(true)
    const fecha = format(selectedDate,'yyyy-MM-dd')
    const { data } = await supabase.from('turnos').select('*, paciente:pacientes(id,nombre,apellido,dni), obra_social:obras_sociales(nombre)').eq('profesional_id',selectedProfId).eq('fecha',fecha).neq('estado','cancelado').order('hora')
    if (data) setTurnosDia(data as any)
    setLoadingDia(false)
  }

  const profActual = profesionales.find(p => p.id === selectedProfId)
  const slots = profActual ? generarSlots(profActual.hora_inicio, profActual.hora_fin, profActual.duracion_turno) : []

  async function checkSobreturno(hora: string, fecha: string, profId: string) {
    if (!hora||!fecha||!profId) return null
    const h = hora.length===5 ? hora+':00' : hora
    const { data } = await supabase.from('turnos').select('*, paciente:pacientes(nombre,apellido)').eq('profesional_id',profId).eq('fecha',fecha).eq('hora',h).neq('estado','cancelado')
    return data?.length ? data[0] : null
  }

  async function handleHoraChange(hora: string) {
    setForm(prev=>({...prev,hora,es_sobreturno:false})); setSobreturnoDatos(null)
    if (hora && form.fecha && form.profesional_id) {
      const ex = await checkSobreturno(hora, form.fecha, form.profesional_id)
      if (ex) setSobreturnoDatos(ex)
    }
  }

  async function handleFechaChange(fecha: string) {
    setForm(prev=>({...prev,fecha})); setSobreturnoDatos(null)
    if (form.hora && fecha && form.profesional_id) {
      const ex = await checkSobreturno(form.hora, fecha, form.profesional_id)
      if (ex) setSobreturnoDatos(ex)
    }
  }

  function handlePacienteChange(pacId: string) {
    const pac = pacientes.find(p=>p.id===pacId)
    setForm(prev=>({...prev, paciente_id:pacId, obra_social_id:pac?.obra_social_id||prev.obra_social_id}))
  }

  function validate() {
    const e: Record<string,string> = {}
    if (!form.paciente_id) e.paciente_id='Seleccioná un paciente'
    if (!form.hora) e.hora='Ingresá la hora'
    setFormErrors(e)
    return !Object.keys(e).length
  }

  async function handleIntentarGuardar() {
    if (!validate()) return
    const ex = await checkSobreturno(form.hora, form.fecha, form.profesional_id)
    if (ex) { setSobreturnoDatos(ex); setMotivoST(''); setErrorMotivo(''); setShowConfirmST(true); return }
    await guardarTurno(false, '')
  }

  async function confirmarST() {
    if (!motivoST.trim()) { setErrorMotivo('El motivo es requerido'); return }
    setShowConfirmST(false)
    await guardarTurno(true, motivoST)
  }

  async function guardarTurno(esST: boolean, motivoSTVal: string) {
    setSaving(true)
    const hora = form.hora.length===5 ? form.hora+':00' : form.hora
    const { error } = await supabase.from('turnos').insert({
      paciente_id: form.paciente_id, profesional_id: form.profesional_id,
      fecha: form.fecha, hora, tipo: form.tipo, motivo: form.motivo||null,
      obra_social_id: form.obra_social_id||null, estado: 'confirmado',
      duracion: profActual?.duracion_turno||20,
      es_sobreturno: esST, motivo_sobreturno: motivoSTVal||null,
      creado_por: currentUserId||null,
    })
    if (error) { setToast({msg:'Error al guardar el turno',type:'error'}); setSaving(false); return }
    if (esST) await notificarST(hora, motivoSTVal)
    setSaving(false); setModalTurno(false); setSobreturnoDatos(null)
    setForm({...emptyForm, profesional_id:selectedProfId, fecha:format(selectedDate,'yyyy-MM-dd')})
    loadDia(); loadFechas()
    const pac = pacientes.find(p=>p.id===form.paciente_id)
    setToast({msg: esST ? `Sobreturno confirmado: ${pac?.apellido} · ${form.hora}` : `Turno confirmado: ${pac?.apellido} · ${form.hora}`, type:'success'})
  }

  async function notificarST(hora: string, motivo: string) {
    const { data: prof } = await supabase.from('profesionales').select('perfil_id,apellido').eq('id',form.profesional_id).single()
    if (!prof?.perfil_id) return
    const pac = pacientes.find(p=>p.id===form.paciente_id)
    await supabase.from('mensajes').insert({
      from_id: currentUserId, to_id: prof.perfil_id,
      asunto: `⚡ Sobreturno — ${formatFecha(form.fecha)} ${hora.slice(0,5)}`,
      cuerpo: `Se le asignó un sobreturno en su agenda:\n\n📅 Fecha: ${formatFecha(form.fecha)}\n🕐 Hora: ${hora.slice(0,5)}\n👤 Paciente: ${pac?`${pac.apellido}, ${pac.nombre}`:'—'}\n📋 Motivo: ${motivo||'—'}\n\nEste turno se agrega fuera de la grilla habitual.`,
    })
  }

  async function cambiarEstado(id: string, estado: string) {
    await supabase.from('turnos').update({estado}).eq('id',id)
    setModalDetalle(false); loadDia()
    setToast({msg:`Turno marcado como ${ESTADO_TURNO_LABEL[estado].toLowerCase()}`,type:'success'})
  }

  const days = eachDayOfInterval({start:startOfMonth(currentMonth),end:endOfMonth(currentMonth)})
  const firstDow = getDay(startOfMonth(currentMonth))
  function atiende(dow:number){if(!profActual)return true;const d=dow===0?6:dow-1;return(profActual.dias_atencion||[]).includes(d)}

  function renderGrilla() {
    const porHora: Record<string,any[]> = {}
    turnosDia.forEach(t=>{ const h=(t.hora||'').slice(0,5); if(!porHora[h])porHora[h]=[]; porHora[h].push(t) })
    const todas = [...new Set([...slots,...Object.keys(porHora)])].sort()
    if (!todas.length) return (
      <div className="text-center py-12 text-gray-400">
        <Clock size={28} className="mx-auto mb-2 opacity-30"/>
        <p className="text-sm">Sin turnos para este día</p>
        <p className="text-xs mt-1">Hacé clic en "Turno" para agregar</p>
      </div>
    )
    return (
      <div className="divide-y divide-gray-50">
        {todas.map(hora=>{
          const ts=porHora[hora]||[]
          const libre=!ts.length
          const esSlot=slots.includes(hora)
          return (
            <div key={hora} className={`flex gap-3 px-4 py-2.5 transition-opacity ${libre?'opacity-50 hover:opacity-80':''}`}>
              <div className="w-12 flex-shrink-0 pt-0.5">
                <div className={`text-xs font-mono ${esSlot?'text-gray-500':'text-orange-500 font-semibold'}`}>{hora}</div>
                {!esSlot && <div className="text-[9px] text-orange-400">fuera grilla</div>}
              </div>
              <div className={`w-0.5 rounded-full flex-shrink-0 my-0.5 ${libre?'bg-gray-200':ts.some((t:any)=>t.es_sobreturno)?'bg-amber-400':'bg-green-400'}`}/>
              <div className="flex-1 min-w-0 space-y-1.5 py-0.5">
                {libre ? (
                  <button onClick={()=>{setForm({...emptyForm,profesional_id:selectedProfId,fecha:format(selectedDate,'yyyy-MM-dd'),hora});setSobreturnoDatos(null);setFormErrors({});setModalTurno(true)}}
                    className="text-xs text-gray-400 hover:text-navy hover:underline transition-colors">
                    + Asignar turno
                  </button>
                ) : ts.map((t:any)=>(
                  <button key={t.id} onClick={()=>{setSelectedTurno(t);setModalDetalle(true)}}
                    className={`w-full text-left rounded-lg px-3 py-2 border transition-colors ${t.es_sobreturno?'bg-amber-50 border-amber-200 hover:bg-amber-100':t.tipo==='urgente'?'bg-red-50 border-red-200 hover:bg-red-100':'bg-green-50 border-green-100 hover:bg-green-100'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {t.es_sobreturno && <span className="text-[9px] bg-amber-400 text-white px-1.5 py-0.5 rounded font-bold flex-shrink-0">ST</span>}
                        <span className="text-xs font-medium text-navy truncate">{t.paciente?`${t.paciente.apellido}, ${t.paciente.nombre}`:'—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] text-gray-500">{TIPO_TURNO_LABEL[t.tipo]}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_TURNO_COLOR[t.estado]}`}>{ESTADO_TURNO_LABEL[t.estado]}</span>
                      </div>
                    </div>
                    {t.motivo && <div className="text-[11px] text-gray-500 mt-0.5 truncate">{t.motivo}</div>}
                    {t.es_sobreturno && t.motivo_sobreturno && (
                      <div className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1"><AlertTriangle size={10}/>{t.motivo_sobreturno}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) return <LoadingSpinner/>

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-navy">Agenda de turnos</h1>
        <Button icon={<Plus size={15}/>} onClick={()=>{setForm({...emptyForm,profesional_id:selectedProfId,fecha:format(selectedDate,'yyyy-MM-dd')});setSobreturnoDatos(null);setFormErrors({});setModalTurno(true)}}>Nuevo turno</Button>
      </div>

      <div className="mb-4">
        <Select label="" value={selectedProfId} onChange={e=>{setSelectedProfId(e.target.value);setForm(prev=>({...prev,profesional_id:e.target.value}))}}
          options={profesionales.map(p=>({value:p.id,label:`Dr/a. ${p.apellido}, ${p.nombre} · ${(p as any).especialidad?.nombre||''}`}))}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-4">

        {/* Calendario */}
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={()=>setCurrentMonth(m=>subMonths(m,1))} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronLeft size={16}/></button>
              <span className="text-sm font-medium text-navy capitalize">{format(currentMonth,'MMMM yyyy',{locale:es})}</span>
              <button onClick={()=>setCurrentMonth(m=>addMonths(m,1))} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronRight size={16}/></button>
            </div>
            <div className="grid grid-cols-7 mb-1">{DIAS_CAL.map(d=><div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({length:firstDow}).map((_,i)=><div key={`e${i}`}/>)}
              {days.map(day=>{
                const ds=format(day,'yyyy-MM-dd'),has=fechasConTurnos.includes(ds),isSel=isSameDay(day,selectedDate),isT=isToday(day),noAt=!atiende(getDay(day))
                return (
                  <button key={ds} onClick={()=>!noAt&&setSelectedDate(day)}
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors relative ${isSel?'bg-navy text-white font-semibold':isT?'bg-orange-100 text-orange-700 font-semibold':noAt?'text-gray-300 cursor-not-allowed':'hover:bg-gray-100 text-gray-700'}`}>
                    {format(day,'d')}
                    {has&&!isSel&&<div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-orange-400"/>}
                  </button>
                )
              })}
            </div>
            {profActual && (
              <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
                <div className="text-[11px] text-gray-500 font-medium">Dr/a. {profActual.apellido}</div>
                <div className="flex flex-wrap gap-1">
                  {['Lun','Mar','Mié','Jue','Vie','Sáb'].map((d,i)=>(
                    <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${(profActual.dias_atencion||[]).includes(i)?'bg-green-100 text-green-700':'bg-gray-100 text-gray-400'}`}>{d}</span>
                  ))}
                </div>
                <div className="text-[11px] text-gray-400">{profActual.hora_inicio}–{profActual.hora_fin} · cada {profActual.duracion_turno} min · {slots.length} slots</div>
              </div>
            )}
          </Card>
          <Card className="p-3">
            <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Referencias</div>
            {[{c:'bg-green-400',l:'Turno confirmado'},{c:'bg-amber-400',l:'Sobreturno (ST)'},{c:'bg-red-400',l:'Urgente'},{c:'bg-gray-200',l:'Slot libre'}].map(x=>(
              <div key={x.l} className="flex items-center gap-2 mb-1.5"><div className={`w-2.5 h-2.5 rounded-full ${x.c}`}/><span className="text-xs text-gray-600">{x.l}</span></div>
            ))}
          </Card>
        </div>

        {/* Grilla día */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-navy capitalize">{format(selectedDate,"EEEE d 'de' MMMM",{locale:es})}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {turnosDia.length} turno{turnosDia.length!==1?'s':''}
                {turnosDia.filter(t=>t.es_sobreturno).length>0 && <span className="ml-2 text-amber-600 font-medium">· {turnosDia.filter(t=>t.es_sobreturno).length} sobreturno{turnosDia.filter(t=>t.es_sobreturno).length!==1?'s':''}</span>}
              </div>
            </div>
            <Button size="sm" variant="orange" icon={<Plus size={13}/>} onClick={()=>{setForm({...emptyForm,profesional_id:selectedProfId,fecha:format(selectedDate,'yyyy-MM-dd')});setSobreturnoDatos(null);setFormErrors({});setModalTurno(true)}}>Turno</Button>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-280px)]">{loadingDia?<LoadingSpinner/>:renderGrilla()}</div>
        </Card>
      </div>

      {/* Modal nuevo turno */}
      <Modal open={modalTurno} onClose={()=>{setModalTurno(false);setSobreturnoDatos(null)}} title="Nuevo turno" size="md"
        footer={<><Button variant="outline" onClick={()=>{setModalTurno(false);setSobreturnoDatos(null)}}>Cancelar</Button><Button variant="orange" onClick={handleIntentarGuardar} loading={saving} icon={<Plus size={14}/>}>Confirmar turno</Button></>}>
        <div className="space-y-3">
          <Select label="Paciente *" value={form.paciente_id} onChange={e=>handlePacienteChange(e.target.value)}
            options={[{value:'',label:'— Seleccionar paciente —'},...pacientes.map(p=>({value:p.id,label:`${p.apellido}, ${p.nombre} · ${p.dni}`}))]}/>
          {formErrors.paciente_id && <p className="text-xs text-red-500 -mt-2">{formErrors.paciente_id}</p>}
          <Select label="Profesional" value={form.profesional_id} onChange={e=>{setSelectedProfId(e.target.value);setForm(prev=>({...prev,profesional_id:e.target.value}))}}
            options={profesionales.map(p=>({value:p.id,label:`Dr/a. ${p.apellido}, ${p.nombre}`}))}/>
          <FormRow>
            <Input label="Fecha *" type="date" value={form.fecha} onChange={e=>handleFechaChange(e.target.value)}/>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Hora * <span className="text-[10px] text-gray-400 font-normal">— cualquier hora (ej: 08:20)</span></label>
              <input type="time" value={form.hora} onChange={e=>handleHoraChange(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-navy"/>
              {formErrors.hora && <p className="text-xs text-red-500 mt-1">{formErrors.hora}</p>}
            </div>
          </FormRow>
          {profActual && form.hora && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500">
              Grilla: {profActual.hora_inicio}–{profActual.hora_fin} · cada {profActual.duracion_turno} min
              {!slots.includes(form.hora) && form.hora && <span className="ml-2 text-orange-500 font-medium">⚠ Fuera de grilla habitual</span>}
            </div>
          )}
          {sobreturnoDatos && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-amber-500"/><span className="text-xs font-semibold text-amber-800">Ya hay turno a las {form.hora}</span></div>
              <p className="text-xs text-amber-700 ml-5">{sobreturnoDatos.paciente?`${sobreturnoDatos.paciente.apellido}, ${sobreturnoDatos.paciente.nombre}`:'Turno existente'}</p>
              <p className="text-xs text-amber-600 mt-1 ml-5 flex items-center gap-1"><MessageSquare size={10}/> Si confirmás, se pedirá confirmación y se notificará al profesional.</p>
            </div>
          )}
          <FormRow>
            <Select label="Tipo" value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))}
              options={[{value:'consulta',label:'Consulta'},{value:'control',label:'Control'},{value:'urgente',label:'Urgente'},{value:'primera_vez',label:'Primera vez'},{value:'interconsulta',label:'Interconsulta'}]}/>
            <Select label="Obra social" value={form.obra_social_id} onChange={e=>setForm(p=>({...p,obra_social_id:e.target.value}))}
              options={[{value:'',label:'— Seleccionar —'},...obras.map(o=>({value:o.id,label:o.nombre}))]}/>
          </FormRow>
          <Input label="Motivo" value={form.motivo} onChange={e=>setForm(p=>({...p,motivo:e.target.value}))} placeholder="Descripción breve..."/>
        </div>
      </Modal>

      {/* Modal confirmación sobreturno */}
      {showConfirmST && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setShowConfirmST(false)}/>
          <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 z-10">
            <div className="flex justify-center mb-4"><div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center"><AlertTriangle size={28} className="text-amber-500"/></div></div>
            <h2 className="text-base font-bold text-center text-navy mb-1">Confirmar sobreturno</h2>
            <p className="text-xs text-gray-500 text-center mb-4">Ya existe un turno a las <strong>{form.hora}</strong> con Dr/a. {profActual?.apellido}</p>
            <div className="bg-gray-50 rounded-xl p-3 mb-3">
              <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Turno existente</div>
              <div className="text-sm font-medium text-navy">{sobreturnoDatos?.paciente?`${sobreturnoDatos.paciente.apellido}, ${sobreturnoDatos.paciente.nombre}`:'—'}</div>
              <div className="text-xs text-gray-500">{TIPO_TURNO_LABEL[sobreturnoDatos?.tipo]}</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <div className="text-[10px] font-semibold text-amber-600 uppercase mb-1">Sobreturno nuevo</div>
              <div className="text-sm font-medium text-navy">{pacientes.find(p=>p.id===form.paciente_id)?`${pacientes.find(p=>p.id===form.paciente_id)?.apellido}, ${pacientes.find(p=>p.id===form.paciente_id)?.nombre}`:'—'}</div>
              <div className="text-[11px] text-amber-700 flex items-center gap-1 mt-1"><MessageSquare size={10}/> Se notificará al profesional automáticamente</div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Motivo del sobreturno <span className="text-red-500">*</span></label>
              <textarea value={motivoST} onChange={e=>{setMotivoST(e.target.value);setErrorMotivo('')}} rows={2} placeholder="Ej: Paciente viajó desde lejos, urgencia, derivación..." className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-navy resize-none"/>
              {errorMotivo && <p className="text-xs text-red-500 mt-1">{errorMotivo}</p>}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={()=>setShowConfirmST(false)} className="flex-1 justify-center">Cancelar</Button>
              <Button variant="orange" onClick={confirmarST} className="flex-1 justify-center" icon={<CheckCircle2 size={14}/>}>Confirmar sobreturno</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      <Modal open={modalDetalle} onClose={()=>setModalDetalle(false)} title={selectedTurno?.es_sobreturno?'⚡ Sobreturno':'Detalle del turno'}
        footer={<><Button variant="outline" onClick={()=>setModalDetalle(false)}>Cerrar</Button>
          {selectedTurno?.estado!=='cancelado'&&selectedTurno?.estado!=='atendido'&&<>
            <Button variant="danger" onClick={()=>cambiarEstado(selectedTurno.id,'cancelado')}>Cancelar turno</Button>
            <Button variant="success" onClick={()=>cambiarEstado(selectedTurno.id,'atendido')}>Marcar atendido</Button>
          </>}</>}>
        {selectedTurno && (
          <div className="space-y-1">
            {selectedTurno.es_sobreturno && <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 flex items-center gap-2"><AlertTriangle size={14} className="text-amber-500"/><div><div className="text-xs font-semibold text-amber-800">Sobreturno</div>{selectedTurno.motivo_sobreturno&&<div className="text-xs text-amber-700">{selectedTurno.motivo_sobreturno}</div>}</div></div>}
            {[['Paciente',selectedTurno.paciente?`${selectedTurno.paciente.apellido}, ${selectedTurno.paciente.nombre}`:'—'],['DNI',selectedTurno.paciente?.dni||'—'],['Fecha',formatFecha(selectedTurno.fecha)],['Hora',selectedTurno.hora?.slice(0,5)],['Tipo',TIPO_TURNO_LABEL[selectedTurno.tipo]],['Motivo',selectedTurno.motivo||'—'],['Obra social',selectedTurno.obra_social?.nombre||'—'],['Estado',ESTADO_TURNO_LABEL[selectedTurno.estado]]].map(([k,v])=>(
              <div key={k} className="flex justify-between py-2 border-b border-gray-50 last:border-0"><span className="text-xs text-gray-500">{k}</span><span className="text-xs font-medium text-gray-800">{v}</span></div>
            ))}
          </div>
        )}
      </Modal>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
