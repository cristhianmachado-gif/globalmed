'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, LogIn } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (authError || !data.session) {
      setError('Usuario o contraseña incorrectos.')
      setLoading(false)
      return
    }
    // Esperar que la cookie se escriba y navegar
    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 800)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3"
            style={{ background: 'linear-gradient(135deg, #e67e22, #c0392b)' }}>
            GM
          </div>
          <h1 className="text-2xl font-bold text-navy">GlobalMed</h1>
          <p className="text-sm text-gray-500 mt-1">Sistema de gestión de salud</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-5 flex items-center gap-2">
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@globalmed.com.ar"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-navy transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-300 rounded-lg outline-none focus:border-navy transition-colors"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy-mid transition-colors disabled:opacity-60 mt-2">
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : <LogIn size={16} />}
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <button
          type="button"
          onClick={async () => {
            const supabase = createClient()
            const result = await supabase.auth.signInWithPassword({
              email: 'admin@globalmed.com.ar',
              password: 'GlobalMed2026'
            })
            alert(JSON.stringify(result.error) + ' | ' + result.data.session?.access_token?.slice(0,20))
          }}
          className="w-full mt-3 px-4 py-2 text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg hover:bg-gray-100"
        >
          [TEST] Probar conexión Supabase
        </button>

        <p className="text-center text-xs text-gray-400 mt-6">
          GlobalMed © {new Date().getFullYear()} — Sistema privado de uso médico
        </p>
      </div>
    </div>
  )
}
