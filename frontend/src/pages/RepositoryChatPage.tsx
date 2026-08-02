import { useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRepositoryChat } from '../hooks/useRepositoryChat'

export default function RepositoryChatPage() {
  const { analysisId } = useParams<{ analysisId: string }>()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const { messages, isSending, isLoadingHistory, error, sendMessage } = useRepositoryChat(
    analysisId ? Number(analysisId) : null,
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!input.trim() || isSending) return
    const text = input.trim()
    setInput('')
    await sendMessage(text)
  }

  if (!analysisId) {
    return (
      <div className="mx-auto max-w-7xl">
        <p className="text-sm text-slate-400">Invalid analysis ID.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Repository Chat</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-100">Chat with this repo</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('/repository/analyze')}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-emerald-500/50 hover:text-emerald-300"
        >
          Back to Repository Analyzer
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="h-[calc(100vh-280px)] overflow-y-auto p-6 space-y-6">
          {isLoadingHistory ? (
            <p className="text-sm text-slate-400">Loading chat history...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-slate-400">
              Ask a question about this repository to get started.
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    msg.role === 'user'
                      ? 'bg-emerald-500/20 text-emerald-100'
                      : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === 'assistant' && msg.cited_files.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs uppercase tracking-widest text-slate-400">Cited files</p>
                      {msg.cited_files.map((file) => (
                        <code key={file} className="block rounded-lg bg-slate-950/70 px-2 py-1 text-xs text-emerald-300">
                          {file}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-slate-800 px-4 py-3 text-sm text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                  Thinking...
                </span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-slate-800 p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about this repository..."
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800"
            >
              Send
            </button>
          </div>
          {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}
        </form>
      </div>
    </div>
  )
}
