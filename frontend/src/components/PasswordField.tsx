import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  error?: string
  hint?: string
}

export default function PasswordField({ label, id, value, onChange, error, hint, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-200">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          aria-invalid={error ? true : undefined}
          className={`w-full rounded-xl border bg-slate-950/60 px-4 py-2.5 pr-10 text-sm text-slate-100 outline-none transition-all duration-200 placeholder:text-slate-500 focus:ring-2 ${
            error
              ? 'border-rose-500/60 focus:border-rose-500/60 focus:ring-rose-500/20'
              : 'border-slate-700/80 focus:border-indigo-500/60 focus:bg-slate-950/80 focus:ring-indigo-500/20'
          }`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200"
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error ? <p className="mt-1.5 text-xs text-rose-400">{error}</p> : null}
      {hint && !error ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}
