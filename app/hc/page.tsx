'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Plus, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button, Modal, Input, Select, Textarea, FormRow, SearchBar, PageHeader, EmptyState, LoadingSpinner, Card } from '@/components/ui'
import { formatFecha } from '@/lib/utils'
import type { Paciente, Profesional } from '@/types'

// ─── AVISO LEGAL ─────────────────────────────────────────────────────────────
function AvisoLegal() {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-amber-800">Módulo de notas clínicas internas</div>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            Las notas registradas aquí son de <strong>uso interno del centro</strong> y no constituyen Historia Clínica con validez legal según la Ley 26.529. No reemplazan la Historia Clínica oficial.
          </p>
          <button onClick={() => setOpen(!open)} className="text-xs text-amber-600 underline mt-1 flex items-center gap-1">
            {open ? 'Ver menos' : 'Ver más información'}
            {open ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
          </button>
          {open && (
            <p className="text-xs text-amber-700 mt-2 leading-relaxed">
              Para contar con una Historia Clínica Electrónica con validez legal, el sistema debe estar homologado ante el Ministerio de Salud, cumplir con la Res. 1840/2018, implementar firma digital por profesional (Ley 25.506) e inscribirse en el ReNaPDiS. Se recomienda mantener la HC oficial en soporte papel o en un sistema certificado.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function NotasClinicasPage() {
  const supabase = createClient()
  const [notas, setNotas] = useState<any[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [profesionales, setProfesionales] = useState<Profesional[]>([])
  const [selectedPac, setSelectedPac] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentProfId, setCurrentProfId] = useState<string>('')
  const [userRole, setUserRole] = useState('')

  const emptyForm = { tipo:'consulta', titulo:'', subjetivo:'', objetivo:'', diagnostico:'', plan:'', ta:'', fc:'', temperatura:'', peso:'', talla:'' }
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string,string>>({})

  useEffect(() => { init() }, [])
  useEffect(() => { if (selectedPac) loadNotas() }, [selectedPac])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    let profId = ''
    if (user) {
      const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
      if (perfil) setUserRole(perfil.rol)
      // Buscar si este usuario tiene un profesional asociado
      const { data: prof } = await supabase.from('profesionales').select('id').eq('perfil_id', user.id).single()
      if (prof) { profId = prof.id; setCurrentProfId(prof.id) }
    }
    const [{ data: pacs }, { data: profs }] = await Promise.all([
      supabase.from('pacientes').select('id,nombre,apellido,dni').eq('activo',true).order('apellido'),
      supabase.from('profesionales').select('id,nombre,apellido').eq('activo',true).order('apellido'),
    ])
    if (pacs) { setPacientes(pacs as any); if (pacs.length > 0) setSelectedPac(pacs[0].id) }
    if (profs) setProfesionales(profs as any)
    setLoading(false)
  }

  async function loadNotas() {
    if (!selectedPac) return
    const { data } = await supabase.from('hc_evoluciones').select('*, profesional:profesionales(nombre,apellido)').eq('paciente_id', selectedPac).order('fecha', {ascending:false}).order('created_at', {ascending:false})
    if (data) setNotas(data)
  }

  function validate() {
    const e: Record<string,string> = {}
    if (!form.titulo.trim()) e.titulo = 'El título es requerido'
    if (!form.subjetivo?.trim() && !form.objetivo?.trim() && !form.diagnostico?.trim()) e.subjetivo = 'Completá al menos un campo del registro clínico'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate() || !selectedPac) return
    setSaving(true)
    await supabase.from('hc_evoluciones').insert({
      paciente_id: selectedPac,
      profesional_id: currentProfId || profesionales[0]?.id,
      fecha: new Date().toISOString().slice(0,10),
      tipo: form.tipo,
      titulo: form.titulo,
      subjetivo: form.subjetivo,
      objetivo: form.objetivo,
      diagnostico: form.diagnostico,
      plan: form.plan,
      ta: form.ta, fc: form.fc, temperatura: form.temperatura, peso: form.peso, talla: form.talla,
    })
    setSaving(false); setModalOpen(false); setForm(emptyForm); loadNotas()
  }

  const ff = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => setForm(p => ({...p, [k]: e.target.value}))
  const pacActual = pacientes.find(p => p.id === selectedPac)

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="Notas clínicas internas"
        action={userRole !== 'administrativo' ? <Button icon={<Plus size={15}/>} onClick={() => { setForm(emptyForm); setErrors({}); setModalOpen(true) }}>Nueva nota</Button> : undefined} />

      <AvisoLegal />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        {/* Panel pacientes */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-1 mb-2">Pacientes</div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-h-[500px] overflow-y-auto">
            {pacientes.map(p => (
              <button key={p.id} onClick={() => setSelectedPac(p.id)}
                className={`w-full text-left px-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors flex items-center gap-2.5 ${selectedPac===p.id?'bg-navy-light':''}`}>
                <div className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center flex-shrink-0 ${selectedPac===p.id?'bg-navy text-white':'bg-gray-100 text-gray-600'}`}>
                  {p.nombre[0]}{p.apellido[0]}
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-medium truncate ${selectedPac===p.id?'text-navy':''}`}>{p.apellido}, {p.nombre}</div>
                  <div className="text-[10px] text-gray-400">DNI {p.dni}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Panel notas */}
        <div>
          {pacActual && (
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-medium text-navy">{pacActual.apellido}, {pacActual.nombre}</h2>
                <p className="text-xs text-gray-500">{notas.length} nota{notas.length!==1?'s':''} registrada{notas.length!==1?'s':''}</p>
              </div>
              {userRole !== 'administrativo' && (
                <Button size="sm" variant="orange" icon={<Plus size={13}/>} onClick={() => { setForm(emptyForm); setErrors({}); setModalOpen(true) }}>
                  Nueva nota
                </Button>
              )}
            </div>
          )}

          {notas.length === 0 ? (
            <EmptyState icon={<FileText size={36}/>} title="Sin notas" description="No hay notas registradas para este paciente"
              action={userRole !== 'administrativo' ? <Button onClick={() => setModalOpen(true)} icon={<Plus size={14}/>}>Registrar primera nota</Button> : undefined} />
          ) : (
            <div className="space-y-3">
              {notas.map(nota => (
                <Card key={nota.id} className="p-4 border-l-4 border-l-navy">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-navy">{nota.titulo}</span>
                      <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        nota.tipo==='urgencia'?'bg-red-100 text-red-700':nota.tipo==='control'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600'
                      }`}>{nota.tipo}</span>
                    </div>
                    <div className="text-xs text-gray-400 text-right flex-shrink-0">
                      <div>{formatFecha(nota.fecha)}</div>
                      <div>{nota.profesional ? `Dr/a. ${nota.profesional.apellido}` : ''}</div>
                    </div>
                  </div>

                  {/* Signos vitales */}
                  {(nota.ta || nota.fc || nota.temperatura || nota.peso || nota.talla) && (
                    <div className="flex flex-wrap gap-3 mb-2 p-2 bg-gray-50 rounded-lg">
                      {nota.ta && <span className="text-xs"><span className="text-gray-400">TA:</span> <strong>{nota.ta}</strong></span>}
                      {nota.fc && <span className="text-xs"><span className="text-gray-400">FC:</span> <strong>{nota.fc}</strong></span>}
                      {nota.temperatura && <span className="text-xs"><span className="text-gray-400">Temp:</span> <strong>{nota.temperatura}</strong></span>}
                      {nota.peso && <span className="text-xs"><span className="text-gray-400">Peso:</span> <strong>{nota.peso}</strong></span>}
                      {nota.talla && <span className="text-xs"><span className="text-gray-400">Talla:</span> <strong>{nota.talla}</strong></span>}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {nota.subjetivo && <div><span className="text-[10px] font-semibold text-gray-400 uppercase">Subjetivo / Motivo</span><p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{nota.subjetivo}</p></div>}
                    {nota.objetivo && <div><span className="text-[10px] font-semibold text-gray-400 uppercase">Objetivo / Examen</span><p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{nota.objetivo}</p></div>}
                    {nota.diagnostico && <div><span className="text-[10px] font-semibold text-gray-400 uppercase">Diagnóstico</span><p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{nota.diagnostico}</p></div>}
                    {nota.plan && <div><span className="text-[10px] font-semibold text-gray-400 uppercase">Plan / Indicaciones</span><p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{nota.plan}</p></div>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal nueva nota */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="lg" title="Nueva nota clínica"
        footer={<>
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>Guardar nota</Button>
        </>}>
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
            Esta nota es de uso interno. No tiene validez como HC legal.
          </div>
          <FormRow>
            <Select label="Tipo de registro" value={form.tipo} onChange={ff('tipo')}
              options={[{value:'consulta',label:'Consulta'},{value:'control',label:'Control'},{value:'urgencia',label:'Urgencia'},{value:'interconsulta',label:'Interconsulta'},{value:'primera_vez',label:'Primera vez'}]} />
            {userRole === 'administrador' && (
              <Select label="Profesional" value={currentProfId} onChange={e => setCurrentProfId(e.target.value)}
                options={[{value:'',label:'— Seleccionar —'}, ...profesionales.map(p => ({value:p.id, label:`Dr/a. ${p.apellido}, ${p.nombre}`}))]} />
            )}
          </FormRow>
          <Input label="Título / Diagnóstico presuntivo *" value={form.titulo} onChange={ff('titulo')} error={errors.titulo} placeholder="Ej: Control HTA, consulta por dolor..." />

          {/* Signos vitales */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Signos vitales (opcional)</label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {[['ta','TA (mmHg)','120/80'],['fc','FC (lpm)','72'],['temperatura','Temp (°C)','36.5'],['peso','Peso (kg)','70'],['talla','Talla (cm)','170']].map(([k,l,ph]) => (
                <Input key={k} label={l} value={(form as any)[k]} onChange={ff(k)} placeholder={ph} />
              ))}
            </div>
          </div>

          <Textarea label="Subjetivo / Motivo de consulta" value={form.subjetivo} onChange={ff('subjetivo')} error={errors.subjetivo} rows={3} placeholder="Anamnesis, motivo de consulta, síntomas referidos..." />
          <Textarea label="Objetivo / Examen físico" value={form.objetivo} onChange={ff('objetivo')} rows={3} placeholder="Hallazgos del examen físico..." />
          <Textarea label="Diagnóstico / Evaluación" value={form.diagnostico} onChange={ff('diagnostico')} rows={2} placeholder="Diagnóstico o impresión diagnóstica..." />
          <Textarea label="Plan / Indicaciones" value={form.plan} onChange={ff('plan')} rows={3} placeholder="Tratamiento, derivaciones, estudios solicitados, próximo control..." />
        </div>
      </Modal>
    </div>
  )
}
