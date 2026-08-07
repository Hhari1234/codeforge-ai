import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'gradient'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400 hover:shadow-indigo-400/30',
  gradient:
    'bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25 hover:brightness-110 hover:shadow-purple-500/40',
  secondary:
    'bg-white/10 text-slate-100 border border-white/10 hover:bg-white/15 hover:border-white/20',
  outline:
    'border border-slate-700 text-slate-300 hover:border-indigo-500/50 hover:text-indigo-300 hover:bg-indigo-500/5',
  ghost: 'text-slate-300 hover:bg-white/5 hover:text-slate-100',
  danger:
    'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 hover:text-rose-200',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
  icon: 'p-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading = false, icon, className = '', children, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'
