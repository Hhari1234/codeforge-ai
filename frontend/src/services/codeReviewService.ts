import api from './api'
import type {
  CodeReviewListItem,
  CodeReviewOut,
  CodeReviewRequest,
} from '../types/codeReview'

const codeReviewService = {
  async analyzeZip(file: File): Promise<CodeReviewOut> {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<CodeReviewOut>(
      '/reviews/analyze-zip',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    )
    return data
  },

  async analyzeGithub(payload: CodeReviewRequest): Promise<CodeReviewOut> {
    const { data } = await api.post<CodeReviewOut>(
      '/reviews/analyze-github',
      payload,
    )
    return data
  },

  async list(): Promise<CodeReviewListItem[]> {
    const { data } = await api.get<CodeReviewListItem[]>('/reviews')
    return data
  },

  async getById(id: number): Promise<CodeReviewOut> {
    const { data } = await api.get<CodeReviewOut>(`/reviews/${id}`)
    return data
  },
}

export default codeReviewService
