import { type FormEvent, useState } from 'react'
import ReadmeHistoryList from '../components/ReadmeHistoryList'
import ReadmeResultView from '../components/ReadmeResultView'
import { useReadmeGeneration } from '../hooks/useReadmeGeneration'

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
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-3">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Module 2</p>
        <h1 className="text-3xl font-semibold text-slate-100">README Generator</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Upload a project ZIP (or individual files) and/or paste a description or file tree. The AI
          produces a complete README with installation, usage, folder explanation, tech stack, and features.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">History</h2>
            <span className="text-sm text-slate-500">{generations.length} saved</span>
          </div>
          <ReadmeHistoryList
            generations={generations}
            selectedId={selectedGeneration?.id ?? null}
            onSelect={selectGenerationById}
            isLoading={isHistoryLoading}
          />
        </aside>

        <section className="space-y-6">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="space-y-5">
              <div>
                <label htmlFor="description" className="text-sm font-medium text-slate-200">
                  Project description / file tree
                </label>
                <textarea
                  id="description"
                  rows={6}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Paste a project description or a file tree, e.g.:&#10;&#10;backend/app/main.py&#10;backend/app/services/auth_service.py&#10;frontend/src/pages/LoginPage.tsx&#10;&#10;A FastAPI + React app with JWT auth..."
                  className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500"
                />
              </div>

              <div>
                <label htmlFor="files" className="text-sm font-medium text-slate-200">
                  Upload project files or ZIP
                </label>
                <input
                  id="files"
                  type="file"
                  multiple
                  accept={ACCEPTED_EXTENSIONS}
                  onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                  className="mt-3 block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-slate-700"
                />
                {files.length > 0 ? (
                  <p className="mt-2 text-xs text-slate-400">
                    {files.length} file(s) selected: {files.map((f) => f.name).join(', ')}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">
                  Max 2MB per file, 10MB total. Binary files are ignored; only text is sent to the AI.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isGenerating}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800"
              >
                {isGenerating ? 'Generating...' : 'Generate README'}
              </button>
              {isGenerating ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                  This can take 10–30 seconds.
                </div>
              ) : null}
            </div>
            {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
          </form>

          <ReadmeResultView
            generation={selectedGeneration}
            isLoading={isHistoryLoading}
            isGenerating={isGenerating}
          />
        </section>
      </div>
    </div>
  )
}

