import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { errorMessage } from '../lib/format'
import { useLoad } from '../lib/hooks'
import type { Award } from '../lib/types'
import { Notice, Spinner } from './ui'

/**
 * Scoreboard for one class: points per student, with a button per award category.
 * Used on the class page and inside the lesson presenter (compact).
 */
export function AwardBoard({ classId, lessonId = null, compact = false }: { classId: string; lessonId?: string | null; compact?: boolean }) {
  const { data, loading, error, setData } = useLoad(async () => {
    const [students, categories, awards] = await Promise.all([api.listStudents(classId), api.listAwardCategories(classId), api.listAwards(classId)])
    return { students, categories, awards }
  }, [classId])
  const [period, setPeriod] = useState<'lesson' | 'week' | 'all'>(lessonId ? 'lesson' : 'all')
  const [err, setErr] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const visible = useMemo(() => {
    if (!data) return []
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString()
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
    return data.awards.filter((a) =>
      period === 'all' ? true : period === 'week' ? a.createdAt >= weekAgo : a.lessonId === lessonId && a.createdAt >= startOfToday,
    )
  }, [data, period, lessonId])

  if (loading) return <Spinner />
  if (error || !data) return <Notice tone="error">{error}</Notice>
  if (data.students.length === 0) return <p className="text-inksoft">Add students to this class to start giving awards.</p>
  if (data.categories.length === 0) return <p className="text-inksoft">Add at least one award category to start giving awards.</p>

  const total = (sid: string) => visible.filter((a) => a.studentId === sid).reduce((s, a) => s + a.points, 0)
  const ranked = [...data.students].sort((a, b) => total(b.id) - total(a.id) || a.name.localeCompare(b.name))
  const top = Math.max(1, ...ranked.map((s) => total(s.id)))
  const recent = [...visible].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, compact ? 3 : 6)

  const give = async (studentId: string, categoryId: string) => {
    setErr(null)
    try {
      const a = await api.giveAward({ classId, studentId, categoryId, lessonId })
      setData({ ...data, awards: [...data.awards, a] })
      setFlash(a.id)
      setTimeout(() => setFlash((f) => (f === a.id ? null : f)), 900)
    } catch (e) { setErr(errorMessage(e)) }
  }
  const undo = async (a: Award) => {
    try { await api.undoAward(a.id); setData({ ...data, awards: data.awards.filter((x) => x.id !== a.id) }) } catch (e) { setErr(errorMessage(e)) }
  }
  const cat = (id: string) => data.categories.find((c) => c.id === id)
  const name = (id: string) => data.students.find((s) => s.id === id)?.name ?? 'Student'

  return (
    <div className="grid gap-4">
      {err && <Notice tone="error">{err}</Notice>}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Show points from">
        {([...(lessonId ? [['lesson', 'This lesson today']] : []), ['week', 'Last 7 days'], ['all', 'All time']] as [typeof period, string][]).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={period === k} onClick={() => setPeriod(k)}
            className={`chip ${period === k ? 'border-ink bg-ink text-white' : 'border-line'}`}>{l}</button>
        ))}
      </div>
      <ol className="grid gap-2">
        {ranked.map((s, i) => {
          const pts = total(s.id)
          const justAwarded = flash && data.awards.find((a) => a.id === flash)?.studentId === s.id
          return (
            <li key={s.id} className={`rounded-xl border-2 p-3 transition-colors ${justAwarded ? 'border-sun bg-sun-light' : 'border-line bg-white'}`}>
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-display font-extrabold text-inksoft">{pts > 0 ? i + 1 : ''}</span>
                {compact ? <span className="min-w-0 flex-1 truncate font-bold">{s.name}</span> : <Link to={`/students/${s.id}`} className="min-w-0 flex-1 truncate font-bold hover:underline underline-offset-2">{s.name}</Link>}
                <span className="font-display text-xl font-extrabold tabular-nums">{pts}</span>
              </div>
              {!compact && (
                <div className="mt-2 ml-9 h-2 overflow-hidden rounded-full bg-board" aria-hidden="true">
                  <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${(pts / top) * 100}%` }} />
                </div>
              )}
              <div className="mt-2 ml-9 flex flex-wrap gap-1.5">
                {data.categories.map((c) => (
                  <button key={c.id} type="button" onClick={() => give(s.id, c.id)}
                    className="rounded-full border-2 px-2.5 py-0.5 text-[13px] font-bold hover:text-white"
                    style={{ borderColor: c.color, color: c.color }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = c.color; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = c.color }}
                    aria-label={`Give ${s.name} ${c.name}, ${c.points} ${c.points === 1 ? 'point' : 'points'}`}>
                    {c.name} +{c.points}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ol>
      {recent.length > 0 && (
        <div>
          <p className="text-sm font-bold text-inksoft">Recent awards</p>
          <ul className="mt-1 grid gap-1 text-[15px]">
            {recent.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2">
                <span><strong>{name(a.studentId)}</strong>: {cat(a.categoryId)?.name ?? 'Award'} +{a.points}</span>
                <button type="button" className="text-sm font-bold underline" onClick={() => undo(a)}>Undo</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

