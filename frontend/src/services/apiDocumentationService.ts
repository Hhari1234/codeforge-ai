import api from './api'
import type {
  ApiDocumentationListItem,
  ApiDocumentationOut,
  DocumentationRequest,
  DocumentationSourceRequest,
} from '../types/apiDocumentation'

const apiDocumentationService = {
  async analyzeZip(file: File): Promise<ApiDocumentationOut> {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<ApiDocumentationOut>('/documentation/analyze-zip', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async analyzeGithub(payload: DocumentationRequest): Promise<ApiDocumentationOut> {
    const { data } = await api.post<ApiDocumentationOut>('/documentation/analyze-github', payload)
    return data
  },

  async analyzeFile(file: File): Promise<ApiDocumentationOut> {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<ApiDocumentationOut>('/documentation/analyze-file', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async analyzeSource(payload: DocumentationSourceRequest): Promise<ApiDocumentationOut> {
    const { data } = await api.post<ApiDocumentationOut>('/documentation/analyze-source', payload)
    return data
  },

  async analyzeOpenApi(file: File): Promise<ApiDocumentationOut> {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<ApiDocumentationOut>('/documentation/analyze-openapi', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async list(): Promise<ApiDocumentationListItem[]> {
    const { data } = await api.get<ApiDocumentationListItem[]>('/documentation')
    return data
  },

  async getById(id: number): Promise<ApiDocumentationOut> {
    const { data } = await api.get<ApiDocumentationOut>(`/documentation/${id}`)
    return data
  },

  async deleteById(id: number): Promise<void> {
    await api.delete(`/documentation/${id}`)
  },
}

export default apiDocumentationService
