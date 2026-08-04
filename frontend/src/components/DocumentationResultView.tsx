import { useMemo, useState } from 'react'
import type {
  ApiDocumentationOut,
  Endpoint,
  HttpMethod,
} from '../types/apiDocumentation'

interface DocumentationResultViewProps {
  doc: ApiDocumentationOut | null
  isLoading: boolean
  isGenerating: boolean
}

const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  POST: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  PUT: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  PATCH: 'bg-violet-500/15 text-violet-300 border-violet-500/40',
  DELETE: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  OPTIONS: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
  HEAD: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
}

const ALL_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function buildCurl(endpoint: Endpoint, baseUrl: string): string {
  const method = endpoint.method
  const url = (baseUrl || '') + endpoint.path
  const lines = [`curl -X ${method} '${url}'`]
  for (const p of endpoint.parameters) {
    if (p.location === 'header') {
      lines.push(`  -H '${p.name}: ${p.description || '<value>'}'`)
    }
  }
  if (endpoint.request_body) {
    lines.push(`  -H 'Content-Type: application/json'`)
    lines.push(`  -d '${endpoint.request_body.replace(/'/g, "\\'")}'`)
  }
  return lines.join(' \\\n')
}

function downloadBlob(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function buildMarkdown(doc: ApiDocumentationOut): string {
  const r = doc.result
  const lines: string[] = []
  lines.push(`# API Documentation — ${doc.repo_source}`)
  lines.push('')
  lines.push(`- **Framework:** ${r.framework}`)
  lines.push(`- **Base URL:** ${r.base_url}`)
  lines.push(`- **Authentication:** ${r.authentication.type}${
    r.authentication.description ? ` — ${r.authentication.description}` : ''
  }`)
  lines.push('')
  lines.push('## Overview')
  lines.push(r.api_overview)
  lines.push('')
  lines.push('## Endpoints')
  lines.push('')
  for (const e of r.endpoints) {
    lines.push(`### ${e.method} ${e.path}`)
    if (e.summary) lines.push(`**Summary:** ${e.summary}`)
    if (e.description) lines.push(e.description)
    if (e.parameters.length) {
      lines.push('')
      lines.push('**Parameters:**')
      for (const p of e.parameters) {
        lines.push(`- \`${p.name}\` (${p.location}, ${p.type ?? 'unknown'}, ${p.required ? 'required' : 'optional'}) — ${p.description}`)
      }
    }
    if (e.request_body) {
      lines.push('')
      lines.push(`**Request body:** ${e.request_body}`)
    }
    if (e.example_request) {
      lines.push('')
      lines.push('**Example request:**')
      lines.push('```' + e.example_request.language)
      lines.push(e.example_request.content)
      lines.push('```')
    }
    if (e.example_response) {
      lines.push('')
      lines.push('**Example response:**')
      lines.push('```' + e.example_response.language)
      lines.push(e.example_response.content)
      lines.push('```')
    }
    if (e.errors.length) {
      lines.push('')
      lines.push('**Errors:**')
      for (const err of e.errors) {
        lines.push(`- ${err.status_code}: ${err.description}`)
      }
    }
    lines.push('')
  }
  if (r.status_codes.length) {
    lines.push('## Status Codes')
    for (const s of r.status_codes) lines.push(`- ${s}`)
    lines.push('')
  }
  if (r.error_responses.length) {
    lines.push('## Error Responses')
    for (const s of r.error_responses) lines.push(`- ${s}`)
    lines.push('')
  }
  if (r.recommendations.length) {
    lines.push('## Recommendations')
    for (const s of r.recommendations) lines.push(`- ${s}`)
    lines.push('')
  }
  return lines.join('\n')
}

function buildHtml(doc: ApiDocumentationOut): string {
  const markdown = buildMarkdown(doc)
  const escaped = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>API Documentation — ${doc.repo_source}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 2rem; }
  h1 { color: #f1f5f9; } h2 { color: #34d399; border-bottom: 1px solid #334155; padding-bottom: .3rem; }
  h3 { color: #7dd3fc; } pre { background: #1e293b; padding: 1rem; border-radius: .5rem; overflow-x: auto; white-space: pre-wrap; }
  li { margin: .25rem 0; }
</style>
</head>
<body>
<pre>${escaped}</pre>
</body>
</html>`
}

function exportPdf(doc: ApiDocumentationOut) {
  const html = buildHtml(doc)
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  // Give the browser a moment to render before printing.
  setTimeout(() => win.print(), 300)
}

function EndpointCard({ endpoint, baseUrl }: { endpoint: Endpoint; baseUrl: string }) {
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = async (label: string, text: string) => {
    if (await copyText(text)) {
      setCopied(label)
      setTimeout(() => setCopied(null), 1200)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-lg border px-2 py-0.5 text-xs font-bold ${METHOD_STYLES[endpoint.method] ?? 'bg-slate-500/15 text-slate-300 border-slate-500/40'}`}
          >
            {endpoint.method}
          </span>
          <span className="font-mono text-sm font-semibold text-slate-100">{endpoint.path}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleCopy('endpoint', `${endpoint.method} ${endpoint.path}`)}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-emerald-500/50 hover:text-emerald-300"
          >
            {copied === 'endpoint' ? 'Copied!' : 'Copy Endpoint'}
          </button>
          <button
            type="button"
            onClick={() => handleCopy('curl', buildCurl(endpoint, baseUrl))}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-emerald-500/50 hover:text-emerald-300"
          >
            {copied === 'curl' ? 'Copied!' : 'Copy cURL'}
          </button>
          <button
            type="button"
            onClick={() =>
              handleCopy(
                'json',
                JSON.stringify(
                  {
                    method: endpoint.method,
                    path: endpoint.path,
                    summary: endpoint.summary,
                    parameters: endpoint.parameters,
                    request_body: endpoint.request_body,
                    responses: endpoint.responses,
                    example_request: endpoint.example_request,
                    example_response: endpoint.example_response,
                  },
                  null,
                  2,
                ),
              )
            }
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-emerald-500/50 hover:text-emerald-300"
          >
            {copied === 'json' ? 'Copied!' : 'Copy JSON'}
          </button>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        {endpoint.summary ? (
          <p className="text-sm font-semibold text-slate-100">{endpoint.summary}</p>
        ) : null}
        {endpoint.description ? (
          <p className="text-sm leading-6 text-slate-300">{endpoint.description}</p>
        ) : null}

        {endpoint.parameters.length ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Parameters</p>
            <div className="mt-2 space-y-2">
              {endpoint.parameters.map((p, idx) => (
                <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm">
                  <span className="font-mono text-emerald-300">{p.name}</span>{' '}
                  <span className="text-xs text-slate-500">({p.location}, {p.type ?? 'unknown'})</span>{' '}
                  <span className="text-xs text-slate-400">{p.required ? 'required' : 'optional'}</span>
                  {p.description ? <p className="mt-1 text-xs text-slate-400">{p.description}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {endpoint.request_body ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Request Body</p>
            <p className="mt-1 text-sm text-slate-300">{endpoint.request_body}</p>
          </div>
        ) : null}

        {endpoint.example_request ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Example Request</p>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs leading-5 text-emerald-300">
              {endpoint.example_request.content}
            </pre>
          </div>
        ) : null}

        {endpoint.example_response ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Example Response</p>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs leading-5 text-emerald-300">
              {endpoint.example_response.content}
            </pre>
          </div>
        ) : null}

        {endpoint.errors.length ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Error Codes</p>
            <div className="mt-2 space-y-1">
              {endpoint.errors.map((err, idx) => (
                <div key={idx} className="rounded-lg border border-rose-800/40 bg-rose-500/5 px-3 py-1.5 text-sm">
                  <span className="font-mono text-rose-300">{err.status_code}</span>{' '}
                  <span className="text-slate-300">{err.description}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function DocumentationResultView({
  doc,
  isLoading,
  isGenerating,
}: DocumentationResultViewProps) {
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<HttpMethod | 'All'>('All')

  const filteredEndpoints = useMemo(() => {
    if (!doc) return []
    let endpoints = doc.result.endpoints
    if (methodFilter !== 'All') {
      endpoints = endpoints.filter((e) => e.method === methodFilter)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      endpoints = endpoints.filter(
        (e) =>
          e.path.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    return endpoints
  }, [doc, search, methodFilter])

  if (isGenerating && !doc) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
        Generating API documentation... this may take a minute.
      </div>
    )
  }

  if (isLoading && !doc) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
        Loading documentation detail...
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-8 text-slate-400">
        Paste a GitHub URL, upload a ZIP, upload a single file, or an OpenAPI spec to generate
        professional API documentation.
      </div>
    )
  }

  const { result } = doc

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">API Documentation</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-100">{doc.repo_source}</h2>
          <p className="mt-2 text-xs text-slate-500">
            {new Date(doc.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadBlob(buildMarkdown(doc), 'text/markdown', `api-docs-${doc.id}.md`)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-emerald-500/50 hover:text-emerald-300"
          >
            Markdown
          </button>
          <button
            type="button"
            onClick={() => downloadBlob(buildHtml(doc), 'text/html', `api-docs-${doc.id}.html`)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-emerald-500/50 hover:text-emerald-300"
          >
            HTML
          </button>
          <button
            type="button"
            onClick={() => exportPdf(doc)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-emerald-500/50 hover:text-emerald-300"
          >
            PDF
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Framework</p>
          <p className="mt-1 font-semibold text-emerald-300">{result.framework}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Base URL</p>
          <p className="mt-1 font-mono text-sm text-slate-200">{result.base_url}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Authentication</p>
          <p className="mt-1 text-sm font-semibold text-sky-300">{result.authentication.type}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Endpoints</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">{result.endpoints.length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">API Overview</h3>
        <p className="mt-2 text-sm leading-7 text-slate-300">{result.api_overview}</p>
        {result.authentication.description ? (
          <p className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
            <span className="font-semibold text-sky-300">Auth:</span> {result.authentication.description}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-100">Endpoints</h3>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search endpoints..."
              className="w-56 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500"
            />
            <select
              value={methodFilter}
              onChange={(event) => setMethodFilter(event.target.value as HttpMethod | 'All')}
              className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none ring-0"
            >
              <option value="All">All Methods</option>
              {ALL_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredEndpoints.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No endpoints match your filters.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {filteredEndpoints.map((endpoint, idx) => (
              <EndpointCard key={idx} endpoint={endpoint} baseUrl={result.base_url} />
            ))}
          </div>
        )}
      </div>

      {result.status_codes.length > 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold text-slate-100">Status Codes</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {result.status_codes.map((code, idx) => (
              <span key={idx} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-1 text-sm text-slate-300">
                {code}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {result.error_responses.length > 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold text-slate-100">Error Responses</h3>
          <ul className="mt-3 space-y-2">
            {result.error_responses.map((err, idx) => (
              <li key={idx} className="rounded-lg border border-rose-800/40 bg-rose-500/5 px-3 py-2 text-sm text-slate-300">
                {err}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.recommendations.length > 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold text-slate-100">Recommendations</h3>
          <ul className="mt-3 space-y-2">
            {result.recommendations.map((rec, idx) => (
              <li key={idx} className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
                <span className="mr-2 font-mono text-emerald-400">{idx + 1}.</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
