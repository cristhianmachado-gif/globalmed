'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Perfil } from '@/types'
import {
  LayoutDashboard, Calendar, Users, Stethoscope, Clock,
  FileText, MessageSquare, Settings, LogOut, Menu, X,
  Building2, ShieldCheck,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',        label: 'Panel',             icon: <LayoutDashboard size={18} />, roles: ['administrador','administrativo','profesional'] },
  { href: '/agenda',           label: 'Agenda',            icon: <Calendar size={18} />,        roles: ['administrador','administrativo','profesional'] },
  { href: '/pacientes',        label: 'Pacientes',         icon: <Users size={18} />,           roles: ['administrador','administrativo','profesional'] },
  { href: '/profesionales',    label: 'Profesionales',     icon: <Stethoscope size={18} />,     roles: ['administrador','administrativo'] },
  { href: '/turnos',           label: 'Turnos',            icon: <Clock size={18} />,           roles: ['administrador','administrativo'] },
  { href: '/hc',               label: 'Historias clínicas',icon: <FileText size={18} />,        roles: ['administrador','profesional'] },
  { href: '/mensajes',         label: 'Mensajes',          icon: <MessageSquare size={18} />,   roles: ['administrador','administrativo','profesional'] },
  { href: '/obras-sociales',   label: 'Obras sociales',    icon: <Building2 size={18} />,       roles: ['administrador'] },
  { href: '/config',           label: 'Configuración',     icon: <Settings size={18} />,        roles: ['administrador'] },
]

interface SidebarProps {
  perfil: Perfil
  unreadCount?: number
}

export default function Sidebar({ perfil, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(perfil.rol))

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const rolLabel: Record<string, string> = {
    administrador: 'Administrador',
    administrativo: 'Administrativo',
    profesional: 'Profesional',
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #e67e22, #c0392b)' }}>
          GM
        </div>
        <div>
          <div className="text-white font-semibold text-sm">GlobalMed</div>
          <div className="text-white/40 text-[10px] uppercase tracking-wider">Gestión de salud</div>
        </div>
      </div>

      {/* Perfil */}
      <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-300 flex items-center justify-center text-xs font-semibold flex-shrink-0">
          {perfil.nombre[0]}{perfil.apellido[0]}
        </div>
        <div className="min-w-0">
          <div className="text-white text-xs font-medium truncate">{perfil.nombre} {perfil.apellido}</div>
          <div className="text-white/40 text-[10px]">{rolLabel[perfil.rol]}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <div className="space-y-0.5">
          {filteredNav.map(item => {
            const isActive = pathname.startsWith(item.href)
            const badgeCount = item.href === '/mensajes' ? unreadCount : 0
            return (
              <Link key={item.href} href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-normal transition-all',
                  isActive
                    ? 'bg-orange-500/20 text-orange-300'
                    : 'text-white/60 hover:bg-white/8 hover:text-white'
                )}>
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {badgeCount > 0 && (
                  <span className="bg-red-500 text-white text-[9px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {badgeCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="px-2 py-3 border-t border-white/8">
        <button onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-white/50 hover:bg-white/8 hover:text-white text-xs transition-all">
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-navy flex items-center px-4 border-b border-white/10">
        <button onClick={() => setMobileOpen(true)} className="text-white/70 hover:text-white mr-3">
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
            style={{ background: 'linear-gradient(135deg, #e67e22, #c0392b)' }}>GM</div>
          <span className="text-white font-semibold text-sm">GlobalMed</span>
        </div>
        {unreadCount > 0 && (
          <Link href="/mensajes" className="ml-auto">
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{unreadCount}</span>
          </Link>
        )}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 w-64 bg-navy h-full shadow-xl">
            <button onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 text-white/60 hover:text-white">
              <X size={20} />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-shrink-0 bg-navy h-screen sticky top-0 flex-col">
        <SidebarContent />
      </aside>
    </>
  )
}
// NOTE: Add these items to NAV_ITEMS array in Sidebar.tsx:
// { href: '/finanzas/dashboard',      label: 'Dashboard financiero', icon: <BarChart2 size={18}/>,    roles: ['administrador'] },
// { href: '/finanzas/caja',           label: 'Caja del día',         icon: <DollarSign size={18}/>,   roles: ['administrador','administrativo'] },
// { href: '/finanzas/senias',         label: 'Señas',                icon: <Wallet size={18}/>,       roles: ['administrador','administrativo'] },
// { href: '/finanzas/aranceles',      label: 'Aranceles',            icon: <Tag size={18}/>,          roles: ['administrador'] },
// { href: '/finanzas/liquidaciones',  label: 'Liquidaciones OS',     icon: <Receipt size={18}/>,      roles: ['administrador'] },
// { href: '/finanzas/cuenta-corriente',label:'Cuenta corriente',     icon: <Building2 size={18}/>,    roles: ['administrador'] },
// { href: '/finanzas/gastos',         label: 'Gastos',               icon: <TrendingDown size={18}/>, roles: ['administrador'] },
// { href: '/finanzas/reportes',       label: 'Reportes',             icon: <FileDown size={18}/>,     roles: ['administrador'] },
