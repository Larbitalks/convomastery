import { useEffect, useState } from 'react'
import { api } from './api'
import { useAuth } from './auth'

/** Unread message count, refreshed every 30 seconds and when the tab regains focus. */
export function useUnread() {
  const { session } = useAuth()
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!session) { setCount(0); return }
    let alive = true
    const tick = () => api.unreadCount().then((n) => alive && setCount(n)).catch(() => {})
    tick()
    const t = setInterval(tick, 30_000)
    window.addEventListener('focus', tick)
    window.addEventListener('cm:messages-read', tick)
    return () => { alive = false; clearInterval(t); window.removeEventListener('focus', tick); window.removeEventListener('cm:messages-read', tick) }
  }, [session])
  return count
}
