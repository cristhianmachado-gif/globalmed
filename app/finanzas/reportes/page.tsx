'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileDown, BarChart2, TrendingUp, Building2, Users, DollarSign, Receipt, Wallet } from 'lucide-react'
import { Button, Card, PageHeader, LoadingSpinner, Select, Input, FormRow } from '@/components/ui'
import { formatMoney, MESES_LABEL } from '@/types/finanzas'
import { formatFecha } from '@/lib/utils'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'

// ─── PDF Export usando jsPDF + autoTable ─────────────────────────────────────
async function exportarPDF(titulo: string, columnas: string[], filas: any[][], totales?: Record<string,string>) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: columnas.length > 6 ? 'landscape' : 'portrait' })

  // Header
  doc.setFillColor(26, 46, 74)
  doc.rect(0, 0, doc.internal.pageSize.width, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14); doc.setFont('helvetica','bold')
  doc.text('GlobalMed', 14, 11)
  doc.setFontSize(10); doc.setFont('helvetica','normal')
  doc.text('Centro de Salud', 14, 17)
  doc.setFontSize(12); doc.setFont('helvetica','bold')
  doc.text(titulo, 14, 24)

  // Meta
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(8); doc.setFont('helvetica','normal')
  const fechaGen = format(new Date(), 'dd/MM/yyyy HH:mm')
  doc.text(`Generado: ${fechaGen}`, doc.internal.pageSize.width - 14, 24, { align: 'right' })

  // Tabla
  autoTable(doc, {
    startY: 32,
    head: [columnas],
    body: filas,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [26, 46, 74], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    columnStyles: { 0: { cellWidth: 'auto' } },
  })

  // Totales
  if (totales) {
    const finalY = (doc as any).lastAutoTable.finalY + 6
    doc.setFontSize(9); doc.setFont('helvetica','bold')
    doc.setTextColor(26, 46, 74)
    Object.entries(totales).forEach(([k,v], i) => {
      doc.text(`${k}: ${v}`, 14, finalY + i * 6)
    })
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8); doc.setTextColor(150)
    doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8, { align: 'center' })
    doc.text('GlobalMed © ' + new Date().getFullYear(), 14, doc.internal.pageSize.height - 8)
  }

  doc.save(`${titulo.replace(/\s+/g,'-').toLowerCase()}-${format(new Date(),'yyyyMMdd')}.pdf`)
}

// ─── Tipos de reporte ─────────────────────────────────────────────────────────
const REPORTES = [
  { id:'caja',         label:'Caja del período',        icon:<DollarSign size={18}/>,  desc:'Todos los cobros agrupados por día y forma de pago' },
  { id:'coseguros',    label:'Coseguros por OS',         icon:<Building2 size={18}/>,   desc:'Coseguros cobrados por obra social' },
  { id:'cta_cte_os',  label:'Cuenta corriente OS',      icon:<Receipt size={18}/>,     desc:'Facturado vs cobrado con saldo pendiente por OS' },
  { id:'gastos',       label:'Gastos por categoría',     icon:<Wallet size={18}/>,      desc:'Todos los gastos del período agrupados por categoría' },
  { id:'resultado',    label:'Resultado neto',           icon:<TrendingUp size={18}/>,  desc:'Ingresos − Egresos = Resultado del período' },
  { id:'produccion',   label:'Producción profesional',   icon:<Users size={18}/>,       desc:'Prestaciones, total generado y honorarios por médico' },
  { id:'senias',       label:'Señas del período',        icon:<BarChart2 size={18}/>,   desc:'Estado de todas las señas' },
  { id:'liquidaciones',label:'Liquidaciones a OS',       icon:<Receipt size={18}/>,     desc:'Detalle de liquidaciones presentadas a obras sociales' },
]

export default function ReportesPage() {
  const supabase = createClient()
  const [loadingReport, setLoadingReport] = useState<string>('')
  const [mesDesde, setMesDesde] = useState(format(subMonths(new Date(),1),'yyyy-MM'))
  const [mesHasta, setMesHasta] = useState(format(new Date(),'yyyy-MM'))

  async function generarReporte(id: string) {
    setLoadingReport(id)
    try {
      const desde = format(startOfMonth(new Date(mesDesde+'-01')),'yyyy-MM-dd')
      const hasta = format(endOfMonth(new Date(mesHasta+'-01')),'yyyy-MM-dd')

      if (id === 'caja') {
        const { data } = await supabase.from('cobros_paciente')
          .select('fecha_cobro, concepto, monto_cobrado, forma_pago, turno:turnos(paciente:pacientes(nombre,apellido,dni), profesional:profesionales(nombre,apellido))')
          .gte('fecha_cobro', desde).lte('fecha_cobro', hasta).in('estado',['cobrado','parcial']).order('fecha_cobro')
        const filas = (data||[]).map((c:any) => [
          formatFecha(c.fecha_cobro), `${c.turno?.paciente?.apellido||''}, ${c.turno?.paciente?.nombre||''}`,
          `Dr/a. ${c.turno?.profesional?.apellido||''}`, c.concepto==='particular'?'Particular':'Coseguro',
          c.forma_pago?.replace('_',' ')||'—', formatMoney(c.monto_cobrado)
        ])
        const total = (data||[]).reduce((a:number,c:any)=>a+c.monto_cobrado,0)
        await exportarPDF(`Caja ${mesDesde} a ${mesHasta}`,
          ['Fecha','Paciente','Profesional','Concepto','Forma de pago','Monto'], filas,
          { 'TOTAL COBRADO': formatMoney(total) })
      }

      else if (id === 'coseguros') {
        const { data } = await supabase.from('cobros_paciente')
          .select('monto_cobrado, turno:turnos(paciente:pacientes(obra_social:obras_sociales(nombre)))')
          .eq('concepto','coseguro').gte('fecha_cobro',desde).lte('fecha_cobro',hasta).in('estado',['cobrado','parcial'])
        const map: Record<string,number> = {}
        ;(data||[]).forEach((c:any)=>{ const os=c.turno?.paciente?.obra_social?.nombre||'Sin OS'; map[os]=(map[os]||0)+c.monto_cobrado })
        const filas = Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([os,monto])=>[os, formatMoney(monto)])
        const total = Object.values(map).reduce((a,b)=>a+b,0)
        await exportarPDF(`Coseguros por OS ${mesDesde} a ${mesHasta}`, ['Obra social','Total coseguros'], filas, {'TOTAL':formatMoney(total)})
      }

      else if (id === 'cta_cte_os') {
        const { data } = await supabase.from('v_cuenta_corriente_os').select('*')
        const filas = (data||[]).map((r:any)=>[r.obra_social, String(r.total_liquidaciones), formatMoney(r.total_facturado), formatMoney(r.total_cobrado), formatMoney(r.saldo_pendiente)])
        const total = (data||[]).reduce((a:number,r:any)=>a+r.saldo_pendiente,0)
        await exportarPDF('Cuenta corriente por obra social', ['Obra social','Liq.','Facturado','Cobrado','Saldo pendiente'], filas, {'SALDO TOTAL PENDIENTE':formatMoney(total)})
      }

      else if (id === 'gastos') {
        const { data } = await supabase.from('gastos').select('fecha,concepto,monto,forma_pago,estado,categoria:categorias_gasto(nombre,tipo)').gte('fecha',desde).lte('fecha',hasta).order('categoria_id').order('fecha')
        const filas = (data||[]).map((g:any)=>[formatFecha(g.fecha),(g.categoria?.nombre||'—'),(g.categoria?.tipo||'—'),g.concepto,formatMoney(g.monto),g.forma_pago?.replace('_',' ')||'—',g.estado])
        const total = (data||[]).reduce((a:number,g:any)=>a+g.monto,0)
        await exportarPDF(`Gastos ${mesDesde} a ${mesHasta}`, ['Fecha','Categoría','Tipo','Concepto','Monto','Forma de pago','Estado'], filas, {'TOTAL GASTOS':formatMoney(total)})
      }

      else if (id === 'resultado') {
        const [{ data: cobros }, { data: pagosOS }, { data: gastos }] = await Promise.all([
          supabase.from('cobros_paciente').select('monto_cobrado,concepto').gte('fecha_cobro',desde).lte('fecha_cobro',hasta).in('estado',['cobrado','parcial']),
          supabase.from('pagos_os').select('monto_pagado').gte('fecha_pago',desde).lte('fecha_pago',hasta),
          supabase.from('gastos').select('monto,categoria:categorias_gasto(nombre)').gte('fecha',desde).lte('fecha',hasta).eq('estado','pagado'),
        ])
        const totalCobros = (cobros||[]).reduce((a:number,c:any)=>a+c.monto_cobrado,0)
        const totalOS = (pagosOS||[]).reduce((a:number,p:any)=>a+p.monto_pagado,0)
        const totalGastos = (gastos||[]).reduce((a:number,g:any)=>a+g.monto,0)
        const coseguros = (cobros||[]).filter((c:any)=>c.concepto==='coseguro').reduce((a:number,c:any)=>a+c.monto_cobrado,0)
        const particulares = (cobros||[]).filter((c:any)=>c.concepto==='particular').reduce((a:number,c:any)=>a+c.monto_cobrado,0)
        const resultado = totalCobros + totalOS - totalGastos
        const filas = [
          ['INGRESOS','',''],
          ['Coseguros cobrados','',formatMoney(coseguros)],
          ['Particulares cobrados','',formatMoney(particulares)],
          ['Cobros de obras sociales','',formatMoney(totalOS)],
          ['SUBTOTAL INGRESOS','',formatMoney(totalCobros+totalOS)],
          ['','',''],
          ['EGRESOS','',''],
          ['Total gastos del período','',formatMoney(totalGastos)],
          ['','',''],
          ['RESULTADO NETO DEL PERÍODO','',formatMoney(resultado)],
        ]
        await exportarPDF(`Resultado neto ${mesDesde} a ${mesHasta}`, ['Concepto','Detalle','Monto'], filas)
      }

      else if (id === 'produccion') {
        const { data } = await supabase.from('v_produccion_profesional').select('*')
        const filas = (data||[]).map((p:any)=>[p.profesional,p.especialidad||'—',String(p.total_prestaciones),formatMoney(p.total_generado),formatMoney(p.honorarios_profesional),formatMoney(p.ingreso_centro)])
        await exportarPDF('Producción por profesional', ['Profesional','Especialidad','Prestaciones','Total generado','Honorarios prof.','Ingreso centro'], filas)
      }

      else if (id === 'senias') {
        const { data } = await supabase.from('senias').select('*, paciente:pacientes(nombre,apellido,dni)').gte('fecha_cobro',desde).lte('fecha_cobro',hasta).order('fecha_cobro')
        const filas = (data||[]).map((s:any)=>[formatFecha(s.fecha_cobro),`${s.paciente?.apellido||''}, ${s.paciente?.nombre||''}`,formatMoney(s.monto),s.forma_pago||'—',s.estado,s.motivo_devolucion||'—'])
        const total = (data||[]).reduce((a:number,s:any)=>a+s.monto,0)
        await exportarPDF(`Señas ${mesDesde} a ${mesHasta}`, ['Fecha','Paciente','Monto','Forma pago','Estado','Motivo dev.'], filas, {'TOTAL SEÑAS':formatMoney(total)})
      }

      else if (id === 'liquidaciones') {
        const { data } = await supabase.from('liquidaciones').select('*, obra_social:obras_sociales(nombre), pagos:pagos_os(monto_pagado)').order('periodo_anio').order('periodo_mes')
        const filas = (data||[]).map((l:any)=>{
          const cobrado = (l.pagos||[]).reduce((a:number,p:any)=>a+p.monto_pagado,0)
          return [`${MESES_LABEL[l.periodo_mes-1]} ${l.periodo_anio}`,l.obra_social?.nombre||'—',String(l.total_prestaciones),formatMoney(l.total_facturado),formatMoney(cobrado),formatMoney(l.total_facturado-cobrado),l.estado]
        })
        await exportarPDF('Liquidaciones a obras sociales', ['Período','Obra social','Prestaciones','Facturado','Cobrado','Diferencia','Estado'], filas)
      }

    } catch (err) {
      console.error('Error generando reporte:', err)
      alert('Error al generar el reporte. Verificá que los datos existan.')
    }
    setLoadingReport('')
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <PageHeader title="Reportes financieros" subtitle="Exportación a PDF con datos en tiempo real" />

      {/* Rango de fechas */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <BarChart2 size={15} className="text-gray-400"/>
          <span className="text-xs font-medium text-gray-600">Período para los reportes</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Desde</label>
            <input type="month" value={mesDesde} onChange={e=>setMesDesde(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-navy"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Hasta</label>
            <input type="month" value={mesHasta} onChange={e=>setMesHasta(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-navy"/>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Los datos de "Cuenta corriente OS" y "Producción profesional" son acumulativos y no filtran por período.
        </p>
      </Card>

      {/* Grid de reportes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTES.map(r => (
          <Card key={r.id} className="p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-navy-light text-navy flex items-center justify-center flex-shrink-0">
                {r.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-navy">{r.label}</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{r.desc}</div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button size="sm" variant="outline" icon={loadingReport===r.id ? undefined : <FileDown size={13}/>}
                loading={loadingReport===r.id} onClick={()=>generarReporte(r.id)}>
                {loadingReport===r.id ? 'Generando...' : 'Exportar PDF'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-xs text-gray-500 leading-relaxed">
          <strong className="text-gray-700">Nota sobre los PDFs:</strong> Los reportes se generan con los datos actuales de la base de datos y se descargan directamente en el navegador. Para usar esta función necesitás instalar las dependencias <code className="bg-gray-100 px-1 rounded">jspdf</code> y <code className="bg-gray-100 px-1 rounded">jspdf-autotable</code> en el proyecto (<code className="bg-gray-100 px-1 rounded">npm install jspdf jspdf-autotable</code>).
        </p>
      </div>
    </div>
  )
}
