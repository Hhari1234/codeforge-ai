import { useCallback, useEffect, useRef, useState } from 'react'
import { getApiErrorMessage } from '../services/api'
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

  // One in-flight debug run at a time; sequence counter for stale selections.
  const submitInFlightRef = useRef(false)
  const selectSeqRef = useRef(0)

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
      setError(getApiErrorMessage(err, 'Unable to load history right now.'))
    } finally {
      setIsHistoryLoading(false)
    }
  }, [sortSessions])

  const selectSessionById = useCallback(async (id: number) => {
    const seq = ++selectSeqRef.current
    setIsHistoryLoading(true)
    setError(null)

    try {
      const session = await bugDebugService.getById(id)
      if (seq !== selectSeqRef.current) return // stale response, a newer selection won
      setSelectedSession(session)
    } catch (err) {
      if (seq !== selectSeqRef.current) return
      setError(getApiErrorMessage(err, 'Unable to load that session right now.'))
    } finally {
      if (seq === selectSeqRef.current) setIsHistoryLoading(false)
    }
  }, [])

  const deleteSession = useCallback(
    async (id: number) => {
      try {
        await bugDebugService.deleteById(id)
        setSessions((current) => current.filter((s) => s.id !== id))
        setSelectedSession((current) => (current?.id === id ? null : current))
      } catch (err) {
        setError(getApiErrorMessage(err, 'Unable to delete that session right now.'))
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
      if (submitInFlightRef.current) return // ignore duplicate submissions
      submitInFlightRef.current = true
      setIsDebugging(true)
      setError(null)

      try {
        const session = await action()
        adoptSession(session)
      } catch (err) {
        // User input and prior session results are preserved on failure.
        setError(getApiErrorMessage(err, 'Unable to debug this code right now.'))
      } finally {
        submitInFlightRef.current = false
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
        setError(getApiErrorMessage(err, 'Unable to load history right now.'))
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
