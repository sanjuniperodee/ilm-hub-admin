import { useCallback, useEffect, useState } from 'react'

export interface LoadState<T> {
  data: T | undefined
  loading: boolean
  error: unknown
  reload: () => void
}

/**
 * Runs `load` on mount and whenever it changes (wrap it in `useCallback`).
 * Keeps the previous data while reloading so tables show a thin progress bar instead of skeletons.
 */
export function useLoad<T>(load: () => Promise<T>): LoadState<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    load()
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((e) => {
        if (!cancelled) setError(e ?? new Error('load failed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { data, loading, error, reload }
}
