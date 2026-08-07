import { forwardRef, type HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'gradient' | 'borderless'
  glow?: boolean
  hover?: boolean
}

const variantClasses = {
  default: 'rounded-2xl border border-white/10 bg-slate-900/50 shadow-soft',
  glass: 'glass-card',
  gradient: 'gradient-border rounded-2xl shadow-soft',
  borderless: 'rounded-2xl bg-slate-900/40',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', glow = false, hover = false, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${variantClasses[variant]} ${
          glow ? 'shadow-glow' : ''
        } ${
          hover
            ? 'transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/40 hover:shadow-glow'
            : ''
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  },
)

Card.displayName = 'Card'

export function CardHeader({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-center justify-between gap-3 border-b border-white/10 px-6 py-4 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className = '', children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-lg font-semibold text-slate-100 ${className}`} {...props}>
      {children}
    </h3>
  )
}

export function CardContent({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-6 py-5 ${className}`} {...props}>
      {children}
    </div>
  )
}
