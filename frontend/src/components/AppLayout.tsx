import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import MobileDrawer from './MobileDrawer'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="relative flex min-h-screen bg-slate-950 text-slate-100">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-grid" />
      <div className="pointer-events-none fixed -top-40 -left-40 z-0 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-40 -right-40 z-0 h-96 w-96 rounded-full bg-purple-600/20 blur-[120px]" />

      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="mx-auto max-w-7xl"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
