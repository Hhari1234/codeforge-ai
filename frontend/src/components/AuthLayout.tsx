import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
  footer: ReactNode
}

export default function AuthLayout({ children, title, subtitle, footer }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-100">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 bg-grid" />
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/25 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-[400px] w-[400px] rounded-full bg-purple-600/20 blur-[140px]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
              <Sparkles size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-50">
              CodeForge <span className="text-gradient">AI</span>
            </span>
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
          <h1 className="text-2xl font-bold text-slate-100">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>

        <div className="mt-6 text-center">{footer}</div>
      </motion.div>
    </div>
  )
}
