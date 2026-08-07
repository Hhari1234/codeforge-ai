import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, LogOut, Menu, Bell, Sparkles } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Avatar } from './ui/Avatar'
import { Button } from './ui/Button'

interface NavbarProps {
  onMenuClick: () => void
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:bg-white/5 lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        {/* Mobile brand */}
        <Link to="/dashboard" className="flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="text-sm font-bold text-slate-50">CodeForge</span>
        </Link>

        {/* Search */}
        <div className="relative ml-auto hidden max-w-md flex-1 sm:block">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search or jump to..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-9 pr-4 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-indigo-500/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-indigo-500/20"
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
          />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          {/* Mobile search */}
          <button
            type="button"
            onClick={() => setSearchOpen((prev) => !prev)}
            className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:bg-white/5 sm:hidden"
            aria-label="Search"
          >
            <Search size={18} />
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="relative rounded-lg border border-white/10 p-2 text-slate-300 transition hover:bg-white/5"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-400" />
          </button>

          {/* User */}
          <div className="ml-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-3">
            <Avatar name={user?.full_name} email={user?.email} size="sm" />
            <div className="hidden md:block">
              <p className="max-w-[140px] truncate text-xs font-medium text-slate-200">
                {user?.full_name || user?.email?.split('@')[0]}
              </p>
              <p className="max-w-[140px] truncate text-[10px] text-slate-500">{user?.email}</p>
            </div>
          </div>

          {/* Logout */}
          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout" className="border border-white/10">
            <LogOut size={18} />
          </Button>
        </div>
      </div>

      {/* Mobile search dropdown */}
      {searchOpen ? (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="border-t border-white/10 px-4 py-3 sm:hidden">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search or jump to..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-9 pr-4 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-indigo-500/50"
            />
          </div>
        </motion.div>
      ) : null}
    </header>
  )
}
