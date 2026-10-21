import { useCallback, useEffect, useRef, useState } from 'react'
import { getApiErrorMessage } from '../services/api'
import repositoryChatService from '../services/repositoryChatService'
import type { ChatHistoryItem } from '../types/repositoryChat'

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/refs */
export function useRepositoryChat(analysisId: number | null) {
  const [messages, setMessages] = useState<ChatHistoryItem[]>([])
  const [isSending, setIsSending] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guards against cross-conversation races:
  // - historySeq: a history response for a previously selected analysis must
  //   never clobber the newly selected analysis's history.
  // - sendSeq: a reply that lands after the user switched analyses (or after
  //   a newer send started) is dropped instead of appended to the wrong chat.
  // - sendInFlight: concurrent sends are ignored rather than interleaved.
  const historySeqRef = useRef(0)
  const sendSeqRef = useRef(0)
  const sendInFlightRef = useRef(false)

  const loadHistory = useCallback(async () => {
    if (!analysisId) return
    const seq = ++historySeqRef.current
    setIsLoadingHistory(true)
    setError(null)

    try {
      const history = await repositoryChatService.getHistory(analysisId)
      if (seq !== historySeqRef.current) return // stale history, newer load won
      setMessages(history)
    } catch (err) {
      if (seq !== historySeqRef.current) return
      setError(getApiErrorMessage(err, 'Unable to load chat history.'))
    } finally {
      if (seq === historySeqRef.current) setIsLoadingHistory(false)
    }
  }, [analysisId])

  const loadHistoryRef = useRef(loadHistory)
  loadHistoryRef.current = loadHistory

  useEffect(() => {
    // Invalidate any in-flight history load or reply from a previous analysis.
    historySeqRef.current += 1
    sendSeqRef.current += 1

    if (analysisId) {
      loadHistoryRef.current()
    } else {
      setMessages([])
    }
  }, [analysisId])

  /**
   * Send a message. Returns true on success, false on failure — callers can
   * restore the user's draft text when the send fails.
   */
  const sendMessage = useCallback(
    async (message: string): Promise<boolean> => {
      if (!analysisId || sendInFlightRef.current) return false
      sendInFlightRef.current = true
      const sendId = ++sendSeqRef.current
      const targetAnalysisId = analysisId
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
        const response = await repositoryChatService.sendMessage(targetAnalysisId, {
          message,
        })
        // The user navigated to another repository while awaiting the reply —
        // the analysis-switch effect bumped sendSeqRef, so drop this reply
        // rather than pollute the other conversation.
        if (sendId !== sendSeqRef.current) {
          return false
        }
        const assistantMessage: ChatHistoryItem = {
          id: Date.now() + 1,
          role: 'assistant',
          content: response.answer,
          cited_files: response.cited_files,
          created_at: new Date().toISOString(),
        }
        setMessages((current) => [...current, assistantMessage])
        return true
      } catch (err) {
        if (sendId === sendSeqRef.current) {
          // Remove the optimistic user bubble and surface the failure.
          setMessages((current) => current.slice(0, -1))
          setError(getApiErrorMessage(err, 'Unable to send message.'))
        }
        return false
      } finally {
        sendInFlightRef.current = false
        if (sendId === sendSeqRef.current) setIsSending(false)
      }
    },
    [analysisId],
  )

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
