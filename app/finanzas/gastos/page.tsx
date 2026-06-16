'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, RefreshCw, AlertCircle, Filter } from 'lucide-react'
import { Button, Modal, Input, Select, FormRow, Card, PageHeader, LoadingSpinner, EmptyState, SearchBar, ConfirmDialog } from '@/components/ui'
import { formatMoney, ESTADO_GASTO_COLOR, type EstadoGasto, type FormaPago } from '@/types/finanzas'
import { formatFecha } from '@/lib/utils'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import type { Gasto, CategoriaGasto } from '@/types/finanzas'

export default function GastosPage() {
  const supabase = createClient()
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroMes, setFiltroMes] = useState(format(new Date(), 'yyyy-MM'))
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editing, setEditing] = useState<Gasto | null>(null)
  const [selected, setSelected] = useState<Gasto | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')

  const emptyForm = {
    fecha: format(new Date(),'yyyy-MM-dd'), categoria_id:'', concepto:'', monto:'',
    forma_pago:'transferencia' as FormaPago, comprobante_nro:'', estado:'pagado' as EstadoGasto,
    fecha_vencimiento:'', es_recurrente:false, recurrencia_dia:'', observaciones:''
  }
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string,string>>({})

  useEffect(() => { init() }, [])
  useEffect(() => { loadGastos() }, [filtroMes, filtroCategoria, filtroEstado])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)
    const { data: cats } = await supabase.from('categorias_gasto').select('*').eq('activa',true).order('orden')
    if (cats) setCategorias(cats)
    setLoading(false)
  }

  async function loadGastos() {
    const start = format(startOfMonth(new Date(filtroMes+'-01')),'yyyy-MM-dd')
    const end = format(endOfMonth(new Date(filtroMes+'-01')),'yyyy-MM-dd')
    let q = supabase.from('gastos').select('*, categoria:categorias_gasto(nombre,tipo,color)').gte('fecha',start).lte('fecha',end)
    if (filtroCategoria) q = q.eq('categoria_id', filtroCategoria)
    if (filtroEstado) q = q.eq('estado', filtroEstado)
    const { data } = await q.order('fecha', {ascending:false})
    if (data) setGastos(data as any)
  }

  const filtered = useMemo(() => {
    if (!search) return gastos
    const q = search.toLowerCase()
    return gastos.filter(g => g.concepto.toLowerCase().includes(q) || (g as any).categoria?.nombre?.toLowerCase().includes(q))
  }, [gastos, search])

  const totalGastos = filtered.reduce((a, g) => a + g.monto, 0)
  const totalPagados = filtered.filter(g=>g.estado==='pagado').reduce((a,g)=>a+g.monto,0)
  const totalPendientes = filtered.filter(g=>g.estado==='pendiente').reduce((a,g)=>a+g.monto,0)
  const totalVencidos = filtered.filter(g=>g.estado==='vencido').reduce((a,g)=>a+g.monto,0)

  function openNew() { setEditing(null); setForm(emptyForm); setErrors({}); setModalOpen(true) }
  function openEdit(g: Gasto) {
    setEditing(g)
    setForm({
      fecha: g.fecha, categoria_id: g.categoria_id, concepto: g.concepto,
      monto: String(g.monto), forma_pago: g.forma_pago as FormaPago,
      comprobante_nro: g.comprobante_nro||'', estado: g.estado,
      fecha_vencimiento: g.fecha_vencimiento||'',
      es_recurrente: g.es_recurrente, recurrencia_dia: String(g.recurrencia_dia||''),
      observaciones: g.observaciones||''
    })
    setErrors({}); setModalOpen(true)
  }

  function validate() {
    const e: Record<string,string> = {}
    if (!form.categoria_id) e.categoria_id = 'Seleccioná una categoría'
    if (!form.concepto.trim()) e.concepto = 'Ingresá el concepto'
    if (!form.monto || parseFloat(form.monto) <= 0) e.monto = 'Ingresá un monto válido'
    if (form.es_recurrente && !form.recurrencia_dia) e.recurrencia_dia = 'Ingresá el día de vencimiento'
    setErrors(e)
    return !Object.keys(e).length
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    const data = {
      fecha: form.fecha, categoria_id: form.categoria_id, concepto: form.concepto.trim(),
      monto: parseFloat(form.monto), forma_pago: form.forma_pago,
      comprobante_nro: form.comprobante_nro||null, estado: form.estado,
      fecha_vencimiento: form.fecha_vencimiento||null,
      es_recurrente: form.es_recurrente,
      recurrencia_dia: form.es_recurrente ? parseInt(form.recurrencia_dia)||null : null,
      observaciones: form.observaciones||null,
      registrado_por: currentUserId||null,
    }
    if (editing) {
      await supabase.from('gastos').update(data).eq('id', editing.id)
    } else {
      await supabase.from('gastos').insert(data)
    }
    setSaving(false); setModalOpen(false); loadGastos()
  }

  async function handleDelete() {
    if (!selected) return
    setDeleting(true)
    await supabase.from('gastos').delete().eq('id', selected.id)
    setDeleting(false); setDeleteOpen(false); setSelected(null); loadGastos()
  }

  async function marcarPagado(id: string) {
    await supabase.from('gastos').update({ estado: 'pagado', fecha: format(new Date(),'yyyy-MM-dd') }).eq('id', id)
    loadGastos()
  }

  const ff = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => setForm(p=>({...p,[k]:e.target.value}))

  if (loading) return <LoadingSpinner/>

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader title="Gastos del centro" subtitle={`${filtered.length} registros · ${formatMoney(totalGastos)} en el período`}
        action={<Button icon={<Plus size={15}/>} onClick={openNew}>Nuevo gasto</Button>} />

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-3"><div className="text-xs text-gray-500">Total período</div><div className="text-lg font-bold text-navy">{formatMoney(totalGastos)}</div></div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-3"><div className="text-xs text-green-600">Pagados</div><div className="text-lg font-bold text-green-700">{formatMoney(totalPagados)}</div></div>
        <div className="bg-orange-50 rounded-xl border border-orange-100 p-3"><div className="text-xs text-orange-600">Pendientes</div><div className="text-lg font-bold text-orange-700">{formatMoney(totalPendientes)}</div></div>
        {totalVencidos > 0 && <div className="bg-red-50 rounded-xl border border-red-200 p-3"><div className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={11}/> Vencidos</div><div className="text-lg font-bold text-red-700">{formatMoney(totalVencidos)}</div></div>}
      </div>

      {/* Filtros */}
      <Card className="p-3 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mes</label>
            <input type="month" value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-navy"/>
          </div>
          <Select label="Categoría" value={filtroCategoria} onChange={e=>setFiltroCategoria(e.target.value)}
            options={[{value:'',label:'Todas las categorías'},...categorias.map(c=>({value:c.id,label:c.nombre}))]}/>
          <Select label="Estado" value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}
            options={[{value:'',label:'Todos'},{value:'pagado',label:'Pagados'},{value:'pendiente',label:'Pendientes'},{value:'vencido',label:'Vencidos'}]}/>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Buscar</label>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Concepto..."
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-navy"/></div>
        </div>
      </Card>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {filtered.map(g => (
          <Card key={g.id} className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{background:(g as any).categoria?.color||'#6c757d'}}/>
                <div>
                  <div className="text-sm font-medium text-navy">{g.concepto}</div>
                  <div className="text-xs text-gray-500">{(g as any).categoria?.nombre} · {formatFecha(g.fecha)}</div>
                  {g.es_recurrente && <div className="text-[10px] text-orange-500 flex items-center gap-0.5 mt-0.5"><RefreshCw size={9}/> Recurrente · día {g.recurrencia_dia}</div>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-navy">{formatMoney(g.monto)}</div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ESTADO_GASTO_COLOR[g.estado as EstadoGasto]}`}>{g.estado}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              {g.estado !== 'pagado' && <Button size="sm" variant="success" onClick={()=>marcarPagado(g.id)}>Marcar pagado</Button>}
              <Button size="sm" variant="outline" icon={<Pencil size={12}/>} onClick={()=>openEdit(g)}>Editar</Button>
              <Button size="sm" variant="outline" icon={<Trash2 size={12}/>} onClick={()=>{setSelected(g);setDeleteOpen(true)}}/>
            </div>
          </Card>
        ))}
        {filtered.length===0 && <EmptyState icon={<Filter size={32}/>} title="Sin gastos" description="Ajustá los filtros o registrá un nuevo gasto" action={<Button onClick={openNew} icon={<Plus size={14}/>}>Nuevo gasto</Button>}/>}
      </div>

      {/* Desktop */}
      <Card className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Fecha','Categoría','Concepto','Monto','Forma de pago','Comprobante','Estado',''].map(h=>(
                  <th key={h} className="text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0 ? (
                <tr><td colSpan={8}><EmptyState icon={<Filter size={32}/>} title="Sin gastos en el período" action={<Button onClick={openNew} icon={<Plus size={14}/>}>Nuevo gasto</Button>}/></td></tr>
              ) : filtered.map((g,i)=>(
                <tr key={g.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 ${i%2===1?'bg-gray-50/30':''} ${g.estado==='vencido'?'bg-red-50/30':''}`}>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatFecha(g.fecha)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:(g as any).categoria?.color||'#6c757d'}}/>
                      <span className="text-xs text-gray-700">{(g as any).categoria?.nombre}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 ml-3.5">{(g as any).categoria?.tipo || 'variable'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-navy">{g.concepto}</div>
                    {g.es_recurrente && <div className="text-[10px] text-orange-500 flex items-center gap-0.5 mt-0.5"><RefreshCw size={9}/> Recurrente · día {g.recurrencia_dia}</div>}
                    {g.observaciones && <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[180px]">{g.observaciones}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-navy whitespace-nowrap">{formatMoney(g.monto)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 capitalize">{g.forma_pago?.replace('_',' ')}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{g.comprobante_nro||'—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_GASTO_COLOR[g.estado as EstadoGasto]}`}>
                      {g.estado.charAt(0).toUpperCase()+g.estado.slice(1)}
                    </span>
                    {g.fecha_vencimiento && g.estado!=='pagado' && (
                      <div className="text-[10px] text-gray-400 mt-0.5">Vence: {formatFecha(g.fecha_vencimiento)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {g.estado!=='pagado' && <button onClick={()=>marcarPagado(g.id)} className="text-[10px] px-2 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium whitespace-nowrap">Marcar pagado</button>}
                      <button onClick={()=>openEdit(g)} className="p-1.5 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-lg"><Pencil size={13}/></button>
                      <button onClick={()=>{setSelected(g);setDeleteOpen(true)}} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal nuevo/editar */}
      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} size="md"
        title={editing?`Editar gasto`:'Nuevo gasto'}
        footer={<><Button variant="outline" onClick={()=>setModalOpen(false)}>Cancelar</Button><Button onClick={handleSave} loading={saving}>{editing?'Guardar cambios':'Registrar gasto'}</Button></>}>
        <div className="space-y-3">
          <FormRow>
            <Input label="Fecha *" type="date" value={form.fecha} onChange={ff('fecha')}/>
            <Select label="Categoría *" value={form.categoria_id} onChange={ff('categoria_id')} error={errors.categoria_id}
              options={[{value:'',label:'— Seleccionar —'},...categorias.map(c=>({value:c.id,label:c.nombre}))]}/>
          </FormRow>
          <Input label="Concepto *" value={form.concepto} onChange={ff('concepto')} error={errors.concepto}
            placeholder="Ej: Alquiler junio 2026, Sueldo secretaria..."/>
          <FormRow>
            <Input label="Monto *" type="number" value={form.monto} onChange={ff('monto')} error={errors.monto} placeholder="0"/>
            <Select label="Forma de pago" value={form.forma_pago} onChange={ff('forma_pago')}
              options={[{value:'efectivo',label:'Efectivo'},{value:'transferencia',label:'Transferencia'},{value:'tarjeta',label:'Tarjeta'},{value:'cheque',label:'Cheque'},{value:'debito_automatico',label:'Débito automático'}]}/>
          </FormRow>
          <FormRow>
            <Input label="Nro. comprobante" value={form.comprobante_nro} onChange={ff('comprobante_nro')} placeholder="Nro. factura o recibo"/>
            <Select label="Estado" value={form.estado} onChange={ff('estado')}
              options={[{value:'pagado',label:'Pagado'},{value:'pendiente',label:'Pendiente'},{value:'vencido',label:'Vencido'}]}/>
          </FormRow>
          {(form.estado==='pendiente'||form.estado==='vencido') && (
            <Input label="Fecha de vencimiento" type="date" value={form.fecha_vencimiento} onChange={ff('fecha_vencimiento')}/>
          )}
          <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
            <input type="checkbox" id="recurrente" checked={form.es_recurrente}
              onChange={e=>setForm(p=>({...p,es_recurrente:e.target.checked}))} className="rounded"/>
            <label htmlFor="recurrente" className="text-xs font-medium text-orange-800 cursor-pointer flex items-center gap-1.5">
              <RefreshCw size={13}/> Gasto recurrente mensual (se genera solo cada mes)
            </label>
          </div>
          {form.es_recurrente && (
            <Input label="Día de vencimiento cada mes *" type="number" min="1" max="31"
              value={form.recurrencia_dia} onChange={ff('recurrencia_dia')} error={errors.recurrencia_dia}
              placeholder="Ej: 5 (vence el día 5 de cada mes)" hint="Se generará automáticamente al inicio de cada mes"/>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Observaciones</label>
            <textarea value={form.observaciones} onChange={ff('observaciones')} rows={2}
              placeholder="Notas adicionales..." className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-navy resize-none"/>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={deleteOpen} title="Eliminar gasto"
        description={`¿Eliminar "${selected?.concepto}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete} onCancel={()=>setDeleteOpen(false)} loading={deleting}/>
    </div>
  )
}
