import type { CodeExplanationListItem } from '../types/codeExplanation'

interface CodeExplanationHistoryListProps {
  explanations: CodeExplanationListItem[]
  selectedId: number | null
  onSelect: (id: number) => void
  isLoading: boolean
}

export default function CodeExplanationHistoryList({
  explanations,
  selectedId,
  onSelect,
  isLoading,
}: CodeExplanationHistoryListProps) {
  if (isLoading) {
    return <p className="text-sm text-slate-400">Loading history...</p>
  }

  if (!explanations.length) {
    return <p className="text-sm text-slate-400">No explanations yet.</p>
  }

  return (
    <div className="space-y-2">
      {explanations.map((explanation) => {
        const isSelected = explanation.id === selectedId

        return (
          <button
            key={explanation.id}
            type="button"
            onClick={() => onSelect(explanation.id)}
            className={`w-full rounded-xl border px-3 py-3 text-left transition ${
              isSelected
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="truncate text-sm font-medium">{explanation.filename}</div>
            <div className="mt-1 text-xs text-slate-400">{explanation.language}</div>
          </button>
        )
      })}
    </div>
  )
}

