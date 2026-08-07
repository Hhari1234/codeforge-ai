import { type FormEvent, useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Bug } from 'lucide-react'
import DebugResultView from '../components/DebugResultView'
import { useBugDebug } from '../hooks/useBugDebug'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'
import { Input, Select } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { HistoryPanel } from '../components/ui/HistoryPanel'
import { Tabs } from '../components/ui/Tabs'
import { FileUpload } from '../components/ui/FileUpload'

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
  '.py': 'python', '.pyw': 'python', '.js': 'javascript', '.jsx': 'jsx',
  '.ts': 'typescript', '.tsx': 'tsx', '.java': 'java', '.go': 'go',
  '.rs': 'rust', '.c': 'c', '.h': 'c', '.cpp': 'cpp', '.hpp': 'cpp',
  '.cs': 'csharp', '.rb': 'ruby', '.php': 'php', '.swift': 'swift',
  '.kt': 'kotlin', '.html': 'html', '.htm': 'html', '.css': 'css',
  '.scss': 'css', '.sh': 'shell', '.bash': 'shell', '.sql': 'sql',
  '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.md': 'markdown',
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
  const [zipFile, setZipFile] = useState<File[]>([])
  const [sourceFile, setSourceFile] = useState<File[]>([])
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
      if (!zipFile[0]) return
      await analyzeZip(zipFile[0])
    } else if (mode === 'file') {
      if (!sourceFile[0]) return
      await analyzeFile(sourceFile[0])
    } else {
      if (!sourceCode.trim()) return
      await analyzeCode({ filename, language, source_code: sourceCode })
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setSourceFile([file])
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
    <div>
      <PageHeader
        eyebrow="Module 8"
        title="Bug Debugger"
        description="Point it at a public GitHub URL, upload a ZIP, upload a single file, or paste code. The AI analyzes the code to surface bugs, explain root causes, and suggest concrete fixes."
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <HistoryPanel
          title="History"
          items={sessions.map((s) => ({
            id: s.id,
            title: s.repo_source,
            subtitle: new Date(s.created_at).toLocaleDateString(),
          }))}
          selectedId={selectedSession?.id ?? null}
          onSelect={selectSessionById}
          isLoading={isHistoryLoading}
          count={sessions.length}
          emptyTitle="No debug sessions yet"
          emptyDescription="Debug some code to see your results here."
        />

        <section className="space-y-6">
          <Card glow>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-500 text-white">
                    <Bug size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">Debug Code</h3>
                    <p className="text-xs text-slate-500">Find and fix bugs with AI assistance</p>
                  </div>
                </div>

                <Tabs<Mode> items={MODE_TABS} value={mode} onChange={setMode} />

                {mode === 'github' ? (
                  <Input
                    id="debug-repo-url"
                    label="Public GitHub repository URL"
                    type="text"
                    value={repoUrl}
                    onChange={(event) => setRepoUrl(event.target.value)}
                    placeholder="https://github.com/owner/repo"
                  />
                ) : mode === 'zip' ? (
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-200">Repository ZIP archive</p>
                    <FileUpload
                      accept=".zip"
                      label="Drag & drop your repository ZIP here"
                      hint="Upload a ZIP archive of your repository"
                      onFilesChange={setZipFile}
                    />
                  </div>
                ) : mode === 'file' ? (
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-200">Source file (single file)</p>
                    <FileUpload
                      accept=".py,.js,.jsx,.ts,.tsx,.java,.go,.rs,.c,.h,.cpp,.hpp,.cs,.rb,.php,.swift,.kt,.html,.css,.scss,.sh,.bash,.sql,.json,.yaml,.yml,.md,.txt"
                      label="Drag & drop a source file here"
                      hint="Paste a single source file to debug"
                      onFilesChange={(files) => {
                        setSourceFile(files)
                        if (files[0]) handleFileChange({ target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>)
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
                      <Input
                        id="debug-filename"
                        label="Filename"
                        type="text"
                        value={filename}
                        onChange={(event) => setFilename(event.target.value)}
                      />
                      <Select
                        id="debug-language"
                        label="Language"
                        value={language}
                        onChange={(event) => setLanguage(event.target.value)}
                      >
                        {LANGUAGE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-200">Source code</p>
                        <span className="text-xs text-slate-500">Max 50KB</span>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-white/10">
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

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="submit"
                    variant="gradient"
                    loading={isDebugging}
                    disabled={
                      mode === 'github' ? !repoUrl.trim() : mode === 'zip' ? !zipFile[0] : mode === 'file' ? !sourceFile[0] : !sourceCode.trim()
                    }
                  >
                    {isDebugging ? 'Debugging...' : 'Debug Code'}
                  </Button>
                  {isDebugging ? (
                    <p className="text-sm text-slate-400">Analyzing code for bugs, this may take a minute...</p>
                  ) : null}
                </div>

                {error ? (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                    {error}
                  </div>
                ) : null}
              </form>
            </CardContent>
          </Card>

          <DebugResultView session={selectedSession} isLoading={isHistoryLoading} isDebugging={isDebugging} />
        </section>
      </div>
    </div>
  )
}
