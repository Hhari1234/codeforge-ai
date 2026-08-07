import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bot, Send, User, FileText } from 'lucide-react'
import { useRepositoryChat } from '../hooks/useRepositoryChat'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState } from '../components/ui/LoadingState'

export default function RepositoryChatPage() {
  const { analysisId } = useParams<{ analysisId: string }>()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const { messages, isSending, isLoadingHistory, error, sendMessage } = useRepositoryChat(
    analysisId ? Number(analysisId) : null,
  )

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isSending])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!input.trim() || isSending) return
    const text = input.trim()
    setInput('')
    await sendMessage(text)
  }

  if (!analysisId) {
    return (
      <div>
        <EmptyState
          title="Invalid analysis ID"
          description="This repository chat link is invalid or no longer exists."
          action={<Button onClick={() => navigate('/repository/analyze')}>Back to Repository Analyzer</Button>}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Repository Chat"
        title="Chat with this repo"
        description="Ask questions about the repository and get AI answers with cited source files."
        actions={
          <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={() => navigate('/repository/analyze')}>
            Back to Repository Analyzer
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div ref={scrollRef} className="h-[calc(100vh-280px)] space-y-6 overflow-y-auto p-6">
          {isLoadingHistory ? (
            <LoadingState title="Loading chat history..." />
          ) : messages.length === 0 ? (
            <EmptyState
              icon={<Bot size={28} />}
              title="Ask about this repository"
              description="Ask a question about the codebase, architecture, or dependencies to get started."
            />
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`flex max-w-[80%] gap-3 ${
                    msg.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
                        : 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white'
                    }`}
                  >
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                      msg.role === 'user'
                        ? 'rounded-tr-sm bg-gradient-to-br from-indigo-500/20 to-purple-500/10 text-indigo-50'
                        : 'rounded-tl-sm bg-white/5 text-slate-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.role === 'assistant' && msg.cited_files.length > 0 ? (
                      <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
                          <FileText size={12} /> Cited files
                        </p>
                        {msg.cited_files.map((file) => (
                          <code
                            key={file}
                            className="flex items-center gap-1.5 truncate rounded-lg bg-slate-950/60 px-2 py-1 text-xs text-emerald-300"
                          >
                            <FileText size={11} className="shrink-0" />
                            {file}
                          </code>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}

          {isSending ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-3 rounded-2xl rounded-tl-sm bg-white/5 px-4 py-3 text-sm text-slate-400">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                  <Bot size={16} />
                </div>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 [animation-delay:300ms]" />
                </span>
                Thinking...
              </div>
            </div>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-white/10 p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about this repository..."
                className="w-full resize-none rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 outline-none transition-all duration-200 placeholder:text-slate-500 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"
                rows={1}
                disabled={isSending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    e.currentTarget.form?.requestSubmit()
                  }
                }}
              />
            </div>
            <Button
              type="submit"
              variant="gradient"
              icon={<Send size={16} />}
              disabled={isSending || !input.trim()}
            >
              Send
            </Button>
          </div>
          {error ? (
            <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
              {error}
            </div>
          ) : null}
        </form>
      </Card>
    </div>
  )
}
