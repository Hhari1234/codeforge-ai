import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { History, Inbox } from 'lucide-react'
import { Card } from './Card'
import { SkeletonCard } from './Skeleton'

interface HistoryItem {
  id: number
  title: string
  subtitle?: string
}

interface HistoryPanelProps {
  title?: string
  items: HistoryItem[]
  selectedId: number | null
  onSelect: (id: number) => void
  isLoading: boolean
  count?: number
  emptyTitle?: string
  emptyDescription?: string
  footer?: ReactNode
}

export function HistoryPanel({
  title = 'History',
  items,
  selectedId,
  onSelect,
  isLoading,
  count,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  footer,
}: HistoryPanelProps) {
  return (
    <Card className="h-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <History size={16} className="text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        </div>
        {count !== undefined ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-400">
            {count}
          </span>
        ) : null}
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-3">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} className="h-[64px]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-slate-500">
              <Inbox size={22} />
            </div>
            <p className="text-sm font-medium text-slate-300">{emptyTitle}</p>
            {emptyDescription ? (
              <p className="mt-1 text-xs leading-5 text-slate-500">{emptyDescription}</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.map((item, index) => {
              const isSelected = item.id === selectedId
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-indigo-500/40 bg-gradient-to-r from-indigo-500/10 to-purple-500/5 text-white'
                        : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.03]'
                    }`}
                  >
                    <p className={`truncate text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                      {item.title}
                    </p>
                    {item.subtitle ? (
                      <p className="mt-0.5 truncate text-xs text-slate-500">{item.subtitle}</p>
                    ) : null}
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {footer ? <div className="border-t border-white/10 p-3">{footer}</div> : null}
    </Card>
  )
}
