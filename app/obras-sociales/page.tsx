'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, Check, X, Building2 } from 'lucide-react'
import type { ObraSocial } from '@/types'

export default function ObrasSocialesPage() {
  const [obras, setObras] = useState<ObraSocial[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editCodigo, setEditCodigo] = useState('')
  const [newNombre, setNewNombre] = useState('')
  const [newCodigo, setNewCodigo] = useState('')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function loadObras() {
    const { data } = await supabase.from('obras_sociales').select('*').order('nombre')
    if (data) setObras(data)
    setLoading(false)
  }

  useEffect(() => { loadObras() }, [])

  async function handleAdd() {
    if (!newNombre.trim()) return
    setSaving(true)
    const { error } = await supabase.from('obras_sociales').insert({ nombre: newNombre.trim(), codigo: newCodigo.trim() || null })
    if (!error) { setNewNombre(''); setNewCodigo(''); setAdding(false); loadObras() }
    setSaving(false)
  }

  async function handleEdit(id: string) {
    if (!editNombre.trim()) return
    setSaving(true)
    await supabase.from('obras_sociales').update({ nombre: editNombre.trim(), codigo: editCodigo.trim() || null }).eq('id', id)
    setEditId(null); loadObras(); setSaving(false)
  }

  async function handleToggle(id: string, activa: boolean) {
    await supabase.from('obras_sociales').update({ activa: !activa }).eq('id', id)
    loadObras()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta obra social?')) return
    await supabase.from('obras_sociales').delete().eq('id', id)
    loadObras()
  }

  function startEdit(o: ObraSocial) {
    setEditId(o.id); setEditNombre(o.nombre); setEditCodigo(o.codigo || '')
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-navy/30 border-t-navy rounded-full animate-spin" /></div>

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-navy">Obras sociales</h1>
          <p className="text-xs text-gray-500 mt-0.5">{obras.length} registradas</p>
        </div>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-3 py-2 bg-navy text-white text-xs font-medium rounded-lg hover:bg-navy-mid transition-colors">
          <Plus size={15} /> Nueva
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Formulario nueva */}
        {adding && (
          <div className="flex items-center gap-3 p-4 bg-orange-50 border-b border-orange-100">
            <Building2 size={16} className="text-orange-400 flex-shrink-0" />
            <input autoFocus value={newNombre} onChange={e => setNewNombre(e.target.value)}
              placeholder="Nombre de la obra social"
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-navy"
              onKeyDown={e => { if(e.key==='Enter') handleAdd(); if(e.key==='Escape') setAdding(false) }}
            />
            <input value={newCodigo} onChange={e => setNewCodigo(e.target.value)}
              placeholder="Código (opcional)"
              className="w-28 text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-navy"
            />
            <button onClick={handleAdd} disabled={saving}
              className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600">
              <Check size={15} />
            </button>
            <button onClick={() => setAdding(false)} className="p-1.5 text-gray-500 hover:text-gray-700">
              <X size={15} />
            </button>
          </div>
        )}

        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Nombre</th>
              <th className="text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Código</th>
              <th className="text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {obras.map((o, i) => (
              <tr key={o.id} className={`border-b border-gray-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                {editId === o.id ? (
                  <>
                    <td className="px-4 py-2.5" colSpan={2}>
                      <div className="flex gap-2">
                        <input value={editNombre} onChange={e => setEditNombre(e.target.value)} autoFocus
                          className="flex-1 text-sm border border-navy rounded-lg px-3 py-1.5 outline-none"
                          onKeyDown={e => { if(e.key==='Enter') handleEdit(o.id); if(e.key==='Escape') setEditId(null) }}
                        />
                        <input value={editCodigo} onChange={e => setEditCodigo(e.target.value)}
                          className="w-24 text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none"
                          placeholder="Código"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2.5" />
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button onClick={() => handleEdit(o.id)} disabled={saving}
                          className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditId(null)} className="p-1.5 text-gray-400 hover:text-gray-600">
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{o.nombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{o.codigo || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggle(o.id, o.activa)}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                          o.activa ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}>
                        {o.activa ? 'Activa' : 'Inactiva'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button onClick={() => startEdit(o)}
                          className="p-1.5 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(o.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
