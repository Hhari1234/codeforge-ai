import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/30 px-6 py-12 text-center"
    >
      {icon ? (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300">
          {icon}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-slate-400">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </motion.div>
  )
}
