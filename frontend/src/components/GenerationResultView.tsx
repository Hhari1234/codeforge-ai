import ReactMarkdown from 'react-markdown'
import type { ProjectGenerationOut } from '../types/projectGeneration'

interface GenerationResultViewProps {
  generation: ProjectGenerationOut | null
  isLoading: boolean
  isGenerating: boolean
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm text-slate-300">
        {items.map((item) => (
          <li key={item} className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function GenerationResultView({ generation, isLoading, isGenerating }: GenerationResultViewProps) {
  if (isGenerating && !generation) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
        Generating your project specification...
      </div>
    )
  }

  if (isLoading && !generation) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
        Loading generation detail...
      </div>
    )
  }

  if (!generation) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-8 text-slate-400">
        Submit an idea to generate a full technical specification.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Project spec</p>
            <h2 className="text-2xl font-semibold text-slate-100">{generation.result.project_name}</h2>
          </div>
          <span className="rounded-full border border-emerald-700/50 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
            {generation.idea}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Requirements" items={generation.result.requirements} />
        <Section title="Features" items={generation.result.features} />
        <Section title="Folder Structure" items={generation.result.folder_structure} />
        <Section title="Database Schema" items={generation.result.database_schema} />
        <Section title="REST APIs" items={generation.result.rest_apis} />
        <Section title="Tech Stack" items={generation.result.tech_stack} />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Authentication</h3>
        <p className="mt-2 text-sm leading-7 text-slate-300">{generation.result.authentication}</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h3 className="text-lg font-semibold text-slate-100">README</h3>
        <div className="prose prose-invert mt-4 max-w-none text-sm text-slate-300">
          <ReactMarkdown>{generation.result.readme}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
