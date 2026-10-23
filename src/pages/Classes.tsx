import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Field, Input, Notice, Select, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { errorMessage, formatDate } from '../lib/format'
import { useLoad } from '../lib/hooks'
import { Seo } from '../lib/seo'
import { bandOf, computePerformance, toScoreClasses, toScoreExams, toScoreHomework } from '../lib/performance'
import { LEVELS, textOn } from '../lib/types'

export const CLASS_COLORS = ['#3D405B', '#46725D', '#7A5C8C', '#9A6A1F', '#2F5D62', '#5B6C8F', '#6B7F3A']
const today = () => new Date().toISOString().slice(0, 10)

export default function Classes() {
  const { data, loading, error, reload } = useLoad(async () => {
    const [classes, students, homework, statuses, awards, sessions, options, exams] = await Promise.all([
      api.listClasses(), api.listStudents(), api.listHomework(), api.listAllHomeworkStatus(), api.listAllAwards(), api.listAllClassSessions(), api.getBehaviourOptions(), api.listExams(),
    ])
    // Each student's overall score, for the class averages
    const scores = new Map(students.map((s) => [s.id, computePerformance(
      toScoreClasses(sessions.filter((x) => x.studentId === s.id), awards, options), toScoreHomework(s.id, homework, statuses), toScoreExams(s.id, exams)).score]))
    return { classes, students, homework, statuses, scores }
  })
  const [form, setForm] = useState({ name: '', level: 'B1', color: CLASS_COLORS[0] })
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const create = async (e: FormEvent) => {
    e.preventDefault(); setErr(null)
    try { await api.saveClass(form); setForm({ name: '', level: 'B1', color: CLASS_COLORS[((data?.classes.length ?? 0) + 1) % CLASS_COLORS.length] }); setOpen(false); reload() }
    catch (e2) { setErr(errorMessage(e2)) }
  }

  if (loading) return <Spinner />
  if (error || !data) return <Notice tone="error">{error}</Notice>

  // Homework not yet marked, due from two weeks ago to the coming week
  const stateOf = (hid: string) => data.statuses.find((s) => s.homeworkId === hid)?.status ?? 'assigned'
  const upcoming = data.homework
    .filter((h) => stateOf(h.id) === 'assigned' && h.dueDate >= new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10) && h.dueDate <= new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8)

  return (
    <div>
      <Seo title="Classes" noindex />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Classes</h1>
        <button className="btn-primary" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Close' : 'New class'}</button>
      </div>
      <p className="mt-2 max-w-2xl text-inksoft">Keep a list of students for each class and see how each one is doing. Each student's full record is under <Link to="/students" className="font-bold underline underline-offset-2">Students</Link>.</p>

      {open && (
        <form onSubmit={create} className="panel mt-6 grid gap-4 p-5 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
          {err && <div className="sm:col-span-3"><Notice tone="error">{err}</Notice></div>}
          <Field label="Class name" htmlFor="className"><Input id="className" required placeholder="Thursday Teens" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Level" htmlFor="classLevel">
            <Select id="classLevel" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              {LEVELS.map((l) => <option key={l}>{l}</option>)}<option>Mixed</option>
            </Select>
          </Field>
          <button className="btn-primary">Create class</button>
        </form>
      )}

      {data.classes.length === 0 ? (
        <div className="panel mt-8 p-8">
          <h2 className="text-xl font-bold">No classes yet</h2>
          <p className="mt-2 text-inksoft">Create a class for each group or one-to-one student. You can add students straight away.</p>
          <button className="btn-primary mt-4" onClick={() => setOpen(true)}>New class</button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.classes.map((c) => {
            const members = data.students.filter((s) => s.classId === c.id)
            const n = members.length
            const scored = members.map((s) => data.scores.get(s.id)).filter((x): x is number => typeof x === 'number')
            const avg = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null
            const band = avg === null ? null : bandOf(avg)
            return (
              <li key={c.id}>
                <Link to={`/classes/${c.id}`} className="panel group flex h-full flex-col overflow-hidden hover:border-ink/30">
                  {c.image ? (
                    <div className="relative">
                      <img src={c.image} alt="" className="h-32 w-full object-cover" loading="lazy" />
                      <div className="absolute inset-x-0 bottom-0 h-1.5" style={{ backgroundColor: c.color }} />
                    </div>
                  ) : (
                    <div className="flex h-32 items-center justify-center font-display text-5xl font-extrabold" style={{ backgroundColor: c.color, color: textOn(c.color) }} aria-hidden="true">
                      {c.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="text-xl font-bold group-hover:underline underline-offset-4">{c.name}</h2>
                    <p className="mt-1 text-[15px] text-inksoft">{c.level}, {n} {n === 1 ? 'student' : 'students'}</p>
                    <div className="mt-auto pt-4">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="text-inksoft">Average performance</span>
                        {avg !== null && band ? <span><span className="font-bold" style={{ color: band.color === '#F2CC8F' ? '#9A6A1F' : band.color }}>{band.label}</span> <span className="font-display text-lg font-extrabold tabular-nums">{avg}</span></span>
                          : <span className="text-inksoft">No scores yet</span>}
                      </div>
                      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-board" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={avg ?? 0}
                        aria-label={avg !== null ? `Average performance ${avg} out of 100` : 'No scores yet'}>
                        {avg !== null && band && <div className="h-full rounded-full" style={{ width: `${Math.max(avg, 2)}%`, backgroundColor: band.color }} />}
                      </div>
                      {avg !== null && scored.length < n && <p className="mt-1 text-[12px] text-inksoft">From {scored.length} of {n} students with classes so far</p>}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {upcoming.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-extrabold">Homework to check</h2>
          <p className="mt-1 text-inksoft">Homework due recently or this week that you haven't marked yet.</p>
          <ul className="mt-4 grid max-w-3xl gap-3">
            {upcoming.map((h) => {
              const student = data.students.find((s) => s.id === h.studentId)
              const cls = data.classes.find((c) => c.id === h.classId)
              const overdue = h.dueDate < today()
              return (
                <li key={h.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-bold">{student?.name ?? 'Student'}: {h.title}</p>
                    <p className={`text-[15px] ${overdue ? 'font-bold text-[#8E1C20]' : 'text-inksoft'}`}>{cls?.name}. {overdue ? 'Was due' : 'Due'} {formatDate(h.dueDate)}</p>
                  </div>
                  {student && <Link to={`/students/${student.id}`} className="font-bold underline underline-offset-4">Mark it</Link>}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
