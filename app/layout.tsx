import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GlobalMed - Sistema de Gestión de Salud',
  description: 'Sistema integral de gestión para centros de salud',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased bg-gray-50">{children}</body>
    </html>
  )
}
