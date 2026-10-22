import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Field, Input, Notice, Select, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { errorMessage, formatDate } from '../lib/format'
import { useLoad } from '../lib/hooks'
import { Seo } from '../lib/seo'
import { PerformanceMini } from '../components/Performance'
import { computePerformance, toScoreClasses, toScoreHomework } from '../lib/performance'

export default function Students() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const classFilter = params.get('class') ?? ''
  const { data, loading, error, reload } = useLoad(async () => {
    const [classes, students, awards, homework, statuses, notes, sessions, options] = await Promise.all([
      api.listClasses(), api.listStudents(), api.listAllAwards(), api.listHomework(), api.listAllHomeworkStatus(), api.listStudentNotes(),
      api.listAllClassSessions(), api.getBehaviourOptions(),
    ])
    return { classes, students, awards, homework, statuses, notes, sessions, options }
  })
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', classId: '' })
  const [err, setErr] = useState<string | null>(null)
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v); else next.delete(k)
    setParams(next, { replace: true })
  }

  const rows = useMemo(() => {
    if (!data) return []
    const today = new Date().toISOString().slice(0, 10)
    return data.students
      .filter((s) => (!classFilter || s.classId === classFilter) && (!q || s.name.toLowerCase().includes(q.toLowerCase())))
      .map((s) => {
        const due = data.homework.filter((h) => h.studentId === s.id && h.dueDate <= today)
        const handed = due.filter((h) => ['done', 'late'].includes(data.statuses.find((x) => x.homeworkId === h.id && x.studentId === s.id)?.status ?? '')).length
        const lastNote = data.notes.find((n) => n.studentId === s.id)
        return {
          s,
          cls: data.classes.find((c) => c.id === s.classId),
          points: data.awards.filter((a) => a.studentId === s.id).reduce((t, a) => t + a.points, 0),
          homework: due.length ? `${handed} of ${due.length}` : 'None due',
          lastNote: lastNote?.date,
          perf: computePerformance(toScoreClasses(data.sessions.filter((x) => x.studentId === s.id), data.awards, data.options), toScoreHomework(s.id, data.homework, data.statuses)),
        }
      })
      .sort((a, b) => a.s.name.localeCompare(b.s.name))
  }, [data, q, classFilter])

  const add = async (e: FormEvent) => {
    e.preventDefault(); setErr(null)
    try { await api.saveStudent({ name: form.name.trim(), classId: form.classId }); setForm({ name: '', classId: form.classId }); setAdding(false); reload() }
    catch (e2) { setErr(errorMessage(e2)) }
  }

  if (loading && !data) return <Spinner />
  if (error || !data) return <Notice tone="error">{error}</Notice>

  return (
    <div>
      <Seo title="Students" noindex />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Students</h1>
        {data.classes.length > 0 && <button className="btn-primary" onClick={() => { setAdding(!adding); setForm({ name: '', classId: classFilter || data.classes[0].id }) }} aria-expanded={adding}>{adding ? 'Close' : 'Add a student'}</button>}
      </div>
      <p className="mt-2 max-w-2xl text-inksoft">Every student across your classes. Open a student to see their full record: details, lesson notes, awards and homework.</p>

      {adding && (
        <form onSubmit={add} className="panel mt-6 grid gap-4 p-5 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
          {err && <div className="sm:col-span-3"><Notice tone="error">{err}</Notice></div>}
          <Field label="Name" htmlFor="newStudentName"><Input id="newStudentName" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Class" htmlFor="newStudentClass">
            <Select id="newStudentClass" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
              {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <button className="btn-primary">Add student</button>
        </form>
      )}

      {data.classes.length === 0 ? (
        <div className="panel mt-8 p-8">
          <h2 className="text-xl font-bold">Create a class first</h2>
          <p className="mt-2 text-inksoft">Students belong to a class, even a one-to-one student. Create a class, then add students to it.</p>
          <Link to="/classes" className="btn-primary mt-4">Go to classes</Link>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="w-full sm:w-64">
              <label htmlFor="studentSearch" className="sr-only">Search students</label>
              <Input id="studentSearch" type="search" placeholder="Search by name" value={q} onChange={(e) => set('q', e.target.value)} />
            </div>
            <div className="w-full sm:w-64">
              <label htmlFor="studentClass" className="sr-only">Class</label>
              <Select id="studentClass" value={classFilter} onChange={(e) => set('class', e.target.value)}>
                <option value="">All classes</option>
                {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
          </div>
          {rows.length === 0 ? <p className="mt-6 text-inksoft">No students match. {data.students.length === 0 && 'Add your first student above.'}</p> : (
            <div className="panel mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[15px]">
                <thead className="border-b-2 border-line bg-board">
                  <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Level</th><th className="px-4 py-3">Performance</th><th className="px-4 py-3">Award points</th><th className="px-4 py-3">Homework handed in</th><th className="px-4 py-3">Last lesson note</th></tr>
                </thead>
                <tbody className="divide-y-2 divide-line">
                  {rows.map(({ s, cls, points, homework, lastNote, perf }) => (
                    <tr key={s.id} className="hover:bg-board/50">
                      <td className="px-4 py-3 font-bold"><Link to={`/students/${s.id}`} className="underline underline-offset-2">{s.name}</Link></td>
                      <td className="px-4 py-3"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cls?.color }} aria-hidden="true" />{cls?.name}</td>
                      <td className="px-4 py-3">{s.level || cls?.level}</td>
                      <td className="px-4 py-3"><PerformanceMini perf={perf} /></td>
                      <td className="px-4 py-3 tabular-nums">{points}</td>
                      <td className="px-4 py-3">{homework}</td>
                      <td className="px-4 py-3 text-inksoft">{lastNote ? formatDate(lastNote) : 'None yet'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
