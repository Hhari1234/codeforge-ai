import { useCallback, useEffect, useState } from 'react'
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
      setError(err instanceof Error ? err.message : 'Unable to load generation history right now.')
    } finally {
      setIsHistoryLoading(false)
    }
  }, [sortGenerations])

  const selectGenerationById = useCallback(async (id: number) => {
    setIsHistoryLoading(true)
    setError(null)

    try {
      const generation = await projectGenerationService.getById(id)
      setSelectedGeneration(generation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load that generation right now.')
    } finally {
      setIsHistoryLoading(false)
    }
  }, [])

  const generateGeneration = useCallback(async (idea: string) => {
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
      setError(err instanceof Error ? err.message : 'Unable to generate a project spec right now.')
    } finally {
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
        setError(err instanceof Error ? err.message : 'Unable to load generation history right now.')
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
