import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, Download, FileText, Layers, Sparkles, BookOpen, FolderTree } from 'lucide-react'
import type { ReadmeGenerationOut } from '../types/readmeGeneration'
import { Card, CardContent } from './ui/Card'
import { EmptyState } from './ui/EmptyState'
import { LoadingState } from './ui/LoadingState'
import { Markdown } from './ui/Markdown'
import { Button } from './ui/Button'

interface ReadmeResultViewProps {
  generation: ReadmeGenerationOut | null
  isLoading: boolean
  isGenerating: boolean
}

function downloadReadme(markdown: string, filename: string) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function safeFilename(title: string): string {
  const cleaned = title
    .trim()
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
  return cleaned ? `README-${cleaned}.md` : 'README.md'
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent>
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300">
            {icon}
          </div>
          <h3 className="font-semibold text-slate-100">{title}</h3>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

export default function ReadmeResultView({ generation, isLoading, isGenerating }: ReadmeResultViewProps) {
  const [copied, setCopied] = useState(false)

  if (isGenerating && !generation) {
    return (
      <LoadingState
        title="Generating your README..."
        description="The AI is drafting a complete README for your project."
      />
    )
  }

  if (isLoading && !generation) {
    return <LoadingState title="Loading README detail..." />
  }

  if (!generation) {
    return (
      <EmptyState
        icon={<FileText size={28} />}
        title="No README yet"
        description="Upload a project or paste a description to generate a README."
      />
    )
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generation.result.full_markdown)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card glow className="overflow-hidden">
        <div className="border-b border-white/10 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400">Generated README</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-50">{generation.result.title}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" icon={copied ? <Check size={16} /> : <Copy size={16} />} onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button
                variant="gradient"
                icon={<Download size={16} />}
                onClick={() => downloadReadme(generation.result.full_markdown, safeFilename(generation.result.title))}
              >
                Download
              </Button>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-400">{generation.result.description}</p>
        </div>
      </Card>

      <SectionCard icon={<Layers size={16} />} title="Tech Stack">
        <div className="flex flex-wrap gap-2">
          {generation.result.tech_stack.map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-sm text-slate-300"
            >
              {tech}
            </span>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={<Sparkles size={16} />} title="Features">
        <ul className="space-y-2">
          {generation.result.features.map((feature) => (
            <li
              key={feature}
              className="rounded-lg border border-white/5 bg-slate-950/40 px-3 py-2 text-sm leading-6 text-slate-300"
            >
              {feature}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard icon={<BookOpen size={16} />} title="Installation">
        <Markdown>{generation.result.installation}</Markdown>
      </SectionCard>

      <SectionCard icon={<BookOpen size={16} />} title="Usage">
        <Markdown>{generation.result.usage}</Markdown>
      </SectionCard>

      <SectionCard icon={<FolderTree size={16} />} title="Folder Structure">
        <Markdown>{generation.result.folder_structure_explanation}</Markdown>
      </SectionCard>

      <SectionCard icon={<FileText size={16} />} title="Full README Preview">
        <Markdown>{generation.result.full_markdown}</Markdown>
      </SectionCard>
    </motion.div>
  )
}
