import { useCallback, useEffect, useRef, useState } from 'react'
import repositoryChatService from '../services/repositoryChatService'
import type { ChatHistoryItem } from '../types/repositoryChat'

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/refs */
export function useRepositoryChat(analysisId: number | null) {
  const [messages, setMessages] = useState<ChatHistoryItem[]>([])
  const [isSending, setIsSending] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    if (!analysisId) return
    setIsLoadingHistory(true)
    setError(null)

    try {
      const history = await repositoryChatService.getHistory(analysisId)
      setMessages(history)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load chat history.')
    } finally {
      setIsLoadingHistory(false)
    }
  }, [analysisId])

  const loadHistoryRef = useRef(loadHistory)
  loadHistoryRef.current = loadHistory

  useEffect(() => {
    if (analysisId) {
      loadHistoryRef.current()
    } else {
      setMessages([])
    }
  }, [analysisId])

  const sendMessage = useCallback(async (message: string) => {
    if (!analysisId) return
    setIsSending(true)
    setError(null)

    const userMessage: ChatHistoryItem = {
      id: Date.now(),
      role: 'user',
      content: message,
      cited_files: [],
      created_at: new Date().toISOString(),
    }
    setMessages((current) => [...current, userMessage])

    try {
      const response = await repositoryChatService.sendMessage(analysisId, { message })
      const assistantMessage: ChatHistoryItem = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.answer,
        cited_files: response.cited_files,
        created_at: new Date().toISOString(),
      }
      setMessages((current) => [...current, assistantMessage])
    } catch (err) {
      setMessages((current) => current.slice(0, -1))
      setError(err instanceof Error ? err.message : 'Unable to send message.')
    } finally {
      setIsSending(false)
    }
  }, [analysisId])

  return {
    messages,
    isSending,
    isLoadingHistory,
    error,
    sendMessage,
    loadHistory,
  }
}
/* eslint-enable react-hooks/set-state-in-effect, react-hooks/refs */
