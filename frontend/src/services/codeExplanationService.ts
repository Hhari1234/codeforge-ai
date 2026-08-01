import api from './api'
import type {
  CodeExplanationListItem,
  CodeExplanationOut,
  CodeExplanationRequest,
} from '../types/codeExplanation'

const codeExplanationService = {
  async explain(payload: CodeExplanationRequest): Promise<CodeExplanationOut> {
    const { data } = await api.post<CodeExplanationOut>('/explain', payload)
    return data
  },

  async list(): Promise<CodeExplanationListItem[]> {
    const { data } = await api.get<CodeExplanationListItem[]>('/explain')
    return data
  },

  async getById(id: number): Promise<CodeExplanationOut> {
    const { data } = await api.get<CodeExplanationOut>(`/explain/${id}`)
    return data
  },
}

export default codeExplanationService

