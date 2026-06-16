'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Plus, Reply, Paperclip, Inbox, SendHorizontal, ChevronLeft } from 'lucide-react'
import type { Mensaje, Perfil } from '@/types'
import { formatFechaHora } from '@/lib/utils'

export default function MensajesPage() {
  const supabase = createClient()
  const [currentUser, setCurrentUser] = useState<Perfil | null>(null)
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [selected, setSelected] = useState<Mensaje | null>(null)
  const [view, setView] = useState<'inbox' | 'sent'>('inbox')
  const [composing, setComposing] = useState(false)
  const [mobileDetail, setMobileDetail] = useState(false)
  const [loading, setLoading] = useState(true)

  // Compose form
  const [toId, setToId] = useState('')
  const [asunto, setAsunto] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [adjuntarNota, setAdjuntarNota] = useState(false)
  const [notaTitulo, setNotaTitulo] = useState('')
  const [notaContenido, setNotaContenido] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<Mensaje | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: perfil }, { data: profs }] = await Promise.all([
        supabase.from('perfiles').select('*').eq('id', user.id).single(),
        supabase.from('perfiles').select('*').eq('activo', true).neq('id', user.id),
      ])
      if (perfil) setCurrentUser(perfil)
      if (profs) setPerfiles(profs)
      loadMensajes(user.id, 'inbox')
    }
    init()
  }, [])

  async function loadMensajes(userId: string, type: 'inbox' | 'sent') {
    setLoading(true)
    const query = type === 'inbox'
      ? supabase.from('mensajes').select(`*, from:perfiles!mensajes_from_id_fkey(id,nombre,apellido,rol), to:perfiles!mensajes_to_id_fkey(id,nombre,apellido,rol)`).eq('to_id', userId).order('created_at', { ascending: false })
      : supabase.from('mensajes').select(`*, from:perfiles!mensajes_from_id_fkey(id,nombre,apellido,rol), to:perfiles!mensajes_to_id_fkey(id,nombre,apellido,rol)`).eq('from_id', userId).order('created_at', { ascending: false })
    const { data } = await query
    if (data) setMensajes(data as any)
    setLoading(false)
  }

  async function handleSend() {
    if (!toId || !asunto.trim() || !cuerpo.trim() || !currentUser) return
    setSending(true)
    const nota = adjuntarNota && notaTitulo && notaContenido
      ? { titulo: notaTitulo, contenido: notaContenido }
      : null
    await supabase.from('mensajes').insert({
      from_id: currentUser.id,
      to_id: toId,
      asunto: replyTo ? `RE: ${replyTo.asunto}` : asunto.trim(),
      cuerpo: cuerpo.trim(),
      nota_adjunta: nota,
      respondiendo_a: replyTo?.id || null,
    })
    setComposing(false); setReplyTo(null); setToId(''); setAsunto(''); setCuerpo(''); setAdjuntarNota(false); setNotaTitulo(''); setNotaContenido('')
    setSending(false)
    if (currentUser) loadMensajes(currentUser.id, view)
  }

  async function markRead(m: Mensaje) {
    if (!m.leido && currentUser && m.to_id === currentUser.id) {
      await supabase.from('mensajes').update({ leido: true }).eq('id', m.id)
      setMensajes(prev => prev.map(x => x.id === m.id ? { ...x, leido: true } : x))
    }
    setSelected(m); setMobileDetail(true)
  }

  function handleReply() {
    if (!selected) return
    setReplyTo(selected)
    setToId(selected.from_id === currentUser?.id ? selected.to_id : selected.from_id)
    setAsunto(selected.asunto)
    setCuerpo('')
    setComposing(true)
  }

  function switchView(v: 'inbox' | 'sent') {
    setView(v); setSelected(null); setMobileDetail(false)
    if (currentUser) loadMensajes(currentUser.id, v)
  }

  const rolLabel: Record<string, string> = {
    administrador: 'Administrador', administrativo: 'Administrativo', profesional: 'Profesional'
  }

  const MensajeDetalle = () => selected ? (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 flex items-start gap-3">
        <button className="md:hidden mr-1 text-gray-400" onClick={() => setMobileDetail(false)}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-sm font-semibold text-navy">{selected.asunto}</h2>
          <div className="text-xs text-gray-500 mt-1">
            De: <span className="font-medium text-gray-700">{(selected as any).from?.nombre} {(selected as any).from?.apellido}</span>
            {' · '}Para: <span className="font-medium text-gray-700">{(selected as any).to?.nombre} {(selected as any).to?.apellido}</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{formatFechaHora(selected.created_at)}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.cuerpo}</p>

        {selected.nota_adjunta && (
          <div className="mt-4 bg-navy-light border border-navy/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Paperclip size={14} className="text-navy" />
              <span className="text-xs font-semibold text-navy uppercase tracking-wide">Nota clínica adjunta</span>
            </div>
            <div className="text-sm font-medium text-navy mb-1">{selected.nota_adjunta.titulo}</div>
            <div className="text-sm text-gray-700 leading-relaxed">{selected.nota_adjunta.contenido}</div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100">
        <button onClick={handleReply}
          className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-xs font-medium rounded-lg hover:bg-navy-mid transition-colors">
          <Reply size={14} /> Responder
        </button>
      </div>
    </div>
  ) : (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3 p-8">
      <Inbox size={36} className="opacity-30" />
      <p className="text-sm">Seleccioná un mensaje para leerlo</p>
    </div>
  )

  return (
    <div className="h-[calc(100vh-3.5rem)] md:h-screen flex flex-col md:flex-row overflow-hidden">

      {/* PANEL IZQUIERDO */}
      <div className={`${mobileDetail ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-72 lg:w-80 border-r border-gray-200 bg-white flex-shrink-0`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-navy">Mensajes</h1>
          <button onClick={() => { setComposing(true); setReplyTo(null); setToId(''); setAsunto(''); setCuerpo('') }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition-colors">
            <Plus size={13} /> Nuevo
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(['inbox','sent'] as const).map(v => (
            <button key={v} onClick={() => switchView(v)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${view === v ? 'text-navy border-b-2 border-navy' : 'text-gray-400 hover:text-gray-600'}`}>
              {v === 'inbox' ? '📥 Recibidos' : '📤 Enviados'}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
            </div>
          ) : mensajes.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">Sin mensajes</div>
          ) : mensajes.map(m => (
            <button key={m.id} onClick={() => markRead(m)}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selected?.id === m.id ? 'bg-navy-light' : ''}`}>
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-navy-light text-navy text-[10px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {view === 'inbox' ? `${(m as any).from?.nombre?.[0]}${(m as any).from?.apellido?.[0]}` : `${(m as any).to?.nombre?.[0]}${(m as any).to?.apellido?.[0]}`}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs truncate ${!m.leido && view === 'inbox' ? 'font-semibold text-navy' : 'font-medium text-gray-700'}`}>
                      {view === 'inbox' ? `${(m as any).from?.nombre} ${(m as any).from?.apellido}` : `Para: ${(m as any).to?.nombre} ${(m as any).to?.apellido}`}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {new Date(m.created_at).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit' })}
                    </span>
                  </div>
                  <div className={`text-xs truncate mt-0.5 ${!m.leido && view === 'inbox' ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>{m.asunto}</div>
                  <div className="text-[10px] text-gray-400 truncate mt-0.5">{m.cuerpo}</div>
                </div>
                {!m.leido && view === 'inbox' && (
                  <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0 mt-1.5" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* PANEL DERECHO - detalle */}
      <div className={`${mobileDetail ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0 bg-white overflow-hidden`}>
        {composing ? (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-navy">
                {replyTo ? 'Responder mensaje' : 'Nuevo mensaje'}
              </h2>
              <button onClick={() => { setComposing(false); setReplyTo(null) }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Para</label>
                <select value={toId} onChange={e => setToId(e.target.value)} disabled={!!replyTo}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-navy disabled:bg-gray-50">
                  <option value="">— Seleccionar destinatario —</option>
                  {perfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} {p.apellido} · {rolLabel[p.rol]}</option>
                  ))}
                </select>
              </div>
              {!replyTo && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Asunto</label>
                  <input value={asunto} onChange={e => setAsunto(e.target.value)}
                    placeholder="Asunto del mensaje"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-navy"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Mensaje</label>
                <textarea value={cuerpo} onChange={e => setCuerpo(e.target.value)} rows={6}
                  placeholder="Escribí tu mensaje aquí..."
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-navy resize-none leading-relaxed"
                />
              </div>

              {/* Adjuntar nota clínica */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={adjuntarNota} onChange={e => setAdjuntarNota(e.target.checked)}
                    className="rounded" />
                  <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                    <Paperclip size={13} /> Adjuntar nota clínica
                  </span>
                </label>
                {adjuntarNota && (
                  <div className="mt-3 space-y-2 p-3 bg-navy-light rounded-lg">
                    <input value={notaTitulo} onChange={e => setNotaTitulo(e.target.value)}
                      placeholder="Título de la nota"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-navy bg-white"
                    />
                    <textarea value={notaContenido} onChange={e => setNotaContenido(e.target.value)} rows={3}
                      placeholder="Contenido de la nota clínica..."
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-navy resize-none bg-white"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100">
              <button onClick={handleSend} disabled={sending || !toId || !cuerpo.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50">
                {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SendHorizontal size={15} />}
                {sending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        ) : (
          <MensajeDetalle />
        )}
      </div>
    </div>
  )
}
