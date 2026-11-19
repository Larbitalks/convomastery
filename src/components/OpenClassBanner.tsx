import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { timeAgo } from '../lib/format'

type Open = { id: string; studentId: string; name: string; startedAt: string }

/** Classes that were started but never ended, checked on every page change, when the tab comes back and every minute */
function useOpenClasses() {
  const { session } = useAuth()
  const { pathname } = useLocation()
  const [open, setOpen] = useState<Open[]>([])
  useEffect(() => {
    if (!session) { setOpen([]); return }
    let alive = true
    const tick = async () => {
      try {
        const sessions = (await api.listAllClassSessions()).filter((s) => !s.endedAt)
        if (!sessions.length) { if (alive) setOpen([]); return }
        const students = await api.listStudents()
        if (alive) setOpen(sessions.map((s) => ({ id: s.id, studentId: s.studentId, startedAt: s.startedAt, name: students.find((x) => x.id === s.studentId)?.name ?? 'a student' }))
          .sort((a, b) => a.startedAt.localeCompare(b.startedAt)))
      } catch { /* not a teacher, or offline: show nothing */ }
    }
    tick()
    const t = setInterval(tick, 60_000)
    window.addEventListener('focus', tick)
    return () => { alive = false; clearInterval(t); window.removeEventListener('focus', tick) }
  }, [session, pathname])
  return open
}

/** A reminder across every page while a class is still running, except on that class's own page */
export function OpenClassBanner() {
  const open = useOpenClasses()
  const { pathname } = useLocation()
  const shown = open.filter((o) => !pathname.endsWith(`/class/${o.id}`))
  if (!shown.length) return null
  return (
    <div className="border-b-2 border-[#E9B949] bg-[#FFF4D6]" role="status">
      <div className="wrap flex flex-col gap-2 py-2.5">
        {shown.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-coral" />
            </span>
            <p className="flex-1 text-[15px]"><strong>Your class with {o.name} is still running.</strong> <span className="text-inksoft">Started {timeAgo(o.startedAt)}.</span></p>
            <Link to={`/students/${o.studentId}/class/${o.id}`} className="btn-primary !px-4 !py-1.5 text-sm">Go to class and end it</Link>
          </div>
        ))}
      </div>
    </div>
  )
}
