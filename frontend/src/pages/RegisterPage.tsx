import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getAuthErrorMessage } from '../services/authService'
import PasswordField from '../components/PasswordField'
import AuthLayout from '../components/AuthLayout'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await register(email, password, fullName)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Register to start generating project specs and analyzing code."
      footer={
        <p className="text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-400 transition hover:text-indigo-300">
            Log in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          id="fullName"
          label="Full name"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Ada Lovelace"
        />

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

        <PasswordField
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
          placeholder="Create a password"
          hint="At least 6 characters."
        />

        {error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        ) : null}

        <Button type="submit" variant="gradient" size="lg" loading={isSubmitting} className="w-full">
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
