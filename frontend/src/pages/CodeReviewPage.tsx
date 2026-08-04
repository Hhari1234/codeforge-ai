import { type FormEvent, useState } from 'react'
import CodeReviewHistoryList from '../components/CodeReviewHistoryList'
import CodeReviewResultView from '../components/CodeReviewResultView'
import { useCodeReview } from '../hooks/useCodeReview'

type Mode = 'zip' | 'github'

export default function CodeReviewPage() {
  const [mode, setMode] = useState<Mode>('github')
  const [repoUrl, setRepoUrl] = useState('')
  const [zipFile, setZipFile] = useState<File | null>(null)
  const {
    reviews,
    selectedReview,
    isHistoryLoading,
    isReviewing,
    error,
    selectReviewById,
    analyzeZip,
    analyzeGithub,
  } = useCodeReview()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (mode === 'github') {
      if (!repoUrl.trim()) return
      await analyzeGithub(repoUrl.trim())
    } else {
      if (!zipFile) return
      await analyzeZip(zipFile)
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-3">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Module 7</p>
        <h1 className="text-3xl font-semibold text-slate-100">Code Reviewer</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Point it at a public GitHub URL or upload a ZIP. The AI reviews the file tree and key
          source files to produce an overall quality score, prioritized findings by file, strengths,
          and actionable recommendations.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">History</h2>
            <span className="text-sm text-slate-500">{reviews.length} saved</span>
          </div>
          <CodeReviewHistoryList
            reviews={reviews}
            selectedId={selectedReview?.id ?? null}
            onSelect={selectReviewById}
            isLoading={isHistoryLoading}
          />
        </aside>

        <section className="space-y-6">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
              <button
                type="button"
                onClick={() => setMode('github')}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition ${
                  mode === 'github'
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                GitHub URL
              </button>
              <button
                type="button"
                onClick={() => setMode('zip')}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition ${
                  mode === 'zip'
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Upload ZIP
              </button>
            </div>

            {mode === 'github' ? (
              <div>
                <label htmlFor="review-repo-url" className="text-sm font-medium text-slate-200">
                  Public GitHub repository URL
                </label>
                <input
                  id="review-repo-url"
                  type="text"
                  value={repoUrl}
                  onChange={(event) => setRepoUrl(event.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="review-zip-file" className="text-sm font-medium text-slate-200">
                  Repository ZIP archive
                </label>
                <input
                  id="review-zip-file"
                  type="file"
                  accept=".zip"
                  onChange={(event) => setZipFile(event.target.files?.[0] ?? null)}
                  className="mt-3 block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-slate-700"
                />
                {zipFile ? (
                  <p className="mt-2 text-xs text-slate-400">Selected: {zipFile.name}</p>
                ) : null}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isReviewing}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800"
              >
                {isReviewing ? 'Reviewing...' : 'Review Repository'}
              </button>
              {isReviewing ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                  Reviewing repository, this may take a minute...
                </div>
              ) : null}
            </div>
            {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}
          </form>

          <CodeReviewResultView
            review={selectedReview}
            isLoading={isHistoryLoading}
            isReviewing={isReviewing}
          />
        </section>
      </div>
    </div>
  )
}
