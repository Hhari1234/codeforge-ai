import { useMemo, useState } from 'react'
import type {
  BugDebugOut,
  BugSeverity,
  DebugBug,
} from '../types/bugDebug'

interface DebugResultViewProps {
  session: BugDebugOut | null
  isLoading: boolean
  isDebugging: boolean
}

const SEVERITY_STYLES: Record<BugSeverity, string> = {
  Critical: 'border-rose-500/50 bg-rose-500/10 text-rose-300',
  High: 'border-orange-500/50 bg-orange-500/10 text-orange-300',
  Medium: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
  Low: 'border-sky-500/50 bg-sky-500/10 text-sky-300',
}

function healthColor(score: number): string {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-amber-400'
  return 'text-rose-400'
}

function healthRingColor(score: number): string {
  if (score >= 80) return 'border-emerald-400'
  if (score >= 60) return 'border-amber-400'
  return 'border-rose-400'
}

function HealthBadge({ score }: { score: number }) {
  return (
    <div
      className={`flex h-28 w-28 items-center justify-center rounded-full border-4 ${healthRingColor(
        score,
      )} bg-slate-950/70`}
    >
      <div className="text-center">
        <div className={`text-3xl font-bold ${healthColor(score)}`}>{score}</div>
        <div className="text-[10px] uppercase tracking-wider text-slate-400">/ 100</div>
      </div>
    </div>
  )
}

function SeveritySummary({ bugs }: { bugs: DebugBug[] }) {
  const counts = useMemo(() => {
    const c: Record<BugSeverity, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 }
    for (const b of bugs) {
      if (c[b.severity] !== undefined) c[b.severity] += 1
    }
    return c
  }, [bugs])

  const order: BugSeverity[] = ['Critical', 'High', 'Medium', 'Low']

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

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function BugCard({ bug }: { bug: DebugBug }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (bug.fixed_code && (await copyText(bug.fixed_code))) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[bug.severity]}`}
          >
            {bug.severity}
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-slate-300">
            {bug.category}
          </span>
        </div>
        {bug.line != null ? <span className="text-xs text-slate-500">Line {bug.line}</span> : null}
      </div>

      <p className="mt-2 text-sm font-semibold text-slate-100">{bug.title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{bug.description}</p>

      <div className="mt-3 rounded-lg border border-rose-800/40 bg-rose-500/5 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-rose-400">Root Cause</p>
        <p className="mt-1 text-sm leading-6 text-slate-300">{bug.root_cause}</p>
      </div>

      <div className="mt-3 rounded-lg border border-emerald-800/40 bg-emerald-500/5 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          Suggested Fix
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-300">{bug.suggested_fix}</p>
      </div>

      {bug.fixed_code ? (
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Fixed Code
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-emerald-500/50 hover:text-emerald-300"
            >
              {copied ? 'Copied!' : 'Copy Fixed Code'}
            </button>
          </div>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs leading-5 text-emerald-300">
            {bug.fixed_code}
          </pre>
        </div>
      ) : null}

      {bug.best_practice ? (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
            Best Practice
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-300">{bug.best_practice}</p>
        </div>
      ) : null}
    </div>
  )
}

function FileGroup({ file, bugs }: { file: string; bugs: DebugBug[] }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
        <p className="font-mono text-sm font-semibold text-emerald-300">{file}</p>
        <span className="text-xs text-slate-400">
          {bugs.length} bug{bugs.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="space-y-3 p-4">
        {bugs.map((bug, idx) => (
          <BugCard key={idx} bug={bug} />
        ))}
      </div>
    </div>
  )
}

function downloadJson(session: BugDebugOut) {
  const payload = {
    id: session.id,
    repo_source: session.repo_source,
    created_at: session.created_at,
    result: session.result,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bug-debug-report-${session.id}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function DebugResultView({
  session,
  isLoading,
  isDebugging,
}: DebugResultViewProps) {
  const fileGroups = useMemo(() => {
    if (!session) return []
    const groups = new Map<string, DebugBug[]>()
    for (const bug of session.result.bugs) {
      const key = bug.file || 'Unknown file'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)?.push(bug)
    }
    return Array.from(groups.entries())
  }, [session])

  if (isDebugging && !session) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
        Debugging code... this may take a minute.
      </div>
    )
  }

  if (isLoading && !session) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
        Loading session detail...
      </div>
    )
  }

  if (!session) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-8 text-slate-400">
        Paste a GitHub URL, upload a ZIP, upload a single file, or paste code to get a bug debug
        report with a health score, root causes, and fixes.
      </div>
    )
  }

  const { result } = session

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Bug Debug Report</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-100">{session.repo_source}</h2>
          <p className="mt-2 text-xs text-slate-500">
            {new Date(session.created_at).toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadJson(session)}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-500/50 hover:text-emerald-300"
        >
          Download JSON Report
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-center gap-6">
          <HealthBadge score={result.health_score} />
          <div className="min-w-[220px] flex-1 space-y-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Overall Code Health Score
              </h3>
              <p className="mt-1 text-sm text-slate-300">{result.summary}</p>
            </div>
            <SeveritySummary bugs={result.bugs} />
          </div>
        </div>
      </div>

      {result.bugs.length > 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold text-slate-100">
            Bugs by File ({result.bugs.length})
          </h3>
          <div className="mt-4 space-y-4">
            {fileGroups.map(([file, bugs]) => (
              <FileGroup key={file} file={file} bugs={bugs} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-slate-400">
          No bugs found in the analyzed excerpt.
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
