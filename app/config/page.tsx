'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, Save, Users, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button, Input, Card, PageHeader, LoadingSpinner, Modal, Select, FormRow, Badge } from '@/components/ui'
import type { Configuracion, Perfil } from '@/types'

export default function ConfigPage() {
  const supabase = createClient()
  const [config, setConfig] = useState<Record<string,string>>({})
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [modalUser, setModalUser] = useState(false)
  const [savingUser, setSavingUser] = useState(false)
  const [newUser, setNewUser] = useState({ email:'', password:'', nombre:'', apellido:'', rol:'administrativo' })
  const [userError, setUserError] = useState('')

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
      if (p) setUserRole(p.rol)
    }
    const [{ data: cfg }, { data: prfs }] = await Promise.all([
      supabase.from('configuracion').select('*'),
      supabase.from('perfiles').select('*').order('apellido'),
    ])
    if (cfg) {
      const m: Record<string,string> = {}
      cfg.forEach((c: Configuracion) => { m[c.clave] = c.valor || '' })
      setConfig(m)
    }
    if (prfs) setPerfiles(prfs)
    setLoading(false)
  }

  async function handleSaveConfig() {
    setSaving(true)
    const updates = Object.entries(config).map(([clave, valor]) =>
      supabase.from('configuracion').update({ valor }).eq('clave', clave)
    )
    await Promise.all(updates)
    setSaving(false)
    alert('Configuración guardada correctamente.')
  }

  async function handleCreateUser() {
    if (!newUser.email || !newUser.password || !newUser.nombre || !newUser.apellido) {
      setUserError('Completá todos los campos requeridos.'); return
    }
    setSavingUser(true); setUserError('')
    // En producción esto se haría via API route con service role key
    // Acá mostramos el flujo conceptual
    const { data, error } = await supabase.auth.admin?.createUser?.({
      email: newUser.email, password: newUser.password, email_confirm: true,
    }) as any
    if (error) { setUserError('Error al crear usuario: ' + error.message); setSavingUser(false); return }
    if (data?.user) {
      await supabase.from('perfiles').insert({ id: data.user.id, nombre: newUser.nombre, apellido: newUser.apellido, rol: newUser.rol })
    }
    setSavingUser(false); setModalUser(false); init()
  }

  const rolColor: Record<string,string> = { administrador: 'orange', administrativo: 'green', profesional: 'navy' } as any
  const rolLabel: Record<string,string> = { administrador: 'Administrador', administrativo: 'Administrativo', profesional: 'Profesional' }

  if (loading) return <LoadingSpinner />
  if (userRole !== 'administrador') return (
    <div className="p-6 text-center text-gray-500">
      <Settings size={36} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm">Acceso restringido al administrador.</p>
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <PageHeader title="Configuración" subtitle="Datos del centro y usuarios del sistema" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Datos del centro */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-navy mb-4">Datos del centro</h2>
          <div className="space-y-3">
            {[
              { key:'nombre_centro', label:'Nombre del centro' },
              { key:'cuit', label:'CUIT' },
              { key:'direccion', label:'Dirección' },
              { key:'ciudad', label:'Ciudad' },
              { key:'telefono', label:'Teléfono' },
              { key:'email', label:'Email institucional' },
              { key:'horario_atencion', label:'Horario de atención' },
            ].map(({ key, label }) => (
              <Input key={key} label={label} value={config[key] || ''}
                onChange={e => setConfig(p => ({ ...p, [key]: e.target.value }))} />
            ))}
            <div className="grid grid-cols-2 gap-3">
              {[
                { key:'duracion_turno_default', label:'Duración turno (min)' },
                { key:'anticipacion_minima', label:'Anticipación mín. (min)' },
              ].map(({ key, label }) => (
                <Input key={key} label={label} type="number" value={config[key] || ''}
                  onChange={e => setConfig(p => ({ ...p, [key]: e.target.value }))} />
              ))}
            </div>
            <Button onClick={handleSaveConfig} loading={saving} icon={<Save size={14}/>} className="w-full justify-center">
              Guardar cambios
            </Button>
          </div>
        </Card>

        {/* Usuarios */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-navy">Usuarios del sistema</h2>
            <Button size="sm" icon={<Plus size={13}/>} onClick={() => { setNewUser({ email:'', password:'', nombre:'', apellido:'', rol:'administrativo' }); setUserError(''); setModalUser(true) }}>
              Nuevo
            </Button>
          </div>
          <div className="space-y-2">
            {perfiles.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-navy-light text-navy text-xs font-semibold flex items-center justify-center flex-shrink-0">
                  {p.nombre[0]}{p.apellido[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-navy truncate">{p.nombre} {p.apellido}</div>
                  <div className="text-xs text-gray-500">{rolLabel[p.rol]}</div>
                </div>
                <Badge label={rolLabel[p.rol]} variant={rolColor[p.rol] as any} />
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-xs text-amber-700 leading-relaxed">
              <strong>Nota:</strong> Para crear usuarios en producción, configurá una API Route con la Service Role Key de Supabase. Ver README para instrucciones.
            </p>
          </div>
        </Card>
      </div>

      {/* Modal nuevo usuario */}
      <Modal open={modalUser} onClose={() => setModalUser(false)} title="Nuevo usuario del sistema"
        footer={<>
          <Button variant="outline" onClick={() => setModalUser(false)}>Cancelar</Button>
          <Button onClick={handleCreateUser} loading={savingUser}>Crear usuario</Button>
        </>}>
        <div className="space-y-3">
          {userError && <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg">{userError}</div>}
          <FormRow>
            <Input label="Nombre *" value={newUser.nombre} onChange={e => setNewUser(p => ({...p, nombre: e.target.value}))} />
            <Input label="Apellido *" value={newUser.apellido} onChange={e => setNewUser(p => ({...p, apellido: e.target.value}))} />
          </FormRow>
          <Input label="Email *" type="email" value={newUser.email} onChange={e => setNewUser(p => ({...p, email: e.target.value}))} placeholder="usuario@globalmed.com.ar" />
          <Input label="Contraseña *" type="password" value={newUser.password} onChange={e => setNewUser(p => ({...p, password: e.target.value}))} placeholder="Mínimo 8 caracteres" />
          <Select label="Rol *" value={newUser.rol} onChange={e => setNewUser(p => ({...p, rol: e.target.value}))}
            options={[{value:'administrativo',label:'Administrativo'},{value:'profesional',label:'Profesional'},{value:'administrador',label:'Administrador'}]} />
        </div>
      </Modal>
    </div>
  )
}
