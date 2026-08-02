import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

interface ForgotPasswordResponse {
  message: string
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await api.post<ForgotPasswordResponse>('/auth/forgot-password', { email })
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">CodeForge AI</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-100">Forgot password</h1>
        <p className="mt-1 text-sm text-slate-400">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-slate-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-500/60"
                placeholder="you@example.com"
              />
            </div>

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800"
            >
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-300">
              If an account exists for this email, a password reset link has been sent.
            </p>
          </div>
        )}

        <p className="mt-4 text-sm text-slate-400">
          Remember your password?{' '}
          <Link to="/login" className="font-medium text-emerald-400 transition hover:text-emerald-300">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
