import { useState } from 'react'
import type { BugDebugListItem } from '../types/bugDebug'

interface DebugHistoryListProps {
  sessions: BugDebugListItem[]
  selectedId: number | null
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  isLoading: boolean
}

export default function DebugHistoryList({
  sessions,
  selectedId,
  onSelect,
  onDelete,
  isLoading,
}: DebugHistoryListProps) {
  const [query, setQuery] = useState('')

  if (isLoading) {
    return <p className="text-sm text-slate-400">Loading history...</p>
  }

  const filtered = query.trim()
    ? sessions.filter((s) => s.repo_source.toLowerCase().includes(query.trim().toLowerCase()))
    : sessions

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search history..."
        className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500"
      />
      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400">
          {query.trim() ? 'No matching sessions.' : 'No debugging sessions yet.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((session) => {
            const isSelected = session.id === selectedId
            return (
              <div
                key={session.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition ${
                  isSelected
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(session.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-sm font-medium text-slate-200">
                    {session.repo_source}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {new Date(session.created_at).toLocaleString()}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(session.id)}
                  title="Delete session"
                  className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 transition hover:border-rose-500/50 hover:text-rose-300"
                >
                  Delete
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
