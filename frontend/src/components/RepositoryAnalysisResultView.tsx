import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { FolderTree, ChevronDown, MessageSquare, Database, Shield, Network, AlertTriangle, Lightbulb, Boxes } from 'lucide-react'
import type { RepositoryAnalysisOut } from '../types/repositoryAnalysis'
import { Card } from './ui/Card'
import { EmptyState } from './ui/EmptyState'
import { LoadingState } from './ui/LoadingState'
import { CodeBlock } from './ui/CodeBlock'
import { Button } from './ui/Button'

interface RepositoryAnalysisResultViewProps {
  analysis: RepositoryAnalysisOut | null
  isLoading: boolean
  isAnalyzing: boolean
}

function Section({
  icon,
  title,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-violet-300">
            {icon}
          </div>
          <h3 className="font-semibold text-slate-100">{title}</h3>
        </div>
        <ChevronDown
          size={18}
          className={`text-slate-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/10 px-6 py-5">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item, index) => (
        <li
          key={index}
          className="rounded-lg border border-white/5 bg-slate-950/40 px-3 py-2 text-sm leading-6 text-slate-300"
        >
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
      <LoadingState
        title="Analyzing repository..."
        description="The AI is reviewing the file tree and key source files."
      />
    )
  }

  if (isLoading && !analysis) {
    return <LoadingState title="Loading analysis detail..." />
  }

  if (!analysis) {
    return (
      <EmptyState
        icon={<Boxes size={28} />}
        title="No repository analysis yet"
        description="Upload a ZIP or paste a GitHub URL to get a full repository analysis."
      />
    )
  }

  const { result } = analysis

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card glow className="overflow-hidden">
        <div className="border-b border-white/10 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-transparent px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-400">Repository Analysis</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-50">{analysis.repo_source}</h2>
          <p className="mt-2 text-xs text-slate-500">{new Date(analysis.created_at).toLocaleString()}</p>
        </div>
      </Card>

      <Section icon={<Boxes size={16} />} title="Architecture Summary" defaultOpen>
        <p className="text-sm leading-7 text-slate-300">{result.architecture_summary}</p>
      </Section>

      <Section icon={<FolderTree size={16} />} title="Folder Structure">
        <CodeBlock code={result.folder_structure} language="text" filename="folder-structure.txt" />
      </Section>

      <Section icon={<Boxes size={16} />} title="Dependencies">
        {result.dependencies.length > 0 ? (
          <BulletList items={result.dependencies} />
        ) : (
          <p className="text-sm text-slate-400">No dependencies identified in the analyzed files.</p>
        )}
      </Section>

      <Section icon={<Database size={16} />} title="Database Findings">
        <p className="text-sm leading-7 text-slate-300">{result.database_findings}</p>
      </Section>

      <Section icon={<Shield size={16} />} title="Auth Findings">
        <p className="text-sm leading-7 text-slate-300">{result.auth_findings}</p>
      </Section>

      <Section icon={<Network size={16} />} title="API Flow">
        <p className="text-sm leading-7 text-slate-300">{result.api_flow}</p>
      </Section>

      <Section icon={<AlertTriangle size={16} />} title="Weaknesses">
        {result.weaknesses.length > 0 ? (
          <BulletList items={result.weaknesses} />
        ) : (
          <p className="text-sm text-slate-400">No weaknesses identified in the analyzed files.</p>
        )}
      </Section>

      <Section icon={<Lightbulb size={16} />} title="Suggestions">
        {result.suggestions.length > 0 ? (
          <BulletList items={result.suggestions} />
        ) : (
          <p className="text-sm text-slate-400">No suggestions at this time.</p>
        )}
      </Section>

      {analysis ? (
        <div className="pt-2">
          <Button
            variant="gradient"
            icon={<MessageSquare size={16} />}
            onClick={() => navigate(`/repository/${analysis.id}/chat`)}
          >
            Chat with this repo
          </Button>
        </div>
      ) : null}
    </motion.div>
  )
}
