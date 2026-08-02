import api from './api'
import type { ChatHistoryItem, ChatMessageRequest, ChatMessageResponse } from '../types/repositoryChat'

const repositoryChatService = {
  async sendMessage(analysisId: number, payload: ChatMessageRequest): Promise<ChatMessageResponse> {
    const { data } = await api.post<ChatMessageResponse>(`/repositories/${analysisId}/chat`, payload)
    return data
  },

  async getHistory(analysisId: number): Promise<ChatHistoryItem[]> {
    const { data } = await api.get<ChatHistoryItem[]>(`/repositories/${analysisId}/chat/history`)
    return data
  },
}

export default repositoryChatService
