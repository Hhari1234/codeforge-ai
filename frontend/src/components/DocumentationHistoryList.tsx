import { useState } from 'react'
import type { ApiDocumentationListItem } from '../types/apiDocumentation'

interface DocumentationHistoryListProps {
  docs: ApiDocumentationListItem[]
  selectedId: number | null
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  isLoading: boolean
}

export default function DocumentationHistoryList({
  docs,
  selectedId,
  onSelect,
  onDelete,
  isLoading,
}: DocumentationHistoryListProps) {
  const [query, setQuery] = useState('')

  if (isLoading) {
    return <p className="text-sm text-slate-400">Loading history...</p>
  }

  const filtered = query.trim()
    ? docs.filter((d) => d.repo_source.toLowerCase().includes(query.trim().toLowerCase()))
    : docs

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
          {query.trim() ? 'No matching documents.' : 'No documentation yet.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => {
            const isSelected = doc.id === selectedId
            return (
              <div
                key={doc.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition ${
                  isSelected
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(doc.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-sm font-medium text-slate-200">
                    {doc.repo_source}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {new Date(doc.created_at).toLocaleString()}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(doc.id)}
                  title="Delete document"
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
