'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, Eye, CalendarPlus, FileText, Pencil, Trash2 } from 'lucide-react'
import { Button, Modal, Input, Select, FormRow, SearchBar, PageHeader, EmptyState, LoadingSpinner, Badge, Card, ConfirmDialog } from '@/components/ui'
import { formatFecha, calcularEdad, GRUPOS_SANGUINEOS } from '@/lib/utils'
import type { Paciente, ObraSocial, Profesional } from '@/types'

const SEXO_OPT = [{ value:'', label:'— Sexo —' }, { value:'M', label:'Masculino' }, { value:'F', label:'Femenino' }, { value:'Otro', label:'Otro' }]

export default function PacientesPage() {
  const supabase = createClient()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [obras, setObras] = useState<ObraSocial[]>([])
  const [profesionales, setProfesionales] = useState<Profesional[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editing, setEditing] = useState<Paciente | null>(null)
  const [selected, setSelected] = useState<Paciente | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [userRole, setUserRole] = useState<string>('')

  // Form state
  const emptyForm = { nombre:'', apellido:'', dni:'', fecha_nacimiento:'', sexo:'', telefono:'', email:'', direccion:'', ciudad:'', obra_social_id:'', numero_afiliado:'', grupo_sanguineo:'', medico_cabecera_id:'' }
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string,string>>({})

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
      if (p) setUserRole(p.rol)
    }
    const [{ data: pacs }, { data: obs }, { data: profs }] = await Promise.all([
      supabase.from('pacientes').select('*, obra_social:obras_sociales(id,nombre), medico_cabecera:profesionales(id,nombre,apellido)').eq('activo', true).order('apellido'),
      supabase.from('obras_sociales').select('*').eq('activa', true).order('nombre'),
      supabase.from('profesionales').select('id,nombre,apellido,especialidad:especialidades(nombre)').eq('activo', true).order('apellido'),
    ])
    if (pacs) setPacientes(pacs as any)
    if (obs) setObras(obs)
    if (profs) setProfesionales(profs as any)
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (!search) return pacientes
    const q = search.toLowerCase()
    return pacientes.filter(p =>
      `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ||
      p.dni.includes(q) ||
      (p as any).obra_social?.nombre?.toLowerCase().includes(q)
    )
  }, [pacientes, search])

  function openNew() {
    setEditing(null); setForm(emptyForm); setErrors({}); setModalOpen(true)
  }
  function openEdit(p: Paciente) {
    setEditing(p)
    setForm({
      nombre: p.nombre, apellido: p.apellido, dni: p.dni,
      fecha_nacimiento: p.fecha_nacimiento, sexo: p.sexo || '',
      telefono: p.telefono || '', email: p.email || '',
      direccion: p.direccion || '', ciudad: p.ciudad || '',
      obra_social_id: p.obra_social_id || '', numero_afiliado: p.numero_afiliado || '',
      grupo_sanguineo: p.grupo_sanguineo || '', medico_cabecera_id: p.medico_cabecera_id || '',
    })
    setErrors({}); setModalOpen(true)
  }

  function validate() {
    const e: Record<string,string> = {}
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!form.apellido.trim()) e.apellido = 'Requerido'
    if (!form.dni.trim()) e.dni = 'Requerido'
    else if (!/^\d{7,9}$/.test(form.dni.replace(/\D/g,''))) e.dni = 'DNI inválido'
    if (!form.fecha_nacimiento) e.fecha_nacimiento = 'Requerido'
    if (!form.obra_social_id) e.obra_social_id = 'Requerido'
    if (!editing && pacientes.some(p => p.dni.replace(/\D/g,'') === form.dni.replace(/\D/g,''))) e.dni = 'Ya existe un paciente con ese DNI'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    const data = { ...form, dni: form.dni.replace(/\D/g,''), activo: true }
    if (editing) {
      await supabase.from('pacientes').update(data).eq('id', editing.id)
    } else {
      await supabase.from('pacientes').insert(data)
    }
    setSaving(false); setModalOpen(false); init()
  }

  async function handleDelete() {
    if (!selected) return
    setDeleting(true)
    await supabase.from('pacientes').update({ activo: false }).eq('id', selected.id)
    setDeleting(false); setDeleteOpen(false); setSelected(null); init()
  }

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Pacientes"
        subtitle={`${pacientes.length} registrados`}
        action={<Button icon={<Plus size={15}/>} onClick={openNew}>Nuevo paciente</Button>}
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre, DNI u obra social..." />

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <EmptyState icon={<Users size={36}/>} title="Sin resultados" description="Probá con otra búsqueda" />
        ) : filtered.map(p => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-navy-light text-navy text-sm font-semibold flex items-center justify-center flex-shrink-0">
                  {p.nombre[0]}{p.apellido[0]}
                </div>
                <div>
                  <div className="text-sm font-medium text-navy">{p.apellido}, {p.nombre}</div>
                  <div className="text-xs text-gray-500">DNI {p.dni} · {calcularEdad(p.fecha_nacimiento)} años</div>
                  <div className="text-xs text-gray-400 mt-0.5">{(p as any).obra_social?.nombre}</div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button size="sm" variant="outline" icon={<Eye size={13}/>} onClick={() => { setSelected(p); setDetailOpen(true) }}>Ver</Button>
              <Button size="sm" variant="outline" icon={<Pencil size={13}/>} onClick={() => openEdit(p)}>Editar</Button>
              {userRole !== 'administrativo' && <Button size="sm" variant="outline" icon={<FileText size={13}/>}>Notas</Button>}
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Paciente','DNI','Obra social','Nacimiento','Edad','Teléfono','Acciones'].map(h => (
                  <th key={h} className="text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={<Users size={36}/>} title="Sin resultados" description="No se encontraron pacientes" action={<Button onClick={openNew} icon={<Plus size={14}/>}>Nuevo paciente</Button>} /></td></tr>
              ) : filtered.map((p, i) => (
                <tr key={p.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors ${i%2===1?'bg-gray-50/30':''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-navy-light text-navy text-xs font-semibold flex items-center justify-center flex-shrink-0">
                        {p.nombre[0]}{p.apellido[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-navy">{p.apellido}, {p.nombre}</div>
                        <div className="text-xs text-gray-400">{p.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.dni}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{(p as any).obra_social?.nombre || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatFecha(p.fecha_nacimiento)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{calcularEdad(p.fecha_nacimiento)} años</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.telefono || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { setSelected(p); setDetailOpen(true) }} title="Ver detalle"
                        className="p-1.5 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors">
                        <Eye size={14}/>
                      </button>
                      <button onClick={() => openEdit(p)} title="Editar"
                        className="p-1.5 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors">
                        <Pencil size={14}/>
                      </button>
                      {userRole !== 'administrativo' && (
                        <button title="Notas clínicas"
                          className="p-1.5 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors">
                          <FileText size={14}/>
                        </button>
                      )}
                      <button onClick={() => { setSelected(p); setDeleteOpen(true) }} title="Dar de baja"
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14}/>
                      </button>
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
        title={editing ? `Editar: ${editing.apellido}, ${editing.nombre}` : 'Nuevo paciente'}
        footer={<>
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? 'Guardar cambios' : 'Registrar paciente'}</Button>
        </>}>
        <div className="space-y-3">
          <FormRow>
            <Input label="Nombre *" value={form.nombre} onChange={f('nombre')} error={errors.nombre} placeholder="Nombre" />
            <Input label="Apellido *" value={form.apellido} onChange={f('apellido')} error={errors.apellido} placeholder="Apellido" />
          </FormRow>
          <FormRow>
            <Input label="DNI *" value={form.dni} onChange={f('dni')} error={errors.dni} placeholder="Sin puntos ni espacios" />
            <Input label="Fecha de nacimiento *" type="date" value={form.fecha_nacimiento} onChange={f('fecha_nacimiento')} error={errors.fecha_nacimiento} />
          </FormRow>
          <FormRow>
            <Select label="Sexo" value={form.sexo} onChange={f('sexo')} options={SEXO_OPT} />
            <Select label="Grupo sanguíneo" value={form.grupo_sanguineo} onChange={f('grupo_sanguineo')}
              options={[{value:'',label:'— Seleccionar —'}, ...GRUPOS_SANGUINEOS.map(g => ({value:g,label:g}))]} />
          </FormRow>
          <FormRow>
            <Input label="Teléfono" value={form.telefono} onChange={f('telefono')} placeholder="351-000-0000" />
            <Input label="Email" type="email" value={form.email} onChange={f('email')} placeholder="email@ejemplo.com" />
          </FormRow>
          <FormRow>
            <Select label="Obra social *" value={form.obra_social_id} onChange={f('obra_social_id')} error={errors.obra_social_id}
              options={[{value:'',label:'— Seleccionar obra social —'}, ...obras.map(o => ({value:o.id,label:o.nombre}))]} />
            <Input label="Nro. de afiliado" value={form.numero_afiliado} onChange={f('numero_afiliado')} placeholder="Número de afiliado" />
          </FormRow>
          <FormRow>
            <Input label="Dirección" value={form.direccion} onChange={f('direccion')} placeholder="Calle y número" />
            <Input label="Ciudad" value={form.ciudad} onChange={f('ciudad')} placeholder="Ciudad" />
          </FormRow>
          <Select label="Médico de cabecera" value={form.medico_cabecera_id} onChange={f('medico_cabecera_id')}
            options={[{value:'',label:'— Sin asignar —'}, ...profesionales.map(p => ({value:p.id,label:`Dr/a. ${p.apellido}, ${p.nombre}`}))]} />
        </div>
      </Modal>

      {/* Modal detalle */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={selected ? `${selected.apellido}, ${selected.nombre}` : ''}
        footer={<>
          <Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>
          <Button variant="orange" icon={<CalendarPlus size={14}/>} onClick={() => setDetailOpen(false)}>Dar turno</Button>
          {userRole !== 'administrativo' && <Button icon={<FileText size={14}/>} onClick={() => setDetailOpen(false)}>Notas</Button>}
        </>}>
        {selected && (
          <div className="space-y-1">
            {[
              ['DNI', selected.dni],
              ['Nacimiento', `${formatFecha(selected.fecha_nacimiento)} (${calcularEdad(selected.fecha_nacimiento)} años)`],
              ['Sexo', selected.sexo || '—'],
              ['Teléfono', selected.telefono || '—'],
              ['Email', selected.email || '—'],
              ['Obra social', (selected as any).obra_social?.nombre || '—'],
              ['Nro. afiliado', selected.numero_afiliado || '—'],
              ['Grupo sanguíneo', selected.grupo_sanguineo || '—'],
              ['Dirección', selected.direccion || '—'],
              ['Ciudad', selected.ciudad || '—'],
              ['Médico cabecera', (selected as any).medico_cabecera ? `Dr/a. ${(selected as any).medico_cabecera.apellido}` : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-500">{k}</span>
                <span className="text-xs font-medium text-gray-800 text-right max-w-[60%]">{v}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={deleteOpen} title="Dar de baja paciente"
        description={`¿Confirma dar de baja a ${selected?.apellido}, ${selected?.nombre}? El registro no se eliminará permanentemente.`}
        onConfirm={handleDelete} onCancel={() => setDeleteOpen(false)} loading={deleting} />
    </div>
  )
}
