import axios, { AxiosError } from 'axios'

// Production builds use the same-origin relative path /api, which nginx
// routes to the backend (BACKEND_UPSTREAM is configured at container start).
// Local dev has no proxy, so it falls back to the local backend URL. Set
// VITE_API_URL at build time to override (e.g. an absolute backend URL).
const devApiUrl = 'http://localhost:8000/api'

// AI endpoints can legitimately take minutes (large repo analyses, retries).
// Without a timeout a hung backend request left spinners running forever and
// buttons permanently disabled, so every request gets a hard upper bound.
export const REQUEST_TIMEOUT_MS = 300_000

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : devApiUrl),
  timeout: REQUEST_TIMEOUT_MS,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * Extract an actionable, user-facing message from any thrown error.
 *
 * Priority: backend `detail` (FastAPI validation/auth/provider messages) →
 * request timeout → network failure → axios status message → fallback.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail?: unknown }>

    const detail = axiosError.response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) {
      return detail
    }
    // FastAPI validation errors arrive as an array of {msg, loc, ...}.
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0]
      if (first && typeof first === 'object' && 'msg' in first) {
        return String((first as { msg: unknown }).msg)
      }
    }

    if (axiosError.code === 'ECONNABORTED' || /timeout/i.test(axiosError.message)) {
      return 'The request timed out. The server may be busy — please try again.'
    }
    if (!axiosError.response) {
      return 'Could not reach the server. Check your connection and that the backend is running, then try again.'
    }

    const status = axiosError.response.status
    if (status === 401) return 'Your session has expired. Please sign in again.'
    if (status === 413) return 'The upload is too large for the server to accept.'
    if (status >= 500) return 'The server hit an unexpected error. Please try again shortly.'
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

export default api
