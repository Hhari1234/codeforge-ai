import axios from 'axios'

// Production builds use the same-origin relative path /api, which nginx
// routes to the backend (BACKEND_UPSTREAM is configured at container start).
// Local dev has no proxy, so it falls back to the local backend URL. Set
// VITE_API_URL at build time to override (e.g. an absolute backend URL).
const devApiUrl = 'http://localhost:8000/api'
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : devApiUrl),
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
