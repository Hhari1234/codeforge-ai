import { type FormEvent, useState } from 'react'
import { Code2 } from 'lucide-react'
import CodeReviewResultView from '../components/CodeReviewResultView'
import { useCodeReview } from '../hooks/useCodeReview'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { HistoryPanel } from '../components/ui/HistoryPanel'
import { Tabs } from '../components/ui/Tabs'
import { FileUpload } from '../components/ui/FileUpload'

type Mode = 'github' | 'zip'

export default function CodeReviewPage() {
  const [mode, setMode] = useState<Mode>('github')
  const [repoUrl, setRepoUrl] = useState('')
  const [zipFile, setZipFile] = useState<File[]>([])
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
      if (!zipFile[0]) return
      await analyzeZip(zipFile[0])
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Module 7"
        title="Code Reviewer"
        description="Point it at a public GitHub URL or upload a ZIP. The AI reviews the file tree and key source files to produce an overall quality score, prioritized findings by file, strengths, and actionable recommendations."
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <HistoryPanel
          title="History"
          items={reviews.map((r) => ({
            id: r.id,
            title: r.repo_source,
            subtitle: new Date(r.created_at).toLocaleDateString(),
          }))}
          selectedId={selectedReview?.id ?? null}
          onSelect={selectReviewById}
          isLoading={isHistoryLoading}
          count={reviews.length}
          emptyTitle="No reviews yet"
          emptyDescription="Review a repository to see your results here."
        />

        <section className="space-y-6">
          <Card glow>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                    <Code2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">Review Repository</h3>
                    <p className="text-xs text-slate-500">Analyze code quality and get prioritized findings</p>
                  </div>
                </div>

                <Tabs<Mode>
                  items={[
                    { value: 'github', label: 'GitHub URL' },
                    { value: 'zip', label: 'Upload ZIP' },
                  ]}
                  value={mode}
                  onChange={setMode}
                />

                {mode === 'github' ? (
                  <Input
                    id="review-repo-url"
                    label="Public GitHub repository URL"
                    type="text"
                    value={repoUrl}
                    onChange={(event) => setRepoUrl(event.target.value)}
                    placeholder="https://github.com/owner/repo"
                  />
                ) : (
                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-200">Repository ZIP archive</p>
                    <FileUpload
                      accept=".zip"
                      label="Drag & drop your repository ZIP here"
                      hint="Upload a ZIP archive of your repository"
                      onFilesChange={setZipFile}
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="submit"
                    variant="gradient"
                    loading={isReviewing}
                    disabled={mode === 'github' ? !repoUrl.trim() : !zipFile[0]}
                  >
                    {isReviewing ? 'Reviewing...' : 'Review Repository'}
                  </Button>
                  {isReviewing ? (
                    <p className="text-sm text-slate-400">Reviewing repository, this may take a minute...</p>
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

          <CodeReviewResultView review={selectedReview} isLoading={isHistoryLoading} isReviewing={isReviewing} />
        </section>
      </div>
    </div>
  )
}
