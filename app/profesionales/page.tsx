'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Stethoscope, Plus, Eye, Calendar, Pencil, Trash2 } from 'lucide-react'
import { Button, Modal, Input, Select, FormRow, SearchBar, PageHeader, EmptyState, LoadingSpinner, Badge, Card, ConfirmDialog, DiasSelector } from '@/components/ui'
import { diasLabel, DIAS_SEMANA } from '@/lib/utils'
import type { Profesional, Especialidad } from '@/types'
import { useRouter } from 'next/navigation'

export default function ProfesionalesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profesionales, setProfesionales] = useState<Profesional[]>([])
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editing, setEditing] = useState<Profesional | null>(null)
  const [selected, setSelected] = useState<Profesional | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const emptyForm = { nombre:'', apellido:'', dni:'', matricula:'', especialidad_id:'', universidad:'', anio_egreso:'', telefono:'', email:'', hora_inicio:'08:00', hora_fin:'14:00', duracion_turno:'20', dias_atencion:[] as number[] }
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string,string>>({})

  useEffect(() => { init() }, [])

  async function init() {
    const [{ data: profs }, { data: esps }] = await Promise.all([
      supabase.from('profesionales').select('*, especialidad:especialidades(id,nombre)').eq('activo', true).order('apellido'),
      supabase.from('especialidades').select('*').eq('activa', true).order('nombre'),
    ])
    if (profs) setProfesionales(profs as any)
    if (esps) setEspecialidades(esps)
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (!search) return profesionales
    const q = search.toLowerCase()
    return profesionales.filter(p =>
      `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ||
      p.matricula.includes(q) ||
      (p as any).especialidad?.nombre?.toLowerCase().includes(q)
    )
  }, [profesionales, search])

  function openNew() {
    setEditing(null); setForm(emptyForm); setErrors({}); setModalOpen(true)
  }
  function openEdit(p: Profesional) {
    setEditing(p)
    setForm({
      nombre: p.nombre, apellido: p.apellido, dni: p.dni, matricula: p.matricula,
      especialidad_id: p.especialidad_id || '', universidad: p.universidad || '',
      anio_egreso: p.anio_egreso || '', telefono: p.telefono || '', email: p.email,
      hora_inicio: p.hora_inicio, hora_fin: p.hora_fin,
      duracion_turno: String(p.duracion_turno), dias_atencion: p.dias_atencion || [],
    })
    setErrors({}); setModalOpen(true)
  }

  function validate() {
    const e: Record<string,string> = {}
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!form.apellido.trim()) e.apellido = 'Requerido'
    if (!form.dni.trim()) e.dni = 'Requerido'
    if (!form.matricula.trim()) e.matricula = 'Requerido'
    if (!form.especialidad_id) e.especialidad_id = 'Requerido'
    if (!form.email.trim()) e.email = 'Requerido'
    if (form.dias_atencion.length === 0) e.dias_atencion = 'Seleccioná al menos un día'
    if (!editing && profesionales.some(p => p.matricula === form.matricula.trim())) e.matricula = 'Ya existe un profesional con esa matrícula'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    const data = { nombre: form.nombre, apellido: form.apellido, dni: form.dni, matricula: form.matricula, especialidad_id: form.especialidad_id || null, universidad: form.universidad || null, anio_egreso: form.anio_egreso || null, telefono: form.telefono || null, email: form.email, hora_inicio: form.hora_inicio, hora_fin: form.hora_fin, duracion_turno: parseInt(form.duracion_turno), dias_atencion: form.dias_atencion, activo: true }
    if (editing) {
      await supabase.from('profesionales').update(data).eq('id', editing.id)
    } else {
      await supabase.from('profesionales').insert(data)
    }
    setSaving(false); setModalOpen(false); init()
  }

  async function handleDelete() {
    if (!selected) return
    setDeleting(true)
    await supabase.from('profesionales').update({ activo: false }).eq('id', selected.id)
    setDeleting(false); setDeleteOpen(false); setSelected(null); init()
  }

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="Profesionales" subtitle={`${profesionales.length} activos`}
        action={<Button icon={<Plus size={15}/>} onClick={openNew}>Nuevo profesional</Button>} />

      <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre, especialidad o matrícula..." />

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <EmptyState icon={<Stethoscope size={36}/>} title="Sin resultados" />
        ) : filtered.map(p => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-navy-light text-navy text-sm font-semibold flex items-center justify-center flex-shrink-0">
                {p.nombre[0]}{p.apellido[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-navy">Dr/a. {p.nombre} {p.apellido}</div>
                <div className="text-xs text-gray-500">{(p as any).especialidad?.nombre} · Mat. {p.matricula}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(p.dias_atencion || []).map(d => (
                    <span key={d} className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                      {['Lun','Mar','Mié','Jue','Vie','Sáb'][d]}
                    </span>
                  ))}
                  <span className="text-[10px] text-gray-400">{p.hora_inicio}–{p.hora_fin}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" icon={<Eye size={13}/>} onClick={() => { setSelected(p); setDetailOpen(true) }}>Ver</Button>
              <Button size="sm" variant="outline" icon={<Pencil size={13}/>} onClick={() => openEdit(p)}>Editar</Button>
              <Button size="sm" variant="outline" icon={<Calendar size={13}/>} onClick={() => router.push(`/agenda?prof=${p.id}`)}>Agenda</Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop */}
      <Card className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Profesional','Especialidad','Matrícula','Días de atención','Horario','Acciones'].map(h => (
                  <th key={h} className="text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon={<Stethoscope size={36}/>} title="Sin resultados" action={<Button onClick={openNew} icon={<Plus size={14}/>}>Nuevo profesional</Button>} /></td></tr>
              ) : filtered.map((p, i) => (
                <tr key={p.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors ${i%2===1?'bg-gray-50/30':''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-navy-light text-navy text-xs font-semibold flex items-center justify-center flex-shrink-0">
                        {p.nombre[0]}{p.apellido[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-navy">Dr/a. {p.nombre} {p.apellido}</div>
                        <div className="text-xs text-gray-400">{p.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{(p as any).especialidad?.nombre || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.matricula}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(p.dias_atencion || []).map(d => (
                        <span key={d} className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                          {['Lun','Mar','Mié','Jue','Vie','Sáb'][d]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{p.hora_inicio} – {p.hora_fin}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { setSelected(p); setDetailOpen(true) }} className="p-1.5 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors"><Eye size={14}/></button>
                      <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors"><Pencil size={14}/></button>
                      <button onClick={() => router.push(`/agenda?prof=${p.id}`)} className="p-1.5 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors"><Calendar size={14}/></button>
                      <button onClick={() => { setSelected(p); setDeleteOpen(true) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal nuevo/editar */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="lg"
        title={editing ? `Editar: Dr/a. ${editing.apellido}` : 'Nuevo profesional'}
        footer={<>
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? 'Guardar cambios' : 'Registrar profesional'}</Button>
        </>}>
        <div className="space-y-3">
          <FormRow>
            <Input label="Nombre *" value={form.nombre} onChange={f('nombre')} error={errors.nombre} />
            <Input label="Apellido *" value={form.apellido} onChange={f('apellido')} error={errors.apellido} />
          </FormRow>
          <FormRow>
            <Input label="DNI *" value={form.dni} onChange={f('dni')} error={errors.dni} />
            <Input label="Matrícula *" value={form.matricula} onChange={f('matricula')} error={errors.matricula} />
          </FormRow>
          <Select label="Especialidad *" value={form.especialidad_id} onChange={f('especialidad_id')} error={errors.especialidad_id}
            options={[{value:'',label:'— Seleccionar especialidad —'}, ...especialidades.map(e => ({value:e.id,label:e.nombre}))]} />
          <FormRow>
            <Input label="Universidad" value={form.universidad} onChange={f('universidad')} placeholder="UNC, UBA..." />
            <Input label="Año de egreso" value={form.anio_egreso} onChange={f('anio_egreso')} placeholder="2010" />
          </FormRow>
          <FormRow>
            <Input label="Teléfono" value={form.telefono} onChange={f('telefono')} placeholder="351-000-0000" />
            <Input label="Email institucional *" type="email" value={form.email} onChange={f('email')} error={errors.email} />
          </FormRow>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Días de atención *</label>
            <DiasSelector value={form.dias_atencion} onChange={dias => setForm(prev => ({ ...prev, dias_atencion: dias }))} />
            {errors.dias_atencion && <p className="text-xs text-red-500 mt-1">{errors.dias_atencion}</p>}
          </div>
          <FormRow cols={3}>
            <Input label="Hora inicio" type="time" value={form.hora_inicio} onChange={f('hora_inicio')} />
            <Input label="Hora fin" type="time" value={form.hora_fin} onChange={f('hora_fin')} />
            <Select label="Duración turno (min)" value={form.duracion_turno} onChange={f('duracion_turno')}
              options={[{value:'10',label:'10 min'},{value:'15',label:'15 min'},{value:'20',label:'20 min'},{value:'30',label:'30 min'},{value:'45',label:'45 min'},{value:'60',label:'60 min'}]} />
          </FormRow>
        </div>
      </Modal>

      {/* Modal detalle */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)}
        title={selected ? `Dr/a. ${selected.nombre} ${selected.apellido}` : ''}
        footer={<>
          <Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>
          <Button variant="orange" icon={<Calendar size={14}/>} onClick={() => { setDetailOpen(false); router.push(`/agenda?prof=${selected?.id}`) }}>Ver agenda</Button>
        </>}>
        {selected && (
          <div className="space-y-1">
            {[
              ['Especialidad', (selected as any).especialidad?.nombre || '—'],
              ['Matrícula', selected.matricula],
              ['DNI', selected.dni],
              ['Universidad', selected.universidad || '—'],
              ['Año de egreso', selected.anio_egreso || '—'],
              ['Teléfono', selected.telefono || '—'],
              ['Email', selected.email],
              ['Días de atención', diasLabel(selected.dias_atencion || [])],
              ['Horario', `${selected.hora_inicio} – ${selected.hora_fin}`],
              ['Duración de turno', `${selected.duracion_turno} minutos`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-500">{k}</span>
                <span className="text-xs font-medium text-gray-800 text-right max-w-[60%]">{v}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={deleteOpen} title="Dar de baja profesional"
        description={`¿Confirma dar de baja a Dr/a. ${selected?.apellido}? El registro no se eliminará.`}
        onConfirm={handleDelete} onCancel={() => setDeleteOpen(false)} loading={deleting} />
    </div>
  )
}
