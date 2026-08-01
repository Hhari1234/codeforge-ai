import { type FormEvent, useState } from 'react'
import GenerationHistoryList from '../components/GenerationHistoryList'
import GenerationResultView from '../components/GenerationResultView'
import { useProjectGeneration } from '../hooks/useProjectGeneration'

export default function ProjectGeneratorPage() {
  const [idea, setIdea] = useState('')
  const {
    generations,
    selectedGeneration,
    isHistoryLoading,
    isGenerating,
    error,
    selectGenerationById,
    generateGeneration,
  } = useProjectGeneration()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = idea.trim()
    if (!trimmed) {
      return
    }

    await generateGeneration(trimmed)
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-3">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Module 1</p>
        <h1 className="text-3xl font-semibold text-slate-100">Project Generator</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Describe an app idea and receive a complete technical spec, including requirements, features, API surface, DB schema, and a README.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">History</h2>
            <span className="text-sm text-slate-500">{generations.length} saved</span>
          </div>
          <GenerationHistoryList
            generations={generations}
            selectedId={selectedGeneration?.id ?? null}
            onSelect={selectGenerationById}
            isLoading={isHistoryLoading}
          />
        </aside>

        <section className="space-y-6">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <label htmlFor="idea" className="text-sm font-medium text-slate-200">
              Project idea
            </label>
            <textarea
              id="idea"
              rows={5}
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              placeholder="A collaborative planning app for remote teams..."
              className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500"
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isGenerating}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800"
              >
                {isGenerating ? 'Generating...' : 'Generate spec'}
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

          <GenerationResultView generation={selectedGeneration} isLoading={isHistoryLoading} isGenerating={isGenerating} />
        </section>
      </div>
    </div>
  )
}
