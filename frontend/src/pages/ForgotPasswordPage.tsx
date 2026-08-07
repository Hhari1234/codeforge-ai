import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import api from '../services/api'
import AuthLayout from '../components/AuthLayout'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

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
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <p className="text-sm text-slate-400">
          Remember your password?{' '}
          <Link to="/login" className="font-medium text-indigo-400 transition hover:text-indigo-300">
            Log in
          </Link>
        </p>
      }
    >
      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />

          {error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          ) : null}

          <Button type="submit" variant="gradient" size="lg" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center"
        >
          <CheckCircle2 size={32} className="text-emerald-400" />
          <p className="mt-3 text-sm font-medium text-emerald-300">Check your inbox</p>
          <p className="mt-1 text-sm text-slate-400">
            If an account exists for this email, a password reset link has been sent.
          </p>
        </motion.div>
      )}
    </AuthLayout>
  )
}
