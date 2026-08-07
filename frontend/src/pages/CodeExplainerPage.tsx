import { useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Wand2, Upload } from 'lucide-react'
import CodeExplanationResultView from '../components/CodeExplanationResultView'
import { useCodeExplanation } from '../hooks/useCodeExplanation'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'
import { Input, Select } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { HistoryPanel } from '../components/ui/HistoryPanel'

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
    <div>
      <PageHeader
        eyebrow="Module 3"
        title="Code Explainer"
        description="Paste or upload a single source file. The AI explains every function, class, and the overall flow — with syntax highlighting powered by Monaco."
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <HistoryPanel
          title="History"
          items={explanations.map((e) => ({
            id: e.id,
            title: e.filename,
            subtitle: e.language,
          }))}
          selectedId={selectedExplanation?.id ?? null}
          onSelect={selectExplanationById}
          isLoading={isHistoryLoading}
          count={explanations.length}
          emptyTitle="No explanations yet"
          emptyDescription="Paste or upload a file to get a structured code explanation."
        />

        <section className="space-y-6">
          <Card glow>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                    <Wand2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">Source Code</h3>
                    <p className="text-xs text-slate-500">Paste or upload a file to explain</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_220px_auto]">
                  <Input
                    id="filename"
                    label="Filename"
                    type="text"
                    value={filename}
                    onChange={(event) => setFilename(event.target.value)}
                  />
                  <Select
                    id="language"
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
                  <div className="flex items-end">
                    <label
                      htmlFor="source-file"
                      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-indigo-500/40 hover:bg-indigo-500/5"
                    >
                      <Upload size={16} />
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

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-200">Source code</p>
                    <span className="text-xs text-slate-500">
                      Max 50KB · {languageLabel(language)}
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-white/10">
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

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" variant="gradient" loading={isExplaining} disabled={!sourceCode.trim()}>
                    {isExplaining ? 'Explaining...' : 'Explain Code'}
                  </Button>
                  {isExplaining ? (
                    <p className="text-sm text-slate-400">This can take 10–30 seconds.</p>
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
