'use client'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

// ─── BUTTON ───────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'orange' | 'outline' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}
export function Button({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-navy text-white hover:bg-navy-mid',
    orange:  'bg-brand-orange text-white hover:bg-orange-600',
    outline: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    danger:  'bg-brand-red text-white hover:bg-red-700',
    ghost:   'text-gray-600 hover:bg-gray-100',
    success: 'bg-brand-green text-white hover:bg-green-600',
  }
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' }
  return (
    <button {...props} disabled={disabled || loading}
      className={cn('inline-flex items-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant], sizes[size], className)}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
interface BadgeProps { label: string; variant?: 'green'|'orange'|'red'|'navy'|'gray' }
export function Badge({ label, variant = 'gray' }: BadgeProps) {
  const variants = {
    green:  'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-700',
    red:    'bg-red-100 text-red-700',
    navy:   'bg-navy-light text-navy',
    gray:   'bg-gray-100 text-gray-600',
  }
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', variants[variant])}>{label}</span>
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; hint?: string
}
export function Input({ label, error, hint, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>}
      <input className={cn('w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors bg-white',
        error ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-navy', className)} {...props} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

// ─── SELECT ───────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; error?: string; options: { value: string; label: string }[]
}
export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>}
      <select className={cn('w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors bg-white cursor-pointer',
        error ? 'border-red-400' : 'border-gray-300 focus:border-navy', className)} {...props}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ─── TEXTAREA ─────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string
}
export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>}
      <textarea className={cn('w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors bg-white resize-none',
        error ? 'border-red-400' : 'border-gray-300 focus:border-navy', className)} {...props} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
interface ModalProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; size?: 'sm'|'md'|'lg' }
export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  if (!open) return null
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={cn('relative bg-white w-full rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]', sizes[size])}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-semibold text-navy">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">{footer}</div>}
      </div>
    </div>
  )
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('bg-white rounded-xl border border-gray-200', className)}>{children}</div>
}

// ─── PAGE HEADER ──────────────────────────────────────────────────────────────
interface PageHeaderProps { title: string; subtitle?: string; action?: React.ReactNode }
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-lg font-semibold text-navy">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-14 px-6">
      <div className="text-gray-300 flex justify-center mb-3">{icon}</div>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── SEARCH BAR ───────────────────────────────────────────────────────────────
interface SearchBarProps { value: string; onChange: (v: string) => void; placeholder?: string }
export function SearchBar({ value, onChange, placeholder = 'Buscar...' }: SearchBarProps) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder:text-gray-400" />
    </div>
  )
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon, color = 'navy' }: { label: string; value: number|string; icon: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    navy:   'bg-navy-light text-navy',
    orange: 'bg-orange-100 text-orange-600',
    green:  'bg-green-100 text-green-700',
    red:    'bg-red-100 text-red-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', colors[color])}>{icon}</div>
      <div className="text-2xl font-bold text-navy">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}

// ─── FORM ROW ─────────────────────────────────────────────────────────────────
export function FormRow({ children, cols = 2 }: { children: React.ReactNode; cols?: 2|3 }) {
  return (
    <div className={cn('grid gap-3', cols === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3')}>
      {children}
    </div>
  )
}

// ─── DIAS SELECTOR ────────────────────────────────────────────────────────────
const DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
interface DiasSelectorProps { value: number[]; onChange: (dias: number[]) => void }
export function DiasSelector({ value, onChange }: DiasSelectorProps) {
  function toggle(i: number) {
    onChange(value.includes(i) ? value.filter(d => d !== i) : [...value, i].sort((a,b) => a-b))
  }
  return (
    <div className="flex flex-wrap gap-2">
      {DIAS.map((d, i) => (
        <button key={i} type="button" onClick={() => toggle(i)}
          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
            value.includes(i) ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-300 hover:border-navy')}>
          {d}
        </button>
      ))}
    </div>
  )
}

// ─── LOADING SPINNER ─────────────────────────────────────────────────────────
export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-12', className)}>
      <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
    </div>
  )
}

// ─── CONFIRM DIALOG ──────────────────────────────────────────────────────────
interface ConfirmProps { open: boolean; title: string; description: string; onConfirm: () => void; onCancel: () => void; loading?: boolean }
export function ConfirmDialog({ open, title, description, onConfirm, onCancel, loading }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm"
      footer={<>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>Confirmar</Button>
      </>}>
      <p className="text-sm text-gray-600">{description}</p>
    </Modal>
  )
}
