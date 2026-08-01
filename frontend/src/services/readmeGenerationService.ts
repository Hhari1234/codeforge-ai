import api from './api'
import type {
  ReadmeGenerationListItem,
  ReadmeGenerationOut,
} from '../types/readmeGeneration'

const readmeGenerationService = {
  async generate(
    description: string,
    files: File[],
  ): Promise<ReadmeGenerationOut> {
    const form = new FormData()
    if (description.trim()) {
      form.append('description', description.trim())
    }
    for (const file of files) {
      form.append('files', file)
    }
    const { data } = await api.post<ReadmeGenerationOut>(
      '/readmes/generate',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    )
    return data
  },

  async list(): Promise<ReadmeGenerationListItem[]> {
    const { data } = await api.get<ReadmeGenerationListItem[]>('/readmes')
    return data
  },

  async getById(id: number): Promise<ReadmeGenerationOut> {
    const { data } = await api.get<ReadmeGenerationOut>(`/readmes/${id}`)
    return data
  },
}

export default readmeGenerationService

