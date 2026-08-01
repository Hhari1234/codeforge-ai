import type { ReadmeGenerationListItem } from '../types/readmeGeneration'

interface ReadmeHistoryListProps {
  generations: ReadmeGenerationListItem[]
  selectedId: number | null
  onSelect: (id: number) => void
  isLoading: boolean
}

export default function ReadmeHistoryList({
  generations,
  selectedId,
  onSelect,
  isLoading,
}: ReadmeHistoryListProps) {
  if (isLoading) {
    return <p className="text-sm text-slate-400">Loading history...</p>
  }

  if (!generations.length) {
    return <p className="text-sm text-slate-400">No READMEs generated yet.</p>
  }

  return (
    <div className="space-y-2">
      {generations.map((generation) => {
        const isSelected = generation.id === selectedId

        return (
          <button
            key={generation.id}
            type="button"
            onClick={() => onSelect(generation.id)}
            className={`w-full rounded-xl border px-3 py-3 text-left transition ${
              isSelected
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="text-sm font-medium">{generation.title}</div>
            <div className="mt-1 truncate text-xs text-slate-400">
              {generation.input_summary}
            </div>
          </button>
        )
      })}
    </div>
  )
}

