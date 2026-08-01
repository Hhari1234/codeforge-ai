import api from './api'
import type {
  ProjectGenerationListItem,
  ProjectGenerationOut,
} from '../types/projectGeneration'

const projectGenerationService = {
  async generate(idea: string): Promise<ProjectGenerationOut> {
    const { data } = await api.post<ProjectGenerationOut>('/generations/generate', { idea })
    return data
  },

  async list(): Promise<ProjectGenerationListItem[]> {
    const { data } = await api.get<ProjectGenerationListItem[]>('/generations')
    return data
  },

  async getById(id: number): Promise<ProjectGenerationOut> {
    const { data } = await api.get<ProjectGenerationOut>(`/generations/${id}`)
    return data
  },
}

export default projectGenerationService
