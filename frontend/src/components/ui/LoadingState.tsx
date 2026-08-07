import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface LoadingStateProps {
  title?: string
  description?: string
  icon?: ReactNode
}

export function LoadingState({ title = 'Processing...', description, icon }: LoadingStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900/40 px-6 py-16 text-center"
    >
      <div className="relative">
        <motion.div
          className="absolute -inset-4 rounded-full bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-emerald-500/30 blur-xl"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="relative flex h-14 w-14 items-center justify-center">
          {icon || (
            <svg className="h-8 w-8 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" strokeWidth="3" className="stroke-white/10" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="3" className="stroke-indigo-400" strokeLinecap="round" />
            </svg>
          )}
        </div>
      </div>
      <p className="mt-6 text-sm font-medium text-slate-200">{title}</p>
      {description ? <p className="mt-1.5 max-w-sm text-xs text-slate-500">{description}</p> : null}
    </motion.div>
  )
}
