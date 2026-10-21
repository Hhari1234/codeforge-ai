import { useCallback, useEffect, useRef, useState } from 'react'
import { getApiErrorMessage } from '../services/api'
import projectGenerationService from '../services/projectGenerationService'
import type {
  ProjectGenerationListItem,
  ProjectGenerationOut,
} from '../types/projectGeneration'

export function useProjectGeneration() {
  const [generations, setGenerations] = useState<ProjectGenerationListItem[]>([])
  const [selectedGeneration, setSelectedGeneration] = useState<ProjectGenerationOut | null>(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // One in-flight submit at a time (prevents duplicate generation requests);
  // sequence counter so a slower stale response never overwrites a newer one.
  const submitInFlightRef = useRef(false)
  const selectSeqRef = useRef(0)

  const sortGenerations = useCallback((items: ProjectGenerationListItem[]) => {
    return [...items].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  }, [])

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true)
    setError(null)

    try {
      const items = await projectGenerationService.list()
      setGenerations(sortGenerations(items))
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load generation history right now.'))
    } finally {
      setIsHistoryLoading(false)
    }
  }, [sortGenerations])

  const selectGenerationById = useCallback(async (id: number) => {
    const seq = ++selectSeqRef.current
    setIsHistoryLoading(true)
    setError(null)

    try {
      const generation = await projectGenerationService.getById(id)
      if (seq !== selectSeqRef.current) return // stale response, a newer selection won
      setSelectedGeneration(generation)
    } catch (err) {
      if (seq !== selectSeqRef.current) return
      setError(getApiErrorMessage(err, 'Unable to load that generation right now.'))
    } finally {
      if (seq === selectSeqRef.current) setIsHistoryLoading(false)
    }
  }, [])

  const generateGeneration = useCallback(async (idea: string) => {
    if (submitInFlightRef.current) return // ignore duplicate submissions
    submitInFlightRef.current = true
    setIsGenerating(true)
    setError(null)

    try {
      const generation = await projectGenerationService.generate(idea)
      setSelectedGeneration(generation)
      setGenerations((current) => {
        const next = [
          {
            id: generation.id,
            idea: generation.idea,
            project_name: generation.result.project_name,
            created_at: generation.created_at,
          },
          ...current,
        ]
        return sortGenerations(next)
      })
    } catch (err) {
      // Input (idea) and prior results are untouched on failure, so the user
      // can retry without re-typing.
      setError(getApiErrorMessage(err, 'Unable to generate a project spec right now.'))
    } finally {
      submitInFlightRef.current = false
      setIsGenerating(false)
    }
  }, [sortGenerations])

  useEffect(() => {
    let isMounted = true

    const runHistoryLoad = async () => {
      setIsHistoryLoading(true)
      setError(null)

      try {
        const items = await projectGenerationService.list()
        if (!isMounted) return
        setGenerations(sortGenerations(items))
      } catch (err) {
        if (!isMounted) return
        setError(getApiErrorMessage(err, 'Unable to load generation history right now.'))
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
  }, [sortGenerations])

  return {
    generations,
    selectedGeneration,
    isHistoryLoading,
    isGenerating,
    error,
    loadHistory,
    selectGenerationById,
    generateGeneration,
  }
}
