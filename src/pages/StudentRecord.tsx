import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Field, Input, Notice, Select, Spinner, Textarea } from '../components/ui'
import { api } from '../lib/api'
import { errorMessage, formatDate } from '../lib/format'
import { useLoad } from '../lib/hooks'
import { Seo } from '../lib/seo'
import { LEVELS } from '../lib/types'

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  done: { text: 'Done', cls: 'bg-sage-light text-sage-dark' },
  late: { text: 'Late', cls: 'bg-sun-light' },
  missing: { text: 'Missing', cls: 'bg-[#FDECEC] text-[#8E1C20]' },
  assigned: { text: 'Not yet', cls: 'bg-board' },
}

export default function StudentRecord() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data, loading, reload } = useLoad(async () => {
    const [students, classes, awards, homework, statuses, notes, lessons] = await Promise.all([
      api.listStudents(), api.listClasses(), api.listAllAwards(), api.listHomework(), api.listAllHomeworkStatus(), api.listStudentNotes(id), api.listLessons({ includeUnpublished: true }),
    ])
    const student = students.find((s) => s.id === id) ?? null
    if (!student) return null
    const myAwards = awards.filter((a) => a.studentId === id)
    const categories = (await Promise.all([...new Set(myAwards.map((a) => a.classId).concat(student.classId))].map((c) => api.listAwardCategories(c)))).flat()
    return { student, classes, awards: myAwards, categories, homework: homework.filter((h) => h.classId === student.classId), statuses: statuses.filter((s) => s.studentId === id), notes, lessons }
  }, [id])

  const [details, setDetails] = useState({ name: '', classId: '', level: '', contact: '', goals: '', notes: '' })
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState({ date: new Date().toISOString().slice(0, 10), body: '' })
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (data?.student) {
      const s = data.student
      setDetails({ name: s.name, classId: s.classId, level: s.level, contact: s.contact, goals: s.goals, notes: s.notes })
    }
  }, [data?.student])

  if (loading && !data) return <Spinner />
  if (!data) return <Notice tone="error">This student no longer exists. <Link to="/students" className="underline">Back to students</Link></Notice>
  const { student, classes, awards, categories, homework, statuses, notes, lessons } = data
  const cls = classes.find((c) => c.id === student.classId)

  const totalPoints = awards.reduce((t, a) => t + a.points, 0)
  const byCategory = categories
    .map((c) => ({ c, pts: awards.filter((a) => a.categoryId === c.id).reduce((t, a) => t + a.points, 0), n: awards.filter((a) => a.categoryId === c.id).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.pts - a.pts)
  const today = new Date().toISOString().slice(0, 10)
  const due = homework.filter((h) => h.dueDate <= today)
  const handed = due.filter((h) => ['done', 'late'].includes(statuses.find((s) => s.homeworkId === h.id)?.status ?? '')).length
  const lessonTitle = (lid: string | null) => lessons.find((l) => l.id === lid)?.title

  const saveDetails = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null)
    try { await api.saveStudent({ id: student.id, ...details }); setEditing(false); setMsg({ tone: 'success', text: 'Details saved.' }); reload() }
    catch (e2) { setMsg({ tone: 'error', text: errorMessage(e2) }) }
  }
  const addNote = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null)
    try { await api.addStudentNote({ studentId: student.id, date: note.date, body: note.body.trim() }); setNote({ ...note, body: '' }); reload() }
    catch (e2) { setMsg({ tone: 'error', text: errorMessage(e2) }) }
  }
  const removeNote = async (nid: string) => { try { await api.deleteStudentNote(nid); reload() } catch (e) { setMsg({ tone: 'error', text: errorMessage(e) }) } }

  const detailRows: [string, string][] = [
    ['Class', cls?.name ?? ''],
    ['Level', student.level || cls?.level || ''],
    ['Contact', student.contact],
    ['Goals', student.goals],
    ['Notes', student.notes],
    ['Added', formatDate(student.createdAt)],
  ]

  return (
    <div>
      <Seo title={student.name} noindex />
      <Link to="/students" className="text-[15px] font-bold underline underline-offset-2">All students</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold">{student.name}</h1>
          <p className="mt-1 text-inksoft">{cls && <Link to={`/classes/${cls.id}`} className="underline underline-offset-2">{cls.name}</Link>}{(student.level || cls?.level) && `, level ${student.level || cls?.level}`}</p>
        </div>
      </div>

      {msg && <div className="mt-4"><Notice tone={msg.tone}>{msg.text}</Notice></div>}

      <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border-2 border-line bg-line sm:grid-cols-3">
        <div className="bg-white px-5 py-4"><dt className="text-sm text-inksoft">Award points</dt><dd className="font-display text-3xl font-extrabold tabular-nums">{totalPoints}</dd></div>
        <div className="bg-white px-5 py-4"><dt className="text-sm text-inksoft">Homework handed in</dt><dd className="font-display text-3xl font-extrabold tabular-nums">{due.length ? `${handed} of ${due.length}` : 'None due'}</dd></div>
        <div className="bg-white px-5 py-4"><dt className="text-sm text-inksoft">Lesson notes</dt><dd className="font-display text-3xl font-extrabold tabular-nums">{notes.length}</dd></div>
      </dl>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <div className="grid content-start gap-8">
          <section>
            <h2 className="text-2xl font-extrabold">Lesson notes</h2>
            <form onSubmit={addNote} className="panel mt-3 grid gap-3 p-4">
              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <Field label="Date" htmlFor="noteDate"><Input id="noteDate" type="date" required value={note.date} onChange={(e) => setNote({ ...note, date: e.target.value })} /></Field>
                <Field label="Note" htmlFor="noteBody"><Textarea id="noteBody" rows={2} required value={note.body} onChange={(e) => setNote({ ...note, body: e.target.value })} placeholder="What you covered, how they did, what to work on next" /></Field>
              </div>
              <button className="btn-primary justify-self-start" disabled={!note.body.trim()}>Add note</button>
            </form>
            {notes.length === 0 ? <p className="mt-3 text-inksoft">No notes yet. A short note after each lesson builds a useful record over time.</p> : (
              <ol className="mt-4 grid gap-3">
                {notes.map((n) => (
                  <li key={n.id} className="grid gap-1 border-l-[3px] border-brand pl-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-inksoft">{formatDate(n.date)}</p>
                      <button className="text-sm font-bold underline" onClick={() => removeNote(n.id)}>Delete</button>
                    </div>
                    <p className="whitespace-pre-line">{n.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-extrabold">Homework</h2>
            {homework.length === 0 ? <p className="mt-2 text-inksoft">No homework set for {cls?.name ?? 'this class'} yet.</p> : (
              <ul className="mt-3 divide-y-2 divide-line rounded-2xl border-2 border-line bg-white">
                {homework.map((h) => {
                  const st = statuses.find((s) => s.homeworkId === h.id)
                  const label = STATUS_LABEL[st?.status ?? 'assigned']
                  return (
                    <li key={h.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-bold">{h.title}</p>
                        <p className="text-[15px] text-inksoft">Due {formatDate(h.dueDate)}{lessonTitle(h.lessonId) ? `. Lesson: ${lessonTitle(h.lessonId)}` : ''}</p>
                        {st?.feedback && <p className="mt-1 text-[15px]">Feedback: {st.feedback}</p>}
                      </div>
                      <span className={`rounded-md px-2 py-0.5 text-sm font-bold ${label.cls}`}>{label.text}</span>
                    </li>
                  )
                })}
              </ul>
            )}
            {cls && <Link to={`/classes/${cls.id}?tab=homework`} className="mt-2 inline-block text-[15px] font-bold underline underline-offset-4">Update homework for the class</Link>}
          </section>
        </div>

        <div className="grid content-start gap-8">
          <section className="panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold">Details</h2>
              {!editing && <button className="btn-ghost !py-1.5" onClick={() => setEditing(true)}>Edit</button>}
            </div>
            {editing ? (
              <form onSubmit={saveDetails} className="mt-4 grid gap-4">
                <Field label="Name" htmlFor="dName"><Input id="dName" required value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Class" htmlFor="dClass" hint="Moving a student keeps their past awards.">
                    <Select id="dClass" value={details.classId} onChange={(e) => setDetails({ ...details, classId: e.target.value })}>
                      {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Level" htmlFor="dLevel">
                    <Select id="dLevel" value={details.level} onChange={(e) => setDetails({ ...details, level: e.target.value })}>
                      <option value="">Same as class</option>
                      {['A1', ...LEVELS].map((l) => <option key={l}>{l}</option>)}
                    </Select>
                  </Field>
                </div>
                <Field label="Contact" htmlFor="dContact" hint="Student or parent name, email or phone."><Input id="dContact" value={details.contact} onChange={(e) => setDetails({ ...details, contact: e.target.value })} /></Field>
                <Field label="Goals" htmlFor="dGoals"><Textarea id="dGoals" rows={2} value={details.goals} onChange={(e) => setDetails({ ...details, goals: e.target.value })} /></Field>
                <Field label="Private notes" htmlFor="dNotes"><Textarea id="dNotes" rows={3} value={details.notes} onChange={(e) => setDetails({ ...details, notes: e.target.value })} /></Field>
                <div className="flex gap-2"><button className="btn-primary">Save details</button><button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button></div>
              </form>
            ) : (
              <dl className="mt-3 grid gap-3">
                {detailRows.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-sm text-inksoft">{k}</dt>
                    <dd className={`whitespace-pre-line ${v ? '' : 'text-inksoft/70'}`}>{v || 'Not added'}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <section>
            <h2 className="text-xl font-extrabold">Awards</h2>
            {byCategory.length === 0 ? <p className="mt-2 text-inksoft">No awards yet. Give awards from the class scoreboard or while teaching.</p> : (
              <>
                <ul className="mt-3 grid gap-2">
                  {byCategory.map(({ c, pts, n }) => (
                    <li key={c.id} className="flex items-center gap-3">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} aria-hidden="true" />
                      <span className="flex-1">{c.name}</span>
                      <span className="text-[15px] text-inksoft">{n} {n === 1 ? 'time' : 'times'}</span>
                      <span className="w-10 text-right font-bold tabular-nums">{pts}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm font-bold text-inksoft">Latest</p>
                <ul className="mt-1 grid gap-1 text-[15px]">
                  {[...awards].reverse().slice(0, 8).map((a) => (
                    <li key={a.id}>{formatDate(a.createdAt)}: {categories.find((c) => c.id === a.categoryId)?.name ?? 'Award'} +{a.points}{lessonTitle(a.lessonId) ? ` (${lessonTitle(a.lessonId)})` : ''}</li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="panel p-5">
            {confirmDelete ? (
              <div className="grid gap-3">
                <p>Delete {student.name}'s whole record, including notes, awards and homework results? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button className="btn-danger" onClick={async () => { await api.deleteStudent(student.id); navigate('/students', { replace: true }) }}>Delete record</button>
                  <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>Keep it</button>
                </div>
              </div>
            ) : <button className="btn-danger" onClick={() => setConfirmDelete(true)}>Delete student</button>}
          </section>
        </div>
      </div>
    </div>
  )
}
