import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <header className="mx-auto mb-8 flex max-w-7xl items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-6 py-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">CodeForge AI</p>
          <p className="text-lg font-semibold text-slate-100">Project Generator</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="max-w-[240px] truncate text-sm text-slate-300">{user?.email}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-rose-500/50 hover:text-rose-300"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl">{children}</main>
    </div>
  )
}

