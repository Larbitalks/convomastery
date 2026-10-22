import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Input, Notice, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'
import { useLoad } from '../lib/hooks'
import { Seo } from '../lib/seo'
import { textOn, type HomeworkState } from '../lib/types'
import { PerformanceCard } from '../components/Performance'
import { computePerformance } from '../lib/performance'

const STATUS: Record<HomeworkState, { text: string; cls: string }> = {
  done: { text: 'Done', cls: 'bg-sage-light text-sage-dark' },
  late: { text: 'Handed in late', cls: 'bg-sun-light text-ink' },
  missing: { text: 'Missing', cls: 'bg-[#FDECEC] text-[#8E1C20]' },
  assigned: { text: 'To do', cls: 'bg-board text-ink' },
}

/** Page where a student or parent types the code from their teacher */
export function ProgressEntry() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const clean = code.trim().toUpperCase()
    if (clean) navigate(`/progress/${encodeURIComponent(clean)}`)
  }
  return (
    <div className="wrap py-16">
      <Seo title="Student progress" description="Students and parents: enter the code from your teacher to see points, homework and notes." />
      <div className="mx-auto max-w-md">
        <h1 className="text-4xl font-extrabold">See your progress</h1>
        <p className="mt-3 text-inksoft">Type the code your teacher gave you. It looks like <strong>ABCD-EFGH-JKLM</strong>.</p>
        <form onSubmit={submit} className="panel mt-8 grid gap-4 p-6">
          <label htmlFor="progressCode" className="label !mb-0">Your code</label>
          <Input id="progressCode" autoComplete="off" autoCapitalize="characters" spellCheck={false} required value={code}
            onChange={(e) => setCode(e.target.value)} className="font-display text-xl tracking-wider uppercase" placeholder="ABCD-EFGH-JKLM" />
          <button className="btn-primary !py-3">See my progress</button>
        </form>
      </div>
    </div>
  )
}

/** Read-only progress page for one student */
export function ProgressView() {
  const { code = '' } = useParams()
  const { data, loading, error } = useLoad(() => api.getStudentProgress(code), [code])

  if (loading) return <Spinner label="Loading your progress" />
  if (error || !data) {
    return (
      <div className="wrap py-16">
        <Seo title="Student progress" noindex />
        <div className="mx-auto max-w-md">
          <h1 className="text-3xl font-extrabold">This code doesn't work</h1>
          <p className="mt-3 text-inksoft">Check that it's typed correctly. If it still doesn't work, ask your teacher for a new code.</p>
          <Link to="/progress" className="btn-primary mt-6">Try again</Link>
        </div>
      </div>
    )
  }

  const top = Math.max(1, ...data.categories.map((c) => c.points))
  const today = new Date().toISOString().slice(0, 10)
  const toDo = data.homework.filter((h) => h.status === 'assigned' && h.dueDate >= today)
  const perf = data.classes
    ? computePerformance(data.classes.map((c) => ({ date: c.date, attendance: c.attendance, review: c.review ?? null, points: c.points ?? 0, positive: c.positive ?? 0, negative: c.negative ?? 0 })), data.homework)
    : null

  return (
    <div className="wrap py-10">
      <Seo title={`${data.name}'s progress`} noindex />
      <div className="grid items-end gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <p className="text-inksoft">{data.className}{data.level ? `, level ${data.level}` : ''}</p>
          <h1 className="mt-1 text-4xl font-extrabold sm:text-5xl">Hi, {data.name}!</h1>
          <p className="mt-2 text-inksoft">Here are your points, your homework and notes from your teacher.</p>
        </div>
        <div className="rounded-[28px] rounded-bl-md border-[3px] border-ink bg-sun px-7 py-5 text-center shadow-[6px_6px_0_#3D405B]">
          <p className="font-display text-6xl font-extrabold tabular-nums leading-none">{data.totalPoints}</p>
          <p className="mt-1 font-bold">{data.totalPoints === 1 ? 'point' : 'points'}</p>
        </div>
      </div>

      {perf && perf.score !== null && <div className="mt-10 max-w-3xl"><PerformanceCard perf={perf} name={data.name} title="Your overall performance" /></div>}

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1fr]">
        <section>
          <h2 className="text-2xl font-extrabold">Your awards</h2>
          {data.categories.length === 0 ? <p className="mt-2 text-inksoft">No awards yet.</p> : (
            <ul className="mt-4 grid gap-3">
              {data.categories.map((c) => (
                <li key={c.name}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold">{c.name}</span>
                    <span className="font-display text-lg font-extrabold tabular-nums">{c.points}</span>
                  </div>
                  <div className="mt-1 h-3 overflow-hidden rounded-full bg-board" aria-hidden="true">
                    <div className="h-full rounded-full" style={{ width: `${(c.points / top) * 100}%`, backgroundColor: c.color }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {data.recentAwards.length > 0 && (
            <>
              <h3 className="mt-8 text-lg font-bold">Latest awards</h3>
              <ul className="mt-2 grid gap-2">
                {data.recentAwards.map((a, i) => (
                  <li key={i} className="flex items-center gap-3 text-[15px]">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: a.color }} aria-hidden="true" />
                    <span className="flex-1"><strong>{a.category}</strong> +{a.points}{a.lesson ? <span className="text-inksoft">, {a.lesson}</span> : null}</span>
                    <span className="text-inksoft">{formatDate(a.date)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-extrabold">Homework</h2>
          {toDo.length > 0 && <div className="mt-3"><Notice>You have {toDo.length === 1 ? '1 homework' : `${toDo.length} homeworks`} to do.</Notice></div>}
          {data.homework.length === 0 ? <p className="mt-2 text-inksoft">No homework yet.</p> : (
            <ul className="mt-4 grid gap-3">
              {data.homework.map((h, i) => {
                const st = STATUS[h.status] ?? STATUS.assigned
                return (
                  <li key={i} className="panel p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-bold">{h.title}</p>
                        <p className="text-[14px] text-inksoft">Due {formatDate(h.dueDate)}</p>
                      </div>
                      <span className={`rounded-full px-3 py-0.5 text-sm font-bold ${st.cls}`}>{st.text}</span>
                    </div>
                    {h.instructions && <p className="mt-2 whitespace-pre-line text-[15px]">{h.instructions}</p>}
                    {h.feedback && <p className="mt-2 rounded-lg bg-board px-3 py-2 text-[15px]"><strong>Teacher:</strong> {h.feedback}</p>}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {data.classes && data.classes.length > 0 && (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-extrabold">Your recent classes</h2>
          <ul className="mt-4 grid gap-3">
            {data.classes.slice(0, 8).map((c, i) => {
              const total = c.behaviour.reduce((t, b) => t + b.count, 0)
              const att = { present: ['Present', 'bg-sage-light text-sage-dark'], late: ['Late', 'bg-sun-light'], absent: ['Absent', 'bg-[#FDECEC] text-[#8E1C20]'] }[c.attendance]
              return (
                <li key={i} className="panel p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold">{formatDate(c.date)}</p>
                    <span className="flex gap-1.5">
                      {c.review && <span className={`rounded-md px-2 py-0.5 text-sm font-bold ${{ yes: 'bg-sage-light text-sage-dark', partly: 'bg-sun-light', no: 'bg-[#FDECEC] text-[#8E1C20]' }[c.review]}`}>{{ yes: 'Reviewed', partly: 'Partly reviewed', no: 'Did not review' }[c.review]}</span>}
                      <span className={`rounded-md px-2 py-0.5 text-sm font-bold ${att[1]}`}>{att[0]}</span>
                    </span>
                  </div>
                  {total > 0 && (
                    <>
                      <div className="mt-2 flex h-2.5 overflow-hidden rounded-full" aria-hidden="true">
                        {c.behaviour.map((b) => <span key={b.label} style={{ width: `${(b.count / total) * 100}%`, backgroundColor: b.color }} />)}
                      </div>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {c.behaviour.map((b) => <li key={b.label} className="rounded-full px-2.5 py-0.5 text-[13px] font-bold" style={{ backgroundColor: b.color, color: textOn(b.color) }}>{b.label} {b.count}</li>)}
                      </ul>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {data.notes.length > 0 && (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-extrabold">Notes from your teacher</h2>
          <ol className="mt-4 grid gap-4">
            {data.notes.map((n, i) => (
              <li key={i} className="border-l-[3px] border-sage pl-4">
                <p className="text-sm font-bold text-inksoft">{formatDate(n.date)}</p>
                <p className="mt-1 whitespace-pre-line">{n.body}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="mt-16 text-sm text-inksoft">This page is just for you. Keep your code private.</p>
    </div>
  )
}
