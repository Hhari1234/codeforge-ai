import { type FormEvent, useState } from 'react'
import { FileCode2 } from 'lucide-react'
import DocumentationResultView from '../components/DocumentationResultView'
import { useApiDocumentation } from '../hooks/useApiDocumentation'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { HistoryPanel } from '../components/ui/HistoryPanel'
import { Tabs } from '../components/ui/Tabs'
import { FileUpload } from '../components/ui/FileUpload'

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
  const [zipFile, setZipFile] = useState<File[]>([])
  const [sourceFile, setSourceFile] = useState<File[]>([])
  const [openApiFile, setOpenApiFile] = useState<File[]>([])
  const {
    docs,
    selectedDoc,
    isHistoryLoading,
    isGenerating,
    error,
selectDocById,
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
      if (!zipFile[0]) return
      await analyzeZip(zipFile[0])
    } else if (mode === 'file') {
      if (!sourceFile[0]) return
      await analyzeFile(sourceFile[0])
    } else {
      if (!openApiFile[0]) return
      await analyzeOpenApi(openApiFile[0])
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Module 9"
        title="API Documentation Generator"
        description="Point it at a public GitHub URL, upload a ZIP, upload a single source file, or provide an OpenAPI/Swagger spec. The AI detects the framework and produces professional API documentation with endpoints, parameters, examples, and export to Markdown / HTML / PDF."
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <HistoryPanel
          title="History"
          items={docs.map((d) => ({
            id: d.id,
            title: d.repo_source,
            subtitle: new Date(d.created_at).toLocaleDateString(),
          }))}
          selectedId={selectedDoc?.id ?? null}
          onSelect={selectDocById}
          isLoading={isHistoryLoading}
          count={docs.length}
          emptyTitle="No documentation yet"
          emptyDescription="Generate API docs to see your results here."
        />

        <section className="space-y-6">
          <Card glow>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-500 text-white">
                    <FileCode2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">Generate Documentation</h3>
                    <p className="text-xs text-slate-500">Analyze your API and produce professional docs</p>
                  </div>
                </div>

                <Tabs<Mode> items={MODE_TABS} value={mode} onChange={setMode} />

                {mode === 'github' ? (
                  <Input
                    id="docs-repo-url"
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
                      accept=".py,.js,.jsx,.ts,.tsx,.java,.go,.rs,.rb,.php,.cs,.kt,.swift"
                      label="Drag & drop a source file here"
                      hint="Upload a single source file to analyze"
                      onFilesChange={setSourceFile}
                    />
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-200">OpenAPI / Swagger spec (JSON or YAML)</p>
                    <FileUpload
                      accept=".json,.yaml,.yml"
                      label="Drag & drop your OpenAPI spec here"
                      hint="Upload a JSON or YAML OpenAPI spec"
                      onFilesChange={setOpenApiFile}
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="submit"
                    variant="gradient"
                    loading={isGenerating}
                    disabled={
                      mode === 'github'
                        ? !repoUrl.trim()
                        : mode === 'zip'
                          ? !zipFile[0]
                          : mode === 'file'
                            ? !sourceFile[0]
                            : !openApiFile[0]
                    }
                  >
                    {isGenerating ? 'Generating...' : 'Generate Documentation'}
                  </Button>
                  {isGenerating ? (
                    <p className="text-sm text-slate-400">Analyzing API, this may take a minute...</p>
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

          <DocumentationResultView doc={selectedDoc} isLoading={isHistoryLoading} isGenerating={isGenerating} />
        </section>
      </div>
    </div>
  )
}
