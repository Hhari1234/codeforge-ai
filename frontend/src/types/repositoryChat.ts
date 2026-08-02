export interface ChatMessageRequest {
  message: string
}

export interface ChatMessageResponse {
  answer: string
  cited_files: string[]
}

export interface ChatHistoryItem {
  id: number
  role: 'user' | 'assistant'
  content: string
  cited_files: string[]
  created_at: string
}
