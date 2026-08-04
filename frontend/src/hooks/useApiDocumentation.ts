import { useCallback, useEffect, useState } from 'react'
import apiDocumentationService from '../services/apiDocumentationService'
import type {
  ApiDocumentationListItem,
  ApiDocumentationOut,
  DocumentationSourceRequest,
} from '../types/apiDocumentation'

export function useApiDocumentation() {
  const [docs, setDocs] = useState<ApiDocumentationListItem[]>([])
  const [selectedDoc, setSelectedDoc] = useState<ApiDocumentationOut | null>(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sortDocs = useCallback((items: ApiDocumentationListItem[]) => {
    return [...items].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  }, [])

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true)
    setError(null)

    try {
      const items = await apiDocumentationService.list()
      setDocs(sortDocs(items))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load history right now.')
    } finally {
      setIsHistoryLoading(false)
    }
  }, [sortDocs])

  const selectDocById = useCallback(async (id: number) => {
    setIsHistoryLoading(true)
    setError(null)

    try {
      const doc = await apiDocumentationService.getById(id)
      setSelectedDoc(doc)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load that document right now.')
    } finally {
      setIsHistoryLoading(false)
    }
  }, [])

  const deleteDoc = useCallback(
    async (id: number) => {
      try {
        await apiDocumentationService.deleteById(id)
        setDocs((current) => current.filter((d) => d.id !== id))
        setSelectedDoc((current) => (current?.id === id ? null : current))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to delete that document right now.')
      }
    },
    [],
  )

  const adoptDoc = useCallback(
    (doc: ApiDocumentationOut) => {
      setSelectedDoc(doc)
      setDocs((current) => {
        const next = [
          { id: doc.id, repo_source: doc.repo_source, created_at: doc.created_at },
          ...current,
        ]
        return sortDocs(next)
      })
    },
    [sortDocs],
  )

  const runGeneration = useCallback(
    async (action: () => Promise<ApiDocumentationOut>) => {
      setIsGenerating(true)
      setError(null)

      try {
        const doc = await action()
        adoptDoc(doc)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to generate documentation right now.'
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        setError(detail || message)
      } finally {
        setIsGenerating(false)
      }
    },
    [adoptDoc],
  )

  const analyzeGithub = useCallback(
    (repoUrl: string) =>
      runGeneration(() => apiDocumentationService.analyzeGithub({ repo_url: repoUrl })),
    [runGeneration],
  )

  const analyzeZip = useCallback(
    (file: File) => runGeneration(() => apiDocumentationService.analyzeZip(file)),
    [runGeneration],
  )

  const analyzeFile = useCallback(
    (file: File) => runGeneration(() => apiDocumentationService.analyzeFile(file)),
    [runGeneration],
  )

  const analyzeSource = useCallback(
    (payload: DocumentationSourceRequest) =>
      runGeneration(() => apiDocumentationService.analyzeSource(payload)),
    [runGeneration],
  )

  const analyzeOpenApi = useCallback(
    (file: File) => runGeneration(() => apiDocumentationService.analyzeOpenApi(file)),
    [runGeneration],
  )

  useEffect(() => {
    let isMounted = true

    const runHistoryLoad = async () => {
      setIsHistoryLoading(true)
      setError(null)

      try {
        const items = await apiDocumentationService.list()
        if (!isMounted) return
        setDocs(sortDocs(items))
      } catch (err) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Unable to load history right now.')
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
  }, [sortDocs])

  return {
    docs,
    selectedDoc,
    isHistoryLoading,
    isGenerating,
    error,
    loadHistory,
    selectDocById,
    deleteDoc,
    analyzeGithub,
    analyzeZip,
    analyzeFile,
    analyzeSource,
    analyzeOpenApi,
  }
}
