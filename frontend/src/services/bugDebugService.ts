import api from './api'
import type {
  BugDebugCodeRequest,
  BugDebugListItem,
  BugDebugOut,
  BugDebugRequest,
} from '../types/bugDebug'

const bugDebugService = {
  async analyzeZip(file: File): Promise<BugDebugOut> {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<BugDebugOut>('/debug/analyze-zip', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async analyzeGithub(payload: BugDebugRequest): Promise<BugDebugOut> {
    const { data } = await api.post<BugDebugOut>('/debug/analyze-github', payload)
    return data
  },

  async analyzeFile(file: File): Promise<BugDebugOut> {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<BugDebugOut>('/debug/analyze-file', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async analyzeCode(payload: BugDebugCodeRequest): Promise<BugDebugOut> {
    const { data } = await api.post<BugDebugOut>('/debug/analyze-code', payload)
    return data
  },

  async list(): Promise<BugDebugListItem[]> {
    const { data } = await api.get<BugDebugListItem[]>('/debug')
    return data
  },

  async getById(id: number): Promise<BugDebugOut> {
    const { data } = await api.get<BugDebugOut>(`/debug/${id}`)
    return data
  },

  async deleteById(id: number): Promise<void> {
    await api.delete(`/debug/${id}`)
  },
}

export default bugDebugService
