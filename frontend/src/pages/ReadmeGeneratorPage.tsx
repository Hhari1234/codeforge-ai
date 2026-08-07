import { type FormEvent, useState } from 'react'
import { FileText } from 'lucide-react'
import ReadmeResultView from '../components/ReadmeResultView'
import { useReadmeGeneration } from '../hooks/useReadmeGeneration'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'
import { Textarea } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { HistoryPanel } from '../components/ui/HistoryPanel'
import { FileUpload } from '../components/ui/FileUpload'

const ACCEPTED_EXTENSIONS = '.zip, .py, .js, .jsx, .ts, .tsx, .json, .md, .txt, .toml, .yaml, .yml, .html, .css, .sh, .sql, .xml, .java, .go, .rs, .rb, .php, .vue'

export default function ReadmeGeneratorPage() {
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const {
    generations,
    selectedGeneration,
    isHistoryLoading,
    isGenerating,
    error,
    selectGenerationById,
    generateGeneration,
  } = useReadmeGeneration()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!description.trim() && files.length === 0) {
      return
    }
    await generateGeneration(description, files)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Module 2"
        title="README Generator"
        description="Upload a project ZIP (or individual files) and/or paste a description or file tree. The AI produces a complete README with installation, usage, folder explanation, tech stack, and features."
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <HistoryPanel
          title="History"
          items={generations.map((g) => ({
            id: g.id,
            title: g.title,
            subtitle: g.input_summary,
          }))}
          selectedId={selectedGeneration?.id ?? null}
          onSelect={selectGenerationById}
          isLoading={isHistoryLoading}
          count={generations.length}
          emptyTitle="No READMEs yet"
          emptyDescription="Generate a README to see your saved results here."
        />

        <section className="space-y-6">
          <Card glow>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">Project Details</h3>
                    <p className="text-xs text-slate-500">Describe your project or upload files</p>
                  </div>
                </div>

                <Textarea
                  id="description"
                  rows={6}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Paste a project description or a file tree, e.g.:&#10;&#10;backend/app/main.py&#10;backend/app/services/auth_service.py&#10;frontend/src/pages/LoginPage.tsx&#10;&#10;A FastAPI + React app with JWT auth..."
                />

                <div>
                  <p className="mb-2 text-sm font-medium text-slate-200">Upload project files or ZIP</p>
                  <FileUpload
                    accept={ACCEPTED_EXTENSIONS}
                    multiple
                    onFilesChange={setFiles}
                    label="Drag & drop project files here"
                    hint="Max 2MB per file, 10MB total. Binary files are ignored."
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="submit"
                    variant="gradient"
                    loading={isGenerating}
                    disabled={!description.trim() && files.length === 0}
                  >
                    {isGenerating ? 'Generating README...' : 'Generate README'}
                  </Button>
                  {isGenerating ? (
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

          <ReadmeResultView generation={selectedGeneration} isLoading={isHistoryLoading} isGenerating={isGenerating} />
        </section>
      </div>
    </div>
  )
}
