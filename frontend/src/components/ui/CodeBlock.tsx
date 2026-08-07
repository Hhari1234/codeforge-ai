import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark'
import { Check, Copy, Download } from 'lucide-react'
import { useState } from 'react'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
  showCopy?: boolean
  showDownload?: boolean
  wrapLongLines?: boolean
}

function normalizeLanguage(language?: string): string {
  if (!language) return 'text'
  const map: Record<string, string> = {
    ts: 'typescript',
    js: 'javascript',
    jsx: 'jsx',
    tsx: 'tsx',
    py: 'python',
    rb: 'ruby',
    rs: 'rust',
    sh: 'bash',
    shell: 'bash',
    yml: 'yaml',
    cpp: 'cpp',
    cs: 'csharp',
    md: 'markdown',
    plaintext: 'text',
    text: 'text',
  }
  return map[language.toLowerCase()] || language.toLowerCase()
}

function downloadFile(content: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function CodeBlock({
  code,
  language,
  filename,
  showCopy = true,
  showDownload = false,
  wrapLongLines = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const lang = normalizeLanguage(language)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = code
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="group overflow-hidden rounded-xl border border-white/10 bg-[#0d1421]">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          </div>
          {filename ? (
            <span className="ml-2 font-mono text-xs text-slate-400">{filename}</span>
          ) : (
            <span className="ml-2 font-mono text-xs uppercase text-slate-500">{lang}</span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {showDownload ? (
            <button
              type="button"
              onClick={() => downloadFile(code, filename || `code.${lang === 'text' ? 'txt' : lang}`)}
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
              aria-label="Download code"
            >
              <Download size={14} />
            </button>
          ) : null}
          {showCopy ? (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Copy code"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          ) : null}
        </div>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={lang}
          style={oneDark}
          customStyle={{
            margin: 0,
            background: 'transparent',
            padding: '1rem',
            fontSize: '0.8125rem',
            lineHeight: '1.6',
          }}
          codeTagProps={{
            style: { fontFamily: "'JetBrains Mono', ui-monospace, monospace" },
          }}
          wrapLongLines={wrapLongLines}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
