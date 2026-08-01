import { useCallback, useEffect, useState } from 'react'
import readmeGenerationService from '../services/readmeGenerationService'
import type {
  ReadmeGenerationListItem,
  ReadmeGenerationOut,
} from '../types/readmeGeneration'

export function useReadmeGeneration() {
  const [generations, setGenerations] = useState<ReadmeGenerationListItem[]>([])
  const [selectedGeneration, setSelectedGeneration] = useState<ReadmeGenerationOut | null>(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sortGenerations = useCallback((items: ReadmeGenerationListItem[]) => {
    return [...items].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  }, [])

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true)
    setError(null)

    try {
      const items = await readmeGenerationService.list()
      setGenerations(sortGenerations(items))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load README history right now.')
    } finally {
      setIsHistoryLoading(false)
    }
  }, [sortGenerations])

  const selectGenerationById = useCallback(async (id: number) => {
    setIsHistoryLoading(true)
    setError(null)

    try {
      const generation = await readmeGenerationService.getById(id)
      setSelectedGeneration(generation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load that README right now.')
    } finally {
      setIsHistoryLoading(false)
    }
  }, [])

  const generateGeneration = useCallback(
    async (description: string, files: File[]) => {
      setIsGenerating(true)
      setError(null)

      try {
        const generation = await readmeGenerationService.generate(description, files)
        setSelectedGeneration(generation)
        setGenerations((current) => {
          const next = [
            {
              id: generation.id,
              input_summary: generation.input_summary,
              title: generation.result.title,
              created_at: generation.created_at,
            },
            ...current,
          ]
          return sortGenerations(next)
        })
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to generate a README right now.'
        // Show backend `detail` when available.
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        setError(detail || message)
      } finally {
        setIsGenerating(false)
      }
    },
    [sortGenerations],
  )

  useEffect(() => {
    let isMounted = true

    const runHistoryLoad = async () => {
      setIsHistoryLoading(true)
      setError(null)

      try {
        const items = await readmeGenerationService.list()
        if (!isMounted) return
        setGenerations(sortGenerations(items))
      } catch (err) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Unable to load README history right now.')
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

