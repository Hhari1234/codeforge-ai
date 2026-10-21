import { useCallback, useEffect, useRef, useState } from 'react'
import { getApiErrorMessage } from '../services/api'
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

  // One in-flight generation at a time; sequence counter for stale selections.
  const submitInFlightRef = useRef(false)
  const selectSeqRef = useRef(0)

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
      setError(getApiErrorMessage(err, 'Unable to load README history right now.'))
    } finally {
      setIsHistoryLoading(false)
    }
  }, [sortGenerations])

  const selectGenerationById = useCallback(async (id: number) => {
    const seq = ++selectSeqRef.current
    setIsHistoryLoading(true)
    setError(null)

    try {
      const generation = await readmeGenerationService.getById(id)
      if (seq !== selectSeqRef.current) return // stale response, a newer selection won
      setSelectedGeneration(generation)
    } catch (err) {
      if (seq !== selectSeqRef.current) return
      setError(getApiErrorMessage(err, 'Unable to load that README right now.'))
    } finally {
      if (seq === selectSeqRef.current) setIsHistoryLoading(false)
    }
  }, [])

  const generateGeneration = useCallback(
    async (description: string, files: File[]) => {
      if (submitInFlightRef.current) return // ignore duplicate submissions
      submitInFlightRef.current = true
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
        // Description/files and prior results are untouched on failure.
        setError(getApiErrorMessage(err, 'Unable to generate a README right now.'))
      } finally {
        submitInFlightRef.current = false
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
        setError(getApiErrorMessage(err, 'Unable to load README history right now.'))
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

