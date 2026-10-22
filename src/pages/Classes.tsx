import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Field, Input, Notice, Select, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { errorMessage, formatDate } from '../lib/format'
import { useLoad } from '../lib/hooks'
import { Seo } from '../lib/seo'
import { LEVELS } from '../lib/types'

export const CLASS_COLORS = ['#3D405B', '#46725D', '#7A5C8C', '#9A6A1F', '#2F5D62', '#5B6C8F', '#6B7F3A']
const today = () => new Date().toISOString().slice(0, 10)

export default function Classes() {
  const { data, loading, error, reload } = useLoad(async () => {
    const [classes, students, homework] = await Promise.all([api.listClasses(), api.listStudents(), api.listHomework()])
    const statuses = await Promise.all(classes.map((c) => api.listHomeworkStatus(c.id)))
    return { classes, students, homework, statuses: statuses.flat() }
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
            const n = data.students.filter((s) => s.classId === c.id).length
            return (
              <li key={c.id}>
                <Link to={`/classes/${c.id}`} className="panel group block overflow-hidden hover:border-ink/30">
                  <div className="h-3" style={{ backgroundColor: c.color }} />
                  <div className="p-5">
                    <h2 className="text-xl font-bold group-hover:underline underline-offset-4">{c.name}</h2>
                    <p className="mt-1 text-[15px] text-inksoft">{c.level}, {n} {n === 1 ? 'student' : 'students'}</p>
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
