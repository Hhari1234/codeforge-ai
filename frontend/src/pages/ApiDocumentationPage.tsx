import { type FormEvent, useState } from 'react'
import DocumentationHistoryList from '../components/DocumentationHistoryList'
import DocumentationResultView from '../components/DocumentationResultView'
import { useApiDocumentation } from '../hooks/useApiDocumentation'

type Mode = 'github' | 'zip' | 'file' | 'openapi'

const MODE_TABS: { value: Mode; label: string }[] = [
  { value: 'github', label: 'GitHub URL' },
  { value: 'zip', label: 'Upload ZIP' },
  { value: 'file', label: 'Upload File' },
  { value: 'openapi', label: 'OpenAPI Spec' },
]

export default function ApiDocumentationPage() {
  const [mode, setMode] = useState<Mode>('github')
  const [repoUrl, setRepoUrl] = useState('')
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [openApiFile, setOpenApiFile] = useState<File | null>(null)
  const {
    docs,
    selectedDoc,
    isHistoryLoading,
    isGenerating,
    error,
    selectDocById,
    deleteDoc,
    analyzeGithub,
    analyzeZip,
    analyzeFile,
    analyzeOpenApi,
  } = useApiDocumentation()

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
      if (!openApiFile) return
      await analyzeOpenApi(openApiFile)
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-3">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Module 9</p>
        <h1 className="text-3xl font-semibold text-slate-100">API Documentation Generator</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Point it at a public GitHub URL, upload a ZIP, upload a single source file, or provide an
          OpenAPI/Swagger spec. The AI detects the framework and produces professional API
          documentation with endpoints, parameters, examples, and export to Markdown / HTML / PDF.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">History</h2>
            <span className="text-sm text-slate-500">{docs.length} saved</span>
          </div>
          <DocumentationHistoryList
            docs={docs}
            selectedId={selectedDoc?.id ?? null}
            onSelect={selectDocById}
            onDelete={deleteDoc}
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
                <label htmlFor="docs-repo-url" className="text-sm font-medium text-slate-200">
                  Public GitHub repository URL
                </label>
                <input
                  id="docs-repo-url"
                  type="text"
                  value={repoUrl}
                  onChange={(event) => setRepoUrl(event.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500"
                />
              </div>
            ) : mode === 'zip' ? (
              <div>
                <label htmlFor="docs-zip-file" className="text-sm font-medium text-slate-200">
                  Repository ZIP archive
                </label>
                <input
                  id="docs-zip-file"
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
                <label htmlFor="docs-source-file" className="text-sm font-medium text-slate-200">
                  Source file (single file)
                </label>
                <input
                  id="docs-source-file"
                  type="file"
                  accept=".py,.js,.jsx,.ts,.tsx,.java,.go,.rs,.rb,.php,.cs,.kt,.swift,*.cs,.csproj"
                  onChange={(event) => setSourceFile(event.target.files?.[0] ?? null)}
                  className="mt-3 block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-slate-700"
                />
                {sourceFile ? (
                  <p className="mt-2 text-xs text-slate-400">Selected: {sourceFile.name}</p>
                ) : null}
              </div>
            ) : (
              <div>
                <label htmlFor="docs-openapi-file" className="text-sm font-medium text-slate-200">
                  OpenAPI / Swagger spec (JSON or YAML)
                </label>
                <input
                  id="docs-openapi-file"
                  type="file"
                  accept=".json,.yaml,.yml"
                  onChange={(event) => setOpenApiFile(event.target.files?.[0] ?? null)}
                  className="mt-3 block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-slate-700"
                />
                {openApiFile ? (
                  <p className="mt-2 text-xs text-slate-400">Selected: {openApiFile.name}</p>
                ) : null}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isGenerating}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800"
              >
                {isGenerating ? 'Generating...' : 'Generate Documentation'}
              </button>
              {isGenerating ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                  Analyzing API, this may take a minute...
                </div>
              ) : null}
            </div>
            {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
          </form>

          <DocumentationResultView
            doc={selectedDoc}
            isLoading={isHistoryLoading}
            isGenerating={isGenerating}
          />
        </section>
      </div>
    </div>
  )
}
