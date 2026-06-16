import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', session.user.id)
    .single()
  if (!perfil) redirect('/auth/login')
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar perfil={perfil} unreadCount={0} />
      <main className="flex-1 min-w-0 md:overflow-y-auto">
        <div className="h-14 md:hidden" />
        {children}
      </main>
    </div>
  )
}
