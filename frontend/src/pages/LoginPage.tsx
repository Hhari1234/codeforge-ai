import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getAuthErrorMessage } from '../services/authService'
import PasswordField from '../components/PasswordField'
import AuthLayout from '../components/AuthLayout'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue building with AI."
      footer={
        <p className="text-sm text-slate-400">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-indigo-400 transition hover:text-indigo-300">
            Register
          </Link>
        </p>
      }
    >
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

        <div>
          <PasswordField
            label="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
          <div className="mt-2 flex justify-end">
            <Link to="/forgot-password" className="text-xs font-medium text-indigo-400 transition hover:text-indigo-300">
              Forgot password?
            </Link>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        ) : null}

        <Button type="submit" variant="gradient" size="lg" loading={isSubmitting} className="w-full">
          {isSubmitting ? 'Logging in...' : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
