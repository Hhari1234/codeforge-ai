import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import PasswordField from '../components/PasswordField'
import api from '../services/api'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const missingTokenError = !token ? 'Missing reset token. Please use the link from your email.' : null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)

    if (!token) {
      setSubmitError('Missing reset token. Please use the link from your email.')
      return
    }

    if (newPassword !== confirmPassword) {
      setSubmitError('Passwords do not match.')
      return
    }

    if (!newPassword) {
      setSubmitError('Please enter a new password.')
      return
    }

    setIsSubmitting(true)

    try {
      await api.post('/auth/reset-password', { token, new_password: newPassword })
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Success</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-100">Password reset successfully.</h1>
          <p className="mt-2 text-sm text-slate-400">Redirecting you to the login page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">CodeForge AI</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-100">Reset password</h1>
        <p className="mt-1 text-sm text-slate-400">Enter your new password below.</p>

        {missingTokenError ? (
          <p className="mt-6 text-sm text-rose-400">{missingTokenError}</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <PasswordField
              label="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />

            <PasswordField
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />

            {submitError ? <p className="text-sm text-rose-400">{submitError}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800"
            >
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
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
