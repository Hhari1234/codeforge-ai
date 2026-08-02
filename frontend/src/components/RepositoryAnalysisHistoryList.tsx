import type { RepositoryAnalysisListItem } from '../types/repositoryAnalysis'

interface RepositoryAnalysisHistoryListProps {
  analyses: RepositoryAnalysisListItem[]
  selectedId: number | null
  onSelect: (id: number) => void
  isLoading: boolean
}

export default function RepositoryAnalysisHistoryList({
  analyses,
  selectedId,
  onSelect,
  isLoading,
}: RepositoryAnalysisHistoryListProps) {
  if (isLoading) {
    return <p className="text-sm text-slate-400">Loading history...</p>
  }

  if (!analyses.length) {
    return <p className="text-sm text-slate-400">No analyses yet.</p>
  }

  return (
    <div className="space-y-2">
      {analyses.map((analysis) => {
        const isSelected = analysis.id === selectedId

        return (
          <button
            key={analysis.id}
            type="button"
            onClick={() => onSelect(analysis.id)}
            className={`w-full rounded-xl border px-3 py-3 text-left transition ${
              isSelected
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="truncate text-sm font-medium">{analysis.repo_source}</div>
            <div className="mt-1 text-xs text-slate-400">
              {new Date(analysis.created_at).toLocaleString()}
            </div>
          </button>
        )
      })}
    </div>
  )
}

