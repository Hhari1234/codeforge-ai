import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { ReadmeGenerationOut } from '../types/readmeGeneration'

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

export default function ReadmeResultView({ generation, isLoading, isGenerating }: ReadmeResultViewProps) {
  const [copied, setCopied] = useState(false)

  if (isGenerating && !generation) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
        Generating your README...
      </div>
    )
  }

  if (isLoading && !generation) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
        Loading README detail...
      </div>
    )
  }

  if (!generation) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-8 text-slate-400">
        Upload a project or paste a description to generate a README.
      </div>
    )
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generation.result.full_markdown)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Generated README</p>
            <h2 className="text-2xl font-semibold text-slate-100">{generation.result.title}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-emerald-500/50 hover:text-emerald-300"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={() => downloadReadme(generation.result.full_markdown, safeFilename(generation.result.title))}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Download as README.md
            </button>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-400">{generation.result.description}</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Tech Stack</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {generation.result.tech_stack.map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-sm text-slate-300"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Features</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          {generation.result.features.map((feature) => (
            <li key={feature} className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Installation</h3>
        <div className="prose prose-invert mt-4 max-w-none text-sm text-slate-300">
          <ReactMarkdown>{generation.result.installation}</ReactMarkdown>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Usage</h3>
        <div className="prose prose-invert mt-4 max-w-none text-sm text-slate-300">
          <ReactMarkdown>{generation.result.usage}</ReactMarkdown>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Folder Structure</h3>
        <div className="prose prose-invert mt-4 max-w-none text-sm text-slate-300">
          <ReactMarkdown>{generation.result.folder_structure_explanation}</ReactMarkdown>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Full README Preview</h3>
        <div className="prose prose-invert mt-4 max-w-none text-sm text-slate-300">
          <ReactMarkdown>{generation.result.full_markdown}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

