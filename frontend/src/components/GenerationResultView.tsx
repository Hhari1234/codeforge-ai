import { motion } from 'framer-motion'
import { Rocket, Lightbulb, FolderTree, Database, Plug, Layers, ShieldCheck, BookOpen } from 'lucide-react'
import type { ProjectGenerationOut } from '../types/projectGeneration'
import { Card, CardContent } from './ui/Card'
import { EmptyState } from './ui/EmptyState'
import { LoadingState } from './ui/LoadingState'
import { Markdown } from './ui/Markdown'

interface GenerationResultViewProps {
  generation: ProjectGenerationOut | null
  isLoading: boolean
  isGenerating: boolean
}

interface SectionConfig {
  key: string
  title: string
  items: string[]
  icon: React.ReactNode
}

function Section({ title, items, icon }: Omit<SectionConfig, 'key'>) {
  return (
    <Card>
      <CardContent>
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300">
            {icon}
          </div>
          <h3 className="font-semibold text-slate-100">{title}</h3>
        </div>
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-lg border border-white/5 bg-slate-950/40 px-3 py-2 text-sm leading-6 text-slate-300"
            >
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export default function GenerationResultView({ generation, isLoading, isGenerating }: GenerationResultViewProps) {
  if (isGenerating && !generation) {
    return (
      <LoadingState
        title="Generating your project specification..."
        description="The AI is crafting a complete technical spec for your idea."
      />
    )
  }

  if (isLoading && !generation) {
    return <LoadingState title="Loading generation detail..." />
  }

  if (!generation) {
    return (
      <EmptyState
        icon={<Rocket size={28} />}
        title="No project spec yet"
        description="Submit an idea to generate a full technical specification."
      />
    )
  }

  const sections: SectionConfig[] = [
    { key: 'requirements', title: 'Requirements', items: generation.result.requirements, icon: <Lightbulb size={16} /> },
    { key: 'features', title: 'Features', items: generation.result.features, icon: <Layers size={16} /> },
    { key: 'folder', title: 'Folder Structure', items: generation.result.folder_structure, icon: <FolderTree size={16} /> },
    { key: 'db', title: 'Database Schema', items: generation.result.database_schema, icon: <Database size={16} /> },
    { key: 'rest', title: 'REST APIs', items: generation.result.rest_apis, icon: <Plug size={16} /> },
    { key: 'tech', title: 'Tech Stack', items: generation.result.tech_stack, icon: <Layers size={16} /> },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card glow className="overflow-hidden">
        <div className="border-b border-white/10 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-400">Project spec</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-50">{generation.result.project_name}</h2>
            </div>
            <span className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-sm text-indigo-300">
              {generation.idea}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {sections.map((section) => (
          <Section key={section.key} title={section.title} items={section.items} icon={section.icon} />
        ))}
      </div>

      <Card>
        <CardContent>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-300">
              <ShieldCheck size={16} />
            </div>
            <h3 className="font-semibold text-slate-100">Authentication</h3>
          </div>
          <p className="text-sm leading-7 text-slate-300">{generation.result.authentication}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-300">
              <BookOpen size={16} />
            </div>
            <h3 className="font-semibold text-slate-100">README</h3>
          </div>
          <Markdown>{generation.result.readme}</Markdown>
        </CardContent>
      </Card>
    </motion.div>
  )
}
