import api from './api'
import type {
  RepositoryAnalysisListItem,
  RepositoryAnalysisOut,
  RepositoryAnalysisRequest,
} from '../types/repositoryAnalysis'

const repositoryAnalysisService = {
  async analyzeZip(file: File): Promise<RepositoryAnalysisOut> {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<RepositoryAnalysisOut>(
      '/repositories/analyze-zip',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    )
    return data
  },

  async analyzeGithub(payload: RepositoryAnalysisRequest): Promise<RepositoryAnalysisOut> {
    const { data } = await api.post<RepositoryAnalysisOut>(
      '/repositories/analyze-github',
      payload,
    )
    return data
  },

  async list(): Promise<RepositoryAnalysisListItem[]> {
    const { data } = await api.get<RepositoryAnalysisListItem[]>('/repositories')
    return data
  },

  async getById(id: number): Promise<RepositoryAnalysisOut> {
    const { data } = await api.get<RepositoryAnalysisOut>(`/repositories/${id}`)
    return data
  },
}

export default repositoryAnalysisService

