import { type FormEvent, useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import DebugHistoryList from '../components/DebugHistoryList'
import DebugResultView from '../components/DebugResultView'
import { useBugDebug } from '../hooks/useBugDebug'

type Mode = 'github' | 'zip' | 'file' | 'paste'

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

const MODE_TABS: { value: Mode; label: string }[] = [
  { value: 'github', label: 'GitHub URL' },
  { value: 'zip', label: 'Upload ZIP' },
  { value: 'file', label: 'Upload File' },
  { value: 'paste', label: 'Paste Code' },
]

export default function BugDebuggerPage() {
  const [mode, setMode] = useState<Mode>('github')
  const [repoUrl, setRepoUrl] = useState('')
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [filename, setFilename] = useState('paste.py')
  const [language, setLanguage] = useState('python')
  const [sourceCode, setSourceCode] = useState('')
  const {
    sessions,
    selectedSession,
    isHistoryLoading,
    isDebugging,
    error,
    selectSessionById,
    deleteSession,
    analyzeGithub,
    analyzeZip,
    analyzeFile,
    analyzeCode,
  } = useBugDebug()

  const monacoLanguage = useMemo(
    () => LANGUAGE_OPTIONS.find((o) => o.value === language)?.monaco ?? 'plaintext',
    [language],
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (mode === 'github') {
      if (!repoUrl.trim()) return
      await analyzeGithub(repoUrl.trim())
    } else if (mode === 'zip') {
      if (!zipFile) return
      await analyzeZip(zipFile)
    } else if (mode === 'file') {
      if (!sourceFile) return
      await analyzeFile(sourceFile)
    } else {
      if (!sourceCode.trim()) return
      await analyzeCode({ filename, language, source_code: sourceCode })
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setSourceFile(file)
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
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Module 8</p>
        <h1 className="text-3xl font-semibold text-slate-100">Bug Debugger</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Point it at a public GitHub URL, upload a ZIP, upload a single file, or paste code. The
          AI analyzes the code to surface bugs, explain root causes, and suggest concrete fixes.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">History</h2>
            <span className="text-sm text-slate-500">{sessions.length} saved</span>
          </div>
          <DebugHistoryList
            sessions={sessions}
            selectedId={selectedSession?.id ?? null}
            onSelect={selectSessionById}
            onDelete={deleteSession}
            isLoading={isHistoryLoading}
          />
        </aside>

        <section className="space-y-6">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
              {MODE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setMode(tab.value)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition ${
                    mode === tab.value
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {mode === 'github' ? (
              <div>
                <label htmlFor="debug-repo-url" className="text-sm font-medium text-slate-200">
                  Public GitHub repository URL
                </label>
                <input
                  id="debug-repo-url"
                  type="text"
                  value={repoUrl}
                  onChange={(event) => setRepoUrl(event.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500"
                />
              </div>
            ) : mode === 'zip' ? (
              <div>
                <label htmlFor="debug-zip-file" className="text-sm font-medium text-slate-200">
                  Repository ZIP archive
                </label>
                <input
                  id="debug-zip-file"
                  type="file"
                  accept=".zip"
                  onChange={(event) => setZipFile(event.target.files?.[0] ?? null)}
                  className="mt-3 block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-slate-700"
                />
                {zipFile ? (
                  <p className="mt-2 text-xs text-slate-400">Selected: {zipFile.name}</p>
                ) : null}
              </div>
            ) : mode === 'file' ? (
              <div>
                <label htmlFor="debug-source-file" className="text-sm font-medium text-slate-200">
                  Source file (single file)
                </label>
                <input
                  id="debug-source-file"
                  type="file"
                  accept=".py,.js,.jsx,.ts,.tsx,.java,.go,.rs,.c,.h,.cpp,.hpp,.cs,.rb,.php,.swift,.kt,.html,.css,.scss,.sh,.bash,.sql,.json,.yaml,.yml,.md,.txt"
                  onChange={handleFileChange}
                  className="mt-3 block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-slate-700"
                />
                {sourceFile ? (
                  <p className="mt-2 text-xs text-slate-400">Selected: {sourceFile.name}</p>
                ) : null}
              </div>
            ) : (
              <div>
                <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
                  <div>
                    <label htmlFor="debug-filename" className="text-sm font-medium text-slate-200">
                      Filename
                    </label>
                    <input
                      id="debug-filename"
                      type="text"
                      value={filename}
                      onChange={(event) => setFilename(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="debug-language" className="text-sm font-medium text-slate-200">
                      Language
                    </label>
                    <select
                      id="debug-language"
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
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="debug-source-code" className="text-sm font-medium text-slate-200">
                      Source code
                    </label>
                    <span className="text-xs text-slate-500">Max 50KB</span>
                  </div>
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-700">
                    <Editor
                      height="320px"
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
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isDebugging}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800"
              >
                {isDebugging ? 'Debugging...' : 'Debug Code'}
              </button>
              {isDebugging ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                  Analyzing code for bugs, this may take a minute...
                </div>
              ) : null}
            </div>
            {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
          </form>

          <DebugResultView
            session={selectedSession}
            isLoading={isHistoryLoading}
            isDebugging={isDebugging}
          />
        </section>
      </div>
    </div>
  )
}
