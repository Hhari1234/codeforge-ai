import type { CodeExplanationOut } from '../types/codeExplanation'

interface CodeExplanationResultViewProps {
  explanation: CodeExplanationOut | null
  isLoading: boolean
  isExplaining: boolean
}

function FunctionCard({ name, explanation }: { name: string; explanation: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
      <p className="font-mono text-sm font-semibold text-emerald-300">{name}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{explanation}</p>
    </div>
  )
}

function ClassCard({ name, explanation }: { name: string; explanation: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
      <p className="font-mono text-sm font-semibold text-sky-300">{name}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{explanation}</p>
    </div>
  )
}

export default function CodeExplanationResultView({
  explanation,
  isLoading,
  isExplaining,
}: CodeExplanationResultViewProps) {
  if (isExplaining && !explanation) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
        Explaining your code...
      </div>
    )
  }

  if (isLoading && !explanation) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
        Loading explanation detail...
      </div>
    )
  }

  if (!explanation) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-8 text-slate-400">
        Paste or upload a source file to get a structured code explanation.
      </div>
    )
  }

  const { result } = explanation

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Code explanation</p>
            <h2 className="text-2xl font-semibold text-slate-100">{explanation.filename}</h2>
          </div>
          <span className="rounded-full border border-emerald-700/50 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
            {explanation.language}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Summary</h3>
        <p className="mt-3 text-sm leading-7 text-slate-300">{result.summary}</p>
      </div>

      {result.functions_explained.length > 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold text-slate-100">Functions</h3>
          <div className="mt-4 space-y-3">
            {result.functions_explained.map((fn) => (
              <FunctionCard key={fn.name} name={fn.name} explanation={fn.explanation} />
            ))}
          </div>
        </div>
      ) : null}

      {result.classes_explained.length > 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold text-slate-100">Classes</h3>
          <div className="mt-4 space-y-3">
            {result.classes_explained.map((cls) => (
              <ClassCard key={cls.name} name={cls.name} explanation={cls.explanation} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Overall Flow</h3>
        <p className="mt-3 text-sm leading-7 text-slate-300">{result.overall_flow}</p>
      </div>
    </div>
  )
}

