import { useCallback, useEffect, useState } from 'react'
import repositoryAnalysisService from '../services/repositoryAnalysisService'
import type {
  RepositoryAnalysisListItem,
  RepositoryAnalysisOut,
} from '../types/repositoryAnalysis'

export function useRepositoryAnalysis() {
  const [analyses, setAnalyses] = useState<RepositoryAnalysisListItem[]>([])
  const [selectedAnalysis, setSelectedAnalysis] = useState<RepositoryAnalysisOut | null>(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sortAnalyses = useCallback((items: RepositoryAnalysisListItem[]) => {
    return [...items].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  }, [])

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true)
    setError(null)

    try {
      const items = await repositoryAnalysisService.list()
      setAnalyses(sortAnalyses(items))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load analysis history right now.')
    } finally {
      setIsHistoryLoading(false)
    }
  }, [sortAnalyses])

  const selectAnalysisById = useCallback(async (id: number) => {
    setIsHistoryLoading(true)
    setError(null)

    try {
      const analysis = await repositoryAnalysisService.getById(id)
      setSelectedAnalysis(analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load that analysis right now.')
    } finally {
      setIsHistoryLoading(false)
    }
  }, [])

  const analyzeZip = useCallback(
    async (file: File) => {
      setIsAnalyzing(true)
      setError(null)

      try {
        const analysis = await repositoryAnalysisService.analyzeZip(file)
        setSelectedAnalysis(analysis)
        setAnalyses((current) => {
          const next = [
            {
              id: analysis.id,
              repo_source: analysis.repo_source,
              created_at: analysis.created_at,
            },
            ...current,
          ]
          return sortAnalyses(next)
        })
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to analyze this repository right now.'
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        setError(detail || message)
      } finally {
        setIsAnalyzing(false)
      }
    },
    [sortAnalyses],
  )

  const analyzeGithub = useCallback(
    async (repoUrl: string) => {
      setIsAnalyzing(true)
      setError(null)

      try {
        const analysis = await repositoryAnalysisService.analyzeGithub({ repo_url: repoUrl })
        setSelectedAnalysis(analysis)
        setAnalyses((current) => {
          const next = [
            {
              id: analysis.id,
              repo_source: analysis.repo_source,
              created_at: analysis.created_at,
            },
            ...current,
          ]
          return sortAnalyses(next)
        })
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to analyze this repository right now.'
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        setError(detail || message)
      } finally {
        setIsAnalyzing(false)
      }
    },
    [sortAnalyses],
  )

  useEffect(() => {
    let isMounted = true

    const runHistoryLoad = async () => {
      setIsHistoryLoading(true)
      setError(null)

      try {
        const items = await repositoryAnalysisService.list()
        if (!isMounted) return
        setAnalyses(sortAnalyses(items))
      } catch (err) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Unable to load analysis history right now.')
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
  }, [sortAnalyses])

  return {
    analyses,
    selectedAnalysis,
    isHistoryLoading,
    isAnalyzing,
    error,
    loadHistory,
    selectAnalysisById,
    analyzeZip,
    analyzeGithub,
  }
}

