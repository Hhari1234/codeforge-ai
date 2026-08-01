import { useEffect, useState } from 'react'
import api from './services/api'

function App() {
  const [status, setStatus] = useState<string>('checking...')

  useEffect(() => {
    api
      .get('/health')
      .then((res) => setStatus(res.data.status))
      .catch(() => setStatus('backend unreachable'))
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="text-center rounded-2xl border border-slate-800 bg-slate-900/80 px-8 py-10 shadow-2xl">
        <h1 className="text-3xl font-semibold">CodeForge AI</h1>
        <p className="mt-3 text-slate-400">
          Backend status: <span className={status === 'ok' ? 'text-emerald-400' : 'text-rose-400'}>{status}</span>
        </p>
      </div>
    </div>
  )
}

export default App
