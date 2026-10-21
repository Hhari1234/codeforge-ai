import { useCallback, useEffect, useRef, useState } from 'react'
import { getApiErrorMessage } from '../services/api'
import codeReviewService from '../services/codeReviewService'
import type {
  CodeReviewListItem,
  CodeReviewOut,
} from '../types/codeReview'

export function useCodeReview() {
  const [reviews, setReviews] = useState<CodeReviewListItem[]>([])
  const [selectedReview, setSelectedReview] = useState<CodeReviewOut | null>(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // One in-flight review at a time; sequence counter for stale selections.
  const submitInFlightRef = useRef(false)
  const selectSeqRef = useRef(0)

  const sortReviews = useCallback((items: CodeReviewListItem[]) => {
    return [...items].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  }, [])

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true)
    setError(null)

    try {
      const items = await codeReviewService.list()
      setReviews(sortReviews(items))
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load review history right now.'))
    } finally {
      setIsHistoryLoading(false)
    }
  }, [sortReviews])

  const selectReviewById = useCallback(async (id: number) => {
    const seq = ++selectSeqRef.current
    setIsHistoryLoading(true)
    setError(null)

    try {
      const review = await codeReviewService.getById(id)
      if (seq !== selectSeqRef.current) return // stale response, a newer selection won
      setSelectedReview(review)
    } catch (err) {
      if (seq !== selectSeqRef.current) return
      setError(getApiErrorMessage(err, 'Unable to load that review right now.'))
    } finally {
      if (seq === selectSeqRef.current) setIsHistoryLoading(false)
    }
  }, [])

  const adoptReview = useCallback(
    (review: CodeReviewOut) => {
      setSelectedReview(review)
      setReviews((current) => {
        const next = [
          {
            id: review.id,
            repo_source: review.repo_source,
            created_at: review.created_at,
          },
          ...current,
        ]
        return sortReviews(next)
      })
    },
    [sortReviews],
  )

  const analyzeZip = useCallback(
    async (file: File) => {
      if (submitInFlightRef.current) return // ignore duplicate submissions
      submitInFlightRef.current = true
      setIsReviewing(true)
      setError(null)

      try {
        const review = await codeReviewService.analyzeZip(file)
        adoptReview(review)
      } catch (err) {
        setError(getApiErrorMessage(err, 'Unable to review this repository right now.'))
      } finally {
        submitInFlightRef.current = false
        setIsReviewing(false)
      }
    },
    [adoptReview],
  )

  const analyzeGithub = useCallback(
    async (repoUrl: string) => {
      if (submitInFlightRef.current) return // ignore duplicate submissions
      submitInFlightRef.current = true
      setIsReviewing(true)
      setError(null)

      try {
        const review = await codeReviewService.analyzeGithub({ repo_url: repoUrl })
        adoptReview(review)
      } catch (err) {
        setError(getApiErrorMessage(err, 'Unable to review this repository right now.'))
      } finally {
        submitInFlightRef.current = false
        setIsReviewing(false)
      }
    },
    [adoptReview],
  )

  useEffect(() => {
    let isMounted = true

    const runHistoryLoad = async () => {
      setIsHistoryLoading(true)
      setError(null)

      try {
        const items = await codeReviewService.list()
        if (!isMounted) return
        setReviews(sortReviews(items))
      } catch (err) {
        if (!isMounted) return
        setError(getApiErrorMessage(err, 'Unable to load review history right now.'))
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
  }, [sortReviews])

  return {
    reviews,
    selectedReview,
    isHistoryLoading,
    isReviewing,
    error,
    loadHistory,
    selectReviewById,
    analyzeZip,
    analyzeGithub,
  }
}
