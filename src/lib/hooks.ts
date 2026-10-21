import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from './format'

/** Load data on mount and expose a reload function. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)
  const reload = useCallback(async () => {
    setLoading(true)
    try { setData(await run()); setError(null) } catch (e) { setError(errorMessage(e)) } finally { setLoading(false) }
  }, [run])
  useEffect(() => { reload() }, [reload])
  return { data, error, loading, reload, setData }
}
