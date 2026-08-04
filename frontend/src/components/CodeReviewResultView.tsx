import { useMemo } from 'react'
import type {
  CodeReviewOut,
  ReviewCategory,
  ReviewFinding,
  ReviewSeverity,
} from '../types/codeReview'

interface CodeReviewResultViewProps {
  review: CodeReviewOut | null
  isLoading: boolean
  isReviewing: boolean
}

const SEVERITY_STYLES: Record<ReviewSeverity, string> = {
  Critical: 'border-rose-500/50 bg-rose-500/10 text-rose-300',
  High: 'border-orange-500/50 bg-orange-500/10 text-orange-300',
  Medium: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
  Low: 'border-sky-500/50 bg-sky-500/10 text-sky-300',
}

const CATEGORY_LABELS: Record<ReviewCategory, string> = {
  security: 'Security',
  bug: 'Bug',
  performance: 'Performance',
  code_smell: 'Code Smell',
  maintainability: 'Maintainability',
  best_practice: 'Best Practice',
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-amber-400'
  return 'text-rose-400'
}

function scoreRingColor(score: number): string {
  if (score >= 80) return 'border-emerald-400'
  if (score >= 60) return 'border-amber-400'
  return 'border-rose-400'
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <div
      className={`flex h-24 w-24 items-center justify-center rounded-full border-4 ${scoreRingColor(
        score,
      )} bg-slate-950/70`}
    >
      <div className="text-center">
        <div className={`text-3xl font-bold ${scoreColor(score)}`}>{score}</div>
        <div className="text-[10px] uppercase tracking-wider text-slate-400">/ 100</div>
      </div>
    </div>
  )
}

function SeveritySummary({ findings }: { findings: ReviewFinding[] }) {
  const counts = useMemo(() => {
    const c: Record<ReviewSeverity, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
    }
    for (const f of findings) {
      if (c[f.severity] !== undefined) c[f.severity] += 1
    }
    return c
  }, [findings])

  const order: ReviewSeverity[] = ['Critical', 'High', 'Medium', 'Low']

  return (
    <div className="flex flex-wrap gap-3">
      {order.map((sev) => (
        <div
          key={sev}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${SEVERITY_STYLES[sev]}`}
        >
          <span className="text-sm font-semibold">{counts[sev]}</span>
          <span className="text-xs uppercase tracking-wider">{sev}</span>
        </div>
      ))}
    </div>
  )
}

function FindingCard({ finding }: { finding: ReviewFinding }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[finding.severity]}`}
          >
            {finding.severity}
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-slate-300">
            {CATEGORY_LABELS[finding.category] ?? finding.category}
          </span>
        </div>
        {finding.line != null ? (
          <span className="text-xs text-slate-500">Line {finding.line}</span>
        ) : null}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-100">{finding.title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{finding.description}</p>
      {finding.code_snippet ? (
        <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs leading-5 text-emerald-300">
          {finding.code_snippet}
        </pre>
      ) : null}
      <div className="mt-3 rounded-lg border border-emerald-800/40 bg-emerald-500/5 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          Recommendation
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-300">{finding.recommendation}</p>
      </div>
    </div>
  )
}

function FileGroup({ file, findings }: { file: string; findings: ReviewFinding[] }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
        <p className="font-mono text-sm font-semibold text-emerald-300">{file}</p>
        <span className="text-xs text-slate-400">
          {findings.length} finding{findings.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="space-y-3 p-4">
        {findings.map((finding, idx) => (
          <FindingCard key={idx} finding={finding} />
        ))}
      </div>
    </div>
  )
}

export default function CodeReviewResultView({
  review,
  isLoading,
  isReviewing,
}: CodeReviewResultViewProps) {
  const fileGroups = useMemo(() => {
    if (!review) return []
    const groups = new Map<string, ReviewFinding[]>()
    for (const f of review.result.findings) {
      const key = f.file || 'Unknown file'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)?.push(f)
    }
    return Array.from(groups.entries())
  }, [review])

  if (isReviewing && !review) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
        Reviewing repository... this may take a minute.
      </div>
    )
  }

  if (isLoading && !review) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
        Loading review detail...
      </div>
    )
  }

  if (!review) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-8 text-slate-400">
        Upload a ZIP or paste a GitHub URL to get a full code review with a quality score and
        prioritized findings.
      </div>
    )
  }

  const { result } = review

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Code Review</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-100">{review.repo_source}</h2>
        <p className="mt-2 text-xs text-slate-500">
          {new Date(review.created_at).toLocaleString()}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-center gap-6">
          <ScoreBadge score={result.overall_quality_score} />
          <div className="min-w-[220px] flex-1 space-y-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Overall Code Quality Score
              </h3>
              <p className="mt-1 text-sm text-slate-300">{result.summary}</p>
            </div>
            <SeveritySummary findings={result.findings} />
          </div>
        </div>
      </div>

      {result.strengths.length > 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold text-slate-100">Strengths</h3>
          <ul className="mt-3 space-y-2">
            {result.strengths.map((strength, index) => (
              <li
                key={index}
                className="rounded-lg border border-emerald-800/40 bg-emerald-500/5 px-3 py-2 text-sm leading-6 text-slate-300"
              >
                <span className="mr-2 text-emerald-400">✓</span>
                {strength}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.findings.length > 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold text-slate-100">
            Findings by File ({result.findings.length})
          </h3>
          <div className="mt-4 space-y-4">
            {fileGroups.map(([file, findings]) => (
              <FileGroup key={file} file={file} findings={findings} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-slate-400">
          No findings — the analyzed excerpt looks clean.
        </div>
      )}

      {result.recommendations.length > 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold text-slate-100">Recommendations</h3>
          <ul className="mt-3 space-y-2">
            {result.recommendations.map((rec, index) => (
              <li
                key={index}
                className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm leading-6 text-slate-300"
              >
                <span className="mr-2 font-mono text-emerald-400">{index + 1}.</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
