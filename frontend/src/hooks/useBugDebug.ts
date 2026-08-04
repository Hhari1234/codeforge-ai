import { useCallback, useEffect, useState } from 'react'
import bugDebugService from '../services/bugDebugService'
import type {
  BugDebugCodeRequest,
  BugDebugListItem,
  BugDebugOut,
} from '../types/bugDebug'

export function useBugDebug() {
  const [sessions, setSessions] = useState<BugDebugListItem[]>([])
  const [selectedSession, setSelectedSession] = useState<BugDebugOut | null>(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isDebugging, setIsDebugging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sortSessions = useCallback((items: BugDebugListItem[]) => {
    return [...items].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  }, [])

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true)
    setError(null)

    try {
      const items = await bugDebugService.list()
      setSessions(sortSessions(items))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load history right now.')
    } finally {
      setIsHistoryLoading(false)
    }
  }, [sortSessions])

  const selectSessionById = useCallback(async (id: number) => {
    setIsHistoryLoading(true)
    setError(null)

    try {
      const session = await bugDebugService.getById(id)
      setSelectedSession(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load that session right now.')
    } finally {
      setIsHistoryLoading(false)
    }
  }, [])

  const deleteSession = useCallback(
    async (id: number) => {
      try {
        await bugDebugService.deleteById(id)
        setSessions((current) => current.filter((s) => s.id !== id))
        setSelectedSession((current) => (current?.id === id ? null : current))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to delete that session right now.')
      }
    },
    [],
  )

  const adoptSession = useCallback(
    (session: BugDebugOut) => {
      setSelectedSession(session)
      setSessions((current) => {
        const next = [
          {
            id: session.id,
            repo_source: session.repo_source,
            created_at: session.created_at,
          },
          ...current,
        ]
        return sortSessions(next)
      })
    },
    [sortSessions],
  )

  const runDebug = useCallback(
    async (action: () => Promise<BugDebugOut>) => {
      setIsDebugging(true)
      setError(null)

      try {
        const session = await action()
        adoptSession(session)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to debug this code right now.'
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        setError(detail || message)
      } finally {
        setIsDebugging(false)
      }
    },
    [adoptSession],
  )

  const analyzeGithub = useCallback(
    (repoUrl: string) => runDebug(() => bugDebugService.analyzeGithub({ repo_url: repoUrl })),
    [runDebug],
  )

  const analyzeZip = useCallback(
    (file: File) => runDebug(() => bugDebugService.analyzeZip(file)),
    [runDebug],
  )

  const analyzeFile = useCallback(
    (file: File) => runDebug(() => bugDebugService.analyzeFile(file)),
    [runDebug],
  )

  const analyzeCode = useCallback(
    (payload: BugDebugCodeRequest) => runDebug(() => bugDebugService.analyzeCode(payload)),
    [runDebug],
  )

  useEffect(() => {
    let isMounted = true

    const runHistoryLoad = async () => {
      setIsHistoryLoading(true)
      setError(null)

      try {
        const items = await bugDebugService.list()
        if (!isMounted) return
        setSessions(sortSessions(items))
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
  }, [sortSessions])

  return {
    sessions,
    selectedSession,
    isHistoryLoading,
    isDebugging,
    error,
    loadHistory,
    selectSessionById,
    deleteSession,
    analyzeGithub,
    analyzeZip,
    analyzeFile,
    analyzeCode,
  }
}
