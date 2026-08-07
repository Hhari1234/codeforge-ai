import { type FormEvent, useState } from 'react'
import { Zap } from 'lucide-react'
import GenerationResultView from '../components/GenerationResultView'
import { useProjectGeneration } from '../hooks/useProjectGeneration'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'
import { Textarea } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { HistoryPanel } from '../components/ui/HistoryPanel'

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
    <div>
      <PageHeader
        eyebrow="Module 1"
        title="Project Generator"
        description="Describe an app idea and receive a complete technical spec, including requirements, features, API surface, DB schema, and a README."
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <HistoryPanel
          title="History"
          items={generations.map((g) => ({
            id: g.id,
            title: g.project_name,
            subtitle: g.idea,
          }))}
          selectedId={selectedGeneration?.id ?? null}
          onSelect={selectGenerationById}
          isLoading={isHistoryLoading}
          count={generations.length}
          emptyTitle="No generations yet"
          emptyDescription="Submit a project idea to see your generated specs here."
        />

        <section className="space-y-6">
          <Card glow>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">Project Idea</h3>
                    <p className="text-xs text-slate-500">Describe what you want to build</p>
                  </div>
                </div>

                <Textarea
                  id="idea"
                  rows={5}
                  value={idea}
                  onChange={(event) => setIdea(event.target.value)}
                  placeholder="A collaborative planning app for remote teams..."
                  hint="Be specific about features, target users, and tech preferences."
                />

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="submit"
                    variant="gradient"
                    loading={isGenerating}
                    disabled={!idea.trim()}
                  >
                    {isGenerating ? 'Generating spec...' : 'Generate spec'}
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

          <GenerationResultView generation={selectedGeneration} isLoading={isHistoryLoading} isGenerating={isGenerating} />
        </section>
      </div>
    </div>
  )
}
