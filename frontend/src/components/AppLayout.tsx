import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface AppLayoutProps {
  children: ReactNode
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm transition ${
    isActive
      ? 'bg-emerald-500/15 text-emerald-300'
      : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
  }`

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <header className="mx-auto mb-8 flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 px-6 py-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">CodeForge AI</p>
          <p className="text-lg font-semibold text-slate-100">Developer Tools</p>
        </div>
        <nav className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
          <NavLink to="/projects/generate" className={navLinkClass}>
            Project Generator
          </NavLink>
          <NavLink to="/readme/generate" className={navLinkClass}>
            README Generator
          </NavLink>
        </nav>
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

