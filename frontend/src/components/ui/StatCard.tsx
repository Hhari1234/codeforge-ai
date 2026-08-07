import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  gradient?: 'indigo' | 'emerald' | 'purple' | 'blue' | 'amber'
  sub?: string
  index?: number
}

const gradientClasses = {
  indigo: 'from-indigo-500/20 to-purple-500/20 text-indigo-300',
  emerald: 'from-emerald-500/20 to-teal-500/20 text-emerald-300',
  purple: 'from-purple-500/20 to-fuchsia-500/20 text-purple-300',
  blue: 'from-sky-500/20 to-blue-500/20 text-sky-300',
  amber: 'from-amber-500/20 to-orange-500/20 text-amber-300',
}

export function StatCard({ label, value, icon, gradient = 'indigo', sub, index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ y: -4 }}
      className="glass-card p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-50">{value}</p>
          {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradientClasses[gradient]}`}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  )
}
