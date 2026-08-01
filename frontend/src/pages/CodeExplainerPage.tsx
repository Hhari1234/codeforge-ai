import { useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import CodeExplanationHistoryList from '../components/CodeExplanationHistoryList'
import CodeExplanationResultView from '../components/CodeExplanationResultView'
import { useCodeExplanation } from '../hooks/useCodeExplanation'

const LANGUAGE_OPTIONS = [
  { value: 'python', label: 'Python', monaco: 'python' },
  { value: 'javascript', label: 'JavaScript', monaco: 'javascript' },
  { value: 'typescript', label: 'TypeScript', monaco: 'typescript' },
  { value: 'tsx', label: 'TSX (React)', monaco: 'typescript' },
  { value: 'jsx', label: 'JSX (React)', monaco: 'javascript' },
  { value: 'java', label: 'Java', monaco: 'java' },
  { value: 'go', label: 'Go', monaco: 'go' },
  { value: 'rust', label: 'Rust', monaco: 'rust' },
  { value: 'c', label: 'C', monaco: 'c' },
  { value: 'cpp', label: 'C++', monaco: 'cpp' },
  { value: 'csharp', label: 'C#', monaco: 'csharp' },
  { value: 'ruby', label: 'Ruby', monaco: 'ruby' },
  { value: 'php', label: 'PHP', monaco: 'php' },
  { value: 'swift', label: 'Swift', monaco: 'swift' },
  { value: 'kotlin', label: 'Kotlin', monaco: 'kotlin' },
  { value: 'html', label: 'HTML', monaco: 'html' },
  { value: 'css', label: 'CSS', monaco: 'css' },
  { value: 'shell', label: 'Shell', monaco: 'shell' },
  { value: 'sql', label: 'SQL', monaco: 'sql' },
  { value: 'json', label: 'JSON', monaco: 'json' },
  { value: 'yaml', label: 'YAML', monaco: 'yaml' },
  { value: 'markdown', label: 'Markdown', monaco: 'markdown' },
  { value: 'plaintext', label: 'Plain Text', monaco: 'plaintext' },
]

// filename → language value auto-selection for uploads
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.py': 'python',
  '.pyw': 'python',
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'css',
  '.sh': 'shell',
  '.bash': 'shell',
  '.sql': 'sql',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.md': 'markdown',
  '.txt': 'plaintext',
}

function languageLabel(value: string): string {
  return LANGUAGE_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export default function CodeExplainerPage() {
  const [filename, setFilename] = useState('paste.py')
  const [language, setLanguage] = useState('python')
  const [sourceCode, setSourceCode] = useState('')
  const {
    explanations,
    selectedExplanation,
    isHistoryLoading,
    isExplaining,
    error,
    selectExplanationById,
    explainCode,
  } = useCodeExplanation()

  const monacoLanguage = useMemo(
    () => LANGUAGE_OPTIONS.find((o) => o.value === language)?.monaco ?? 'plaintext',
    [language],
  )

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!sourceCode.trim()) {
      return
    }
    await explainCode({ filename, language, source_code: sourceCode })
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setFilename(file.name)

    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
    const detectedLanguage = EXTENSION_TO_LANGUAGE[ext]
    if (detectedLanguage) {
      setLanguage(detectedLanguage)
    } else {
      setLanguage('plaintext')
    }

    const reader = new FileReader()
    reader.onload = () => {
      setSourceCode(String(reader.result ?? ''))
    }
    reader.readAsText(file)
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-3">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Module 3</p>
        <h1 className="text-3xl font-semibold text-slate-100">Code Explainer</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Paste or upload a single source file. The AI explains every function, class, and the
          overall flow — with syntax highlighting powered by Monaco.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">History</h2>
            <span className="text-sm text-slate-500">{explanations.length} saved</span>
          </div>
          <CodeExplanationHistoryList
            explanations={explanations}
            selectedId={selectedExplanation?.id ?? null}
            onSelect={selectExplanationById}
            isLoading={isHistoryLoading}
          />
        </aside>

        <section className="space-y-6">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="grid gap-4 sm:grid-cols-[1fr_220px_auto]">
              <div>
                <label htmlFor="filename" className="text-sm font-medium text-slate-200">
                  Filename
                </label>
                <input
                  id="filename"
                  type="text"
                  value={filename}
                  onChange={(event) => setFilename(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="language" className="text-sm font-medium text-slate-200">
                  Language
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none ring-0"
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label
                  htmlFor="source-file"
                  className="cursor-pointer rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 transition hover:border-emerald-500/50 hover:text-emerald-300"
                >
                  Upload file
                  <input
                    id="source-file"
                    type="file"
                    className="hidden"
                    accept=".py,.js,.jsx,.ts,.tsx,.java,.go,.rs,.c,.h,.cpp,.hpp,.cs,.rb,.php,.swift,.kt,.html,.css,.scss,.sh,.bash,.sql,.json,.yaml,.yml,.md,.txt"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <label htmlFor="source-code" className="text-sm font-medium text-slate-200">
                  Source code
                </label>
                <span className="text-xs text-slate-500">
                  Max 50KB · {languageLabel(language)}
                </span>
              </div>
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-700">
                <Editor
                  height="420px"
                  language={monacoLanguage}
                  value={sourceCode}
                  onChange={(value) => setSourceCode(value ?? '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                  }}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isExplaining}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800"
              >
                {isExplaining ? 'Explaining...' : 'Explain Code'}
              </button>
              {isExplaining ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                  This can take 10–30 seconds.
                </div>
              ) : null}
            </div>
            {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
          </form>

          <CodeExplanationResultView
            explanation={selectedExplanation}
            isLoading={isHistoryLoading}
            isExplaining={isExplaining}
          />
        </section>
      </div>
    </div>
  )
}

