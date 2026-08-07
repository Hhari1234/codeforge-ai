import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Badge } from './Badge'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  badge?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions, badge }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          {eyebrow ? (
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-400">
              {eyebrow}
            </span>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-50">{title}</h1>
            {badge}
          </div>
          {description ? (
            <p className="max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </motion.div>
  )
}

export { Badge }
