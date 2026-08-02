import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RepositoryAnalysisOut } from '../types/repositoryAnalysis'

interface RepositoryAnalysisResultViewProps {
  analysis: RepositoryAnalysisOut | null
  isLoading: boolean
  isAnalyzing: boolean
}

interface SectionProps {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}

function Section({ title, defaultOpen = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
      >
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        <span className="text-sm text-slate-500">{open ? 'Collapse' : 'Expand'}</span>
      </button>
      {open ? <div className="border-t border-slate-800 px-6 py-5">{children}</div> : null}
    </div>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item, index) => (
        <li key={index} className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm leading-6 text-slate-300">
          {item}
        </li>
      ))}
    </ul>
  )
}

export default function RepositoryAnalysisResultView({
  analysis,
  isLoading,
  isAnalyzing,
}: RepositoryAnalysisResultViewProps) {
  const navigate = useNavigate()
  if (isAnalyzing && !analysis) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
        Analyzing repository... this may take a minute.
      </div>
    )
  }

  if (isLoading && !analysis) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
        Loading analysis detail...
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-8 text-slate-400">
        Upload a ZIP or paste a GitHub URL to get a full repository analysis.
      </div>
    )
  }

  const { result } = analysis

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Repository Analysis</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-100">{analysis.repo_source}</h2>
        <p className="mt-2 text-xs text-slate-500">{new Date(analysis.created_at).toLocaleString()}</p>
      </div>

      <div className="space-y-4">
        <Section title="Architecture Summary" defaultOpen>
          <p className="text-sm leading-7 text-slate-300">{result.architecture_summary}</p>
        </Section>

        <Section title="Folder Structure">
          <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs leading-5 text-emerald-300">
            {result.folder_structure}
          </pre>
        </Section>

        <Section title="Dependencies">
          {result.dependencies.length > 0 ? (
            <BulletList items={result.dependencies} />
          ) : (
            <p className="text-sm text-slate-400">No dependencies identified in the analyzed files.</p>
          )}
        </Section>

        <Section title="Database Findings">
          <p className="text-sm leading-7 text-slate-300">{result.database_findings}</p>
        </Section>

        <Section title="Auth Findings">
          <p className="text-sm leading-7 text-slate-300">{result.auth_findings}</p>
        </Section>

        <Section title="API Flow">
          <p className="text-sm leading-7 text-slate-300">{result.api_flow}</p>
        </Section>

        <Section title="Weaknesses">
          {result.weaknesses.length > 0 ? (
            <BulletList items={result.weaknesses} />
          ) : (
            <p className="text-sm text-slate-400">No weaknesses identified in the analyzed files.</p>
          )}
        </Section>

        <Section title="Suggestions">
          {result.suggestions.length > 0 ? (
            <BulletList items={result.suggestions} />
          ) : (
            <p className="text-sm text-slate-400">No suggestions at this time.</p>
          )}
        </Section>

        {analysis && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate(`/repository/${analysis.id}/chat`)}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Chat with this repo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

