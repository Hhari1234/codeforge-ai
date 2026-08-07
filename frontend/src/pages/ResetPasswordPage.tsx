import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import PasswordField from '../components/PasswordField'
import AuthLayout from '../components/AuthLayout'
import { Button } from '../components/ui/Button'
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
      <AuthLayout
        title="Password reset"
        subtitle="Your password has been updated successfully."
        footer={
          <Link to="/login" className="text-sm font-medium text-indigo-400 transition hover:text-indigo-300">
            Go to login
          </Link>
        }
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center"
        >
          <CheckCircle2 size={32} className="text-emerald-400" />
          <p className="mt-3 text-sm font-medium text-emerald-300">Success</p>
          <p className="mt-1 text-sm text-slate-400">Redirecting you to the login page...</p>
        </motion.div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Enter your new password below."
      footer={
        <p className="text-sm text-slate-400">
          Remember your password?{' '}
          <Link to="/login" className="font-medium text-indigo-400 transition hover:text-indigo-300">
            Log in
          </Link>
        </p>
      }
    >
      {missingTokenError ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {missingTokenError}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
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

          {submitError ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {submitError}
            </div>
          ) : null}

          <Button type="submit" variant="gradient" size="lg" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
