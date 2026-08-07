import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const inputBase =
  'w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 outline-none transition-all duration-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:bg-slate-950/80 focus:ring-2 focus:ring-indigo-500/20'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    return (
      <div className="w-full">
        {label ? (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-200">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={`${inputBase} ${error ? 'border-rose-500/60 focus:border-rose-500/60 focus:ring-rose-500/20' : ''} ${className}`}
          {...props}
        />
        {error ? <p className="mt-1.5 text-xs text-rose-400">{error}</p> : null}
        {hint && !error ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
      </div>
    )
  },
)

Input.displayName = 'Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, id, className = '', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    return (
      <div className="w-full">
        {label ? (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-200">
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={`${inputBase} resize-y ${error ? 'border-rose-500/60' : ''} ${className}`}
          {...props}
        />
        {error ? <p className="mt-1.5 text-xs text-rose-400">{error}</p> : null}
        {hint && !error ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, id, className = '', children, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    return (
      <div className="w-full">
        {label ? (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-200">
            {label}
          </label>
        ) : null}
        <select
          ref={ref}
          id={inputId}
          className={`${inputBase} cursor-pointer appearance-none ${error ? 'border-rose-500/60' : ''} ${className}`}
          {...props}
        >
          {children}
        </select>
        {error ? <p className="mt-1.5 text-xs text-rose-400">{error}</p> : null}
      </div>
    )
  },
)

Select.displayName = 'Select'
