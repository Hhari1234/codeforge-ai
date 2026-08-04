import type { CodeReviewListItem } from '../types/codeReview'

interface CodeReviewHistoryListProps {
  reviews: CodeReviewListItem[]
  selectedId: number | null
  onSelect: (id: number) => void
  isLoading: boolean
}

export default function CodeReviewHistoryList({
  reviews,
  selectedId,
  onSelect,
  isLoading,
}: CodeReviewHistoryListProps) {
  if (isLoading) {
    return <p className="text-sm text-slate-400">Loading history...</p>
  }

  if (!reviews.length) {
    return <p className="text-sm text-slate-400">No reviews yet.</p>
  }

  return (
    <div className="space-y-2">
      {reviews.map((review) => {
        const isSelected = review.id === selectedId

        return (
          <button
            key={review.id}
            type="button"
            onClick={() => onSelect(review.id)}
            className={`w-full rounded-xl border px-3 py-3 text-left transition ${
              isSelected
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="truncate text-sm font-medium">{review.repo_source}</div>
            <div className="mt-1 text-xs text-slate-400">
              {new Date(review.created_at).toLocaleString()}
            </div>
          </button>
        )
      })}
    </div>
  )
}
