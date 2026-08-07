import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { FileCode2, CheckCircle2 } from 'lucide-react'
import type { CodeReviewOut, ReviewCategory, ReviewFinding, ReviewSeverity } from '../types/codeReview'
import { Card, CardContent } from './ui/Card'
import { EmptyState } from './ui/EmptyState'
import { LoadingState } from './ui/LoadingState'
import { CodeBlock } from './ui/CodeBlock'

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
      )} bg-slate-950/70 shadow-glow`}
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
    const c: Record<ReviewSeverity, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 }
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
    <div className="rounded-xl border border-white/5 bg-slate-950/40 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[finding.severity]}`}
          >
            {finding.severity}
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900 px-2 py-0.5 text-xs text-slate-300">
            {CATEGORY_LABELS[finding.category] ?? finding.category}
          </span>
        </div>
        {finding.line != null ? <span className="text-xs text-slate-500">Line {finding.line}</span> : null}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-100">{finding.title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{finding.description}</p>
      {finding.code_snippet ? (
        <div className="mt-3">
<CodeBlock code={finding.code_snippet} language="text" wrapLongLines={false} />
        </div>
      ) : null}
      <div className="mt-3 rounded-lg border border-emerald-800/40 bg-emerald-500/5 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Recommendation</p>
        <p className="mt-1 text-sm leading-6 text-slate-300">{finding.recommendation}</p>
      </div>
    </div>
  )
}

function FileGroup({ file, findings }: { file: string; findings: ReviewFinding[] }) {
  return (
    <Card>
      <CardContent className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <p className="font-mono text-sm font-semibold text-emerald-300">{file}</p>
          <span className="text-xs text-slate-400">
            {findings.length} finding{findings.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="mt-3 space-y-3">
          {findings.map((finding, idx) => (
            <FindingCard key={idx} finding={finding} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function CodeReviewResultView({ review, isLoading, isReviewing }: CodeReviewResultViewProps) {
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
      <LoadingState
        title="Reviewing repository..."
        description="The AI is analyzing code quality and prioritizing findings."
      />
    )
  }

  if (isLoading && !review) {
    return <LoadingState title="Loading review detail..." />
  }

  if (!review) {
    return (
      <EmptyState
        icon={<FileCode2 size={28} />}
        title="No code review yet"
        description="Upload a ZIP or paste a GitHub URL to get a full code review with a quality score."
      />
    )
  }

  const { result } = review

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card glow className="overflow-hidden">
        <div className="border-b border-white/10 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">Code Review</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-50">{review.repo_source}</h2>
          <p className="mt-2 text-xs text-slate-500">{new Date(review.created_at).toLocaleString()}</p>
        </div>
      </Card>

      <Card>
        <CardContent>
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
        </CardContent>
      </Card>

      {result.strengths.length > 0 ? (
        <Card>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-300">
                <CheckCircle2 size={16} />
              </div>
              <h3 className="font-semibold text-slate-100">Strengths</h3>
            </div>
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
          </CardContent>
        </Card>
      ) : null}

      {result.findings.length > 0 ? (
        <Card>
          <CardContent>
            <h3 className="font-semibold text-slate-100">Findings by File ({result.findings.length})</h3>
            <div className="mt-4 space-y-4">
              {fileGroups.map(([file, findings]) => (
                <FileGroup key={file} file={file} findings={findings} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-slate-400">No findings — the analyzed excerpt looks clean.</CardContent>
        </Card>
      )}

      {result.recommendations.length > 0 ? (
        <Card>
          <CardContent>
            <h3 className="font-semibold text-slate-100">Recommendations</h3>
            <ul className="mt-3 space-y-2">
              {result.recommendations.map((rec, index) => (
                <li
                  key={index}
                  className="rounded-lg border border-white/5 bg-slate-950/40 px-3 py-2 text-sm leading-6 text-slate-300"
                >
                  <span className="mr-2 font-mono text-emerald-400">{index + 1}.</span>
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </motion.div>
  )
}
