import { motion } from 'framer-motion'

export interface TabItem<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
}

export function Tabs<T extends string>({ items, value, onChange }: TabsProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-slate-950/60 p-1">
      {items.map((item) => {
        const isActive = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
              isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-pressed={isActive}
          >
            {isActive ? (
              <motion.span
                layoutId={`tab-${item.value}`}
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500/20 to-purple-500/20 ring-1 ring-indigo-500/40"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            ) : null}
            {item.icon}
            <span className="relative z-10">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
