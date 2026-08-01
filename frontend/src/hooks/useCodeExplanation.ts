import { useCallback, useEffect, useState } from 'react'
import codeExplanationService from '../services/codeExplanationService'
import type {
  CodeExplanationListItem,
  CodeExplanationOut,
} from '../types/codeExplanation'

export function useCodeExplanation() {
  const [explanations, setExplanations] = useState<CodeExplanationListItem[]>([])
  const [selectedExplanation, setSelectedExplanation] = useState<CodeExplanationOut | null>(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isExplaining, setIsExplaining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sortExplanations = useCallback((items: CodeExplanationListItem[]) => {
    return [...items].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  }, [])

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true)
    setError(null)

    try {
      const items = await codeExplanationService.list()
      setExplanations(sortExplanations(items))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load explanation history right now.')
    } finally {
      setIsHistoryLoading(false)
    }
  }, [sortExplanations])

  const selectExplanationById = useCallback(async (id: number) => {
    setIsHistoryLoading(true)
    setError(null)

    try {
      const explanation = await codeExplanationService.getById(id)
      setSelectedExplanation(explanation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load that explanation right now.')
    } finally {
      setIsHistoryLoading(false)
    }
  }, [])

  const explainCode = useCallback(
    async (payload: {
      filename: string
      language: string
      source_code: string
    }) => {
      setIsExplaining(true)
      setError(null)

      try {
        const explanation = await codeExplanationService.explain(payload)
        setSelectedExplanation(explanation)
        setExplanations((current) => {
          const next = [
            {
              id: explanation.id,
              filename: explanation.filename,
              language: explanation.language,
              created_at: explanation.created_at,
            },
            ...current,
          ]
          return sortExplanations(next)
        })
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to explain this code right now.'
        // Show backend `detail` when available.
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        setError(detail || message)
      } finally {
        setIsExplaining(false)
      }
    },
    [sortExplanations],
  )

  useEffect(() => {
    let isMounted = true

    const runHistoryLoad = async () => {
      setIsHistoryLoading(true)
      setError(null)

      try {
        const items = await codeExplanationService.list()
        if (!isMounted) return
        setExplanations(sortExplanations(items))
      } catch (err) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Unable to load explanation history right now.')
      } finally {
        if (isMounted) {
          setIsHistoryLoading(false)
        }
      }
    }

    void runHistoryLoad()

    return () => {
      isMounted = false
    }
  }, [sortExplanations])

  return {
    explanations,
    selectedExplanation,
    isHistoryLoading,
    isExplaining,
    error,
    loadHistory,
    selectExplanationById,
    explainCode,
  }
}

