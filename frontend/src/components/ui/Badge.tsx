import type { HTMLAttributes } from 'react'

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'outline'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'border border-white/10 bg-white/5 text-slate-300',
  primary: 'border border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
  success: 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  warning: 'border border-amber-500/40 bg-amber-500/10 text-amber-300',
  danger: 'border border-rose-500/40 bg-rose-500/10 text-rose-300',
  info: 'border border-sky-500/40 bg-sky-500/10 text-sky-300',
  purple: 'border border-purple-500/40 bg-purple-500/10 text-purple-300',
  outline: 'border border-slate-700 bg-transparent text-slate-300',
}

const dotClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-400',
  primary: 'bg-indigo-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-rose-400',
  info: 'bg-sky-400',
  purple: 'bg-purple-400',
  outline: 'bg-slate-400',
}

export function Badge({ variant = 'default', dot = false, className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[variant]}`} /> : null}
      {children}
    </span>
  )
}
