import { useCallback, useEffect, useRef, useState } from 'react'
import { getApiErrorMessage } from '../services/api'
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

  // One in-flight explanation at a time; sequence counter for stale selections.
  const submitInFlightRef = useRef(false)
  const selectSeqRef = useRef(0)

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
      setError(getApiErrorMessage(err, 'Unable to load explanation history right now.'))
    } finally {
      setIsHistoryLoading(false)
    }
  }, [sortExplanations])

  const selectExplanationById = useCallback(async (id: number) => {
    const seq = ++selectSeqRef.current
    setIsHistoryLoading(true)
    setError(null)

    try {
      const explanation = await codeExplanationService.getById(id)
      if (seq !== selectSeqRef.current) return // stale response, a newer selection won
      setSelectedExplanation(explanation)
    } catch (err) {
      if (seq !== selectSeqRef.current) return
      setError(getApiErrorMessage(err, 'Unable to load that explanation right now.'))
    } finally {
      if (seq === selectSeqRef.current) setIsHistoryLoading(false)
    }
  }, [])

  const explainCode = useCallback(
    async (payload: {
      filename: string
      language: string
      source_code: string
    }) => {
      if (submitInFlightRef.current) return // ignore duplicate submissions
      submitInFlightRef.current = true
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
        // The pasted source stays in the editor on failure, so retry is safe.
        setError(getApiErrorMessage(err, 'Unable to explain this code right now.'))
      } finally {
        submitInFlightRef.current = false
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
        setError(getApiErrorMessage(err, 'Unable to load explanation history right now.'))
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

