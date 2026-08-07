import { motion } from 'framer-motion'
import { FileCode2, FunctionSquare, Box, Info } from 'lucide-react'
import type { CodeExplanationOut } from '../types/codeExplanation'
import { Card, CardContent } from './ui/Card'
import { EmptyState } from './ui/EmptyState'
import { LoadingState } from './ui/LoadingState'

interface CodeExplanationResultViewProps {
  explanation: CodeExplanationOut | null
  isLoading: boolean
  isExplaining: boolean
}

function DetailCard({
  icon,
  name,
  explanation,
  accent,
}: {
  icon: React.ReactNode
  name: string
  explanation: string
  accent: string
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-950/40 px-4 py-3">
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${accent}`}>{icon}</div>
        <p className="font-mono text-sm font-semibold text-slate-100">{name}</p>
      </div>
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
      <LoadingState
        title="Explaining your code..."
        description="The AI is analyzing functions, classes, and overall flow."
      />
    )
  }

  if (isLoading && !explanation) {
    return <LoadingState title="Loading explanation detail..." />
  }

  if (!explanation) {
    return (
      <EmptyState
        icon={<FileCode2 size={28} />}
        title="No code explanation yet"
        description="Paste or upload a source file to get a structured code explanation."
      />
    )
  }

  const { result } = explanation

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card glow className="overflow-hidden">
        <div className="border-b border-white/10 bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-transparent px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-400">Code explanation</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-50">{explanation.filename}</h2>
            </div>
            <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-sm text-rose-300">
              {explanation.language}
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300">
              <Info size={16} />
            </div>
            <h3 className="font-semibold text-slate-100">Summary</h3>
          </div>
          <p className="text-sm leading-7 text-slate-300">{result.summary}</p>
        </CardContent>
      </Card>

      {result.functions_explained.length > 0 ? (
        <Card>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-300">
                <FunctionSquare size={16} />
              </div>
              <h3 className="font-semibold text-slate-100">Functions</h3>
            </div>
            <div className="space-y-3">
              {result.functions_explained.map((fn) => (
                <DetailCard
                  key={fn.name}
                  icon={<FunctionSquare size={14} />}
                  name={fn.name}
                  explanation={fn.explanation}
                  accent="bg-emerald-500/20 text-emerald-300"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {result.classes_explained.length > 0 ? (
        <Card>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500/20 to-blue-500/20 text-sky-300">
                <Box size={16} />
              </div>
              <h3 className="font-semibold text-slate-100">Classes</h3>
            </div>
            <div className="space-y-3">
              {result.classes_explained.map((cls) => (
                <DetailCard
                  key={cls.name}
                  icon={<Box size={14} />}
                  name={cls.name}
                  explanation={cls.explanation}
                  accent="bg-sky-500/20 text-sky-300"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-violet-300">
              <Info size={16} />
            </div>
            <h3 className="font-semibold text-slate-100">Overall Flow</h3>
          </div>
          <p className="text-sm leading-7 text-slate-300">{result.overall_flow}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
