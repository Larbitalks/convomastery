import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { StudentHomework } from '../components/StudentHomework'
import { Field, Input, Notice, Select, Spinner, Textarea } from '../components/ui'
import { api } from '../lib/api'
import { errorMessage, formatDate, formatTime } from '../lib/format'
import { useLoad } from '../lib/hooks'
import { Seo } from '../lib/seo'
import { LEVELS, newShareCode, textOn, type ClassSession, type Lesson } from '../lib/types'
import { BehaviourBar, tallyOf } from './ClassSession'
import { config } from '../lib/config'

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
    const [students, classes, awards, homework, statuses, notes, lessons, sessions] = await Promise.all([
      api.listStudents(), api.listClasses(), api.listAllAwards(), api.listHomework(), api.listAllHomeworkStatus(), api.listStudentNotes(id), api.listLessons({ includeUnpublished: true }),
      api.listClassSessions(id),
    ])
    const student = students.find((s) => s.id === id) ?? null
    if (!student) return null
    const myAwards = awards.filter((a) => a.studentId === id)
    const categories = (await Promise.all([...new Set(myAwards.map((a) => a.classId).concat(student.classId))].map((c) => api.listAwardCategories(c)))).flat()
    return { student, classes, awards: myAwards, categories, homework: homework.filter((h) => h.studentId === id), statuses: statuses.filter((s) => s.studentId === id), notes, lessons, sessions }
  }, [id])

  const [details, setDetails] = useState({ name: '', classId: '', level: '', contact: '', goals: '', notes: '' })
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState({ date: new Date().toISOString().slice(0, 10), body: '', shared: false })
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (data?.student) {
      const s = data.student
      setDetails({ name: s.name, classId: s.classId, level: s.level, contact: s.contact, goals: s.goals, notes: s.notes })
    }
  }, [data?.student])

  if (loading && !data) return <Spinner />
  if (!data) return <Notice tone="error">This student no longer exists. <Link to="/students" className="underline">Back to students</Link></Notice>
  const { student, classes, awards, categories, homework, statuses, notes, lessons, sessions } = data
  const running = sessions.find((x) => !x.endedAt)
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
    try { await api.addStudentNote({ studentId: student.id, date: note.date, body: note.body.trim(), shared: note.shared }); setNote({ ...note, body: '', shared: false }); reload() }
    catch (e2) { setMsg({ tone: 'error', text: errorMessage(e2) }) }
  }
  const startClass = async () => {
    setStarting(true)
    try { const sess = await api.startClassSession(student); navigate(`/students/${student.id}/class/${sess.id}`) } catch (e) { setMsg({ tone: 'error', text: errorMessage(e) }); setStarting(false) }
  }
  const toggleShared = async (nid: string, shared: boolean) => { try { await api.setNoteShared(nid, shared); reload() } catch (e) { setMsg({ tone: 'error', text: errorMessage(e) }) } }
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
        {running ? (
          <Link to={`/students/${student.id}/class/${running.id}`} className="btn-sun !px-6 !py-3 text-base">Continue class (started {formatTime(running.startedAt)})</Link>
        ) : (
          <button className="btn-primary !px-6 !py-3 text-base" disabled={starting} onClick={startClass}>{starting ? 'Starting' : 'Start class'}</button>
        )}
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-[15px] font-bold">
                  <input type="checkbox" className="h-5 w-5 accent-sage-dark" checked={note.shared} onChange={(e) => setNote({ ...note, shared: e.target.checked })} />
                  Show to student
                </label>
                <button className="btn-primary" disabled={!note.body.trim()}>Add note</button>
              </div>
            </form>
            {notes.length === 0 ? <p className="mt-3 text-inksoft">No notes yet. A short note after each lesson builds a useful record over time.</p> : (
              <ol className="mt-4 grid gap-3">
                {notes.map((n) => (
                  <li key={n.id} className={`grid gap-1 border-l-[3px] pl-4 ${n.shared ? 'border-sage' : 'border-line'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-inksoft">{formatDate(n.date)}</p>
                      <div className="flex items-center gap-3">
                        <button className={`rounded-full px-2.5 py-0.5 text-[13px] font-bold ${n.shared ? 'bg-sage-light text-sage-dark' : 'bg-board text-inksoft'}`}
                          onClick={() => toggleShared(n.id, !n.shared)} aria-pressed={n.shared}
                          title={n.shared ? 'The student can see this note. Click to make it private.' : 'Only you can see this note. Click to show it to the student.'}>
                          {n.shared ? 'Student can see' : 'Private'}
                        </button>
                        <button className="text-sm font-bold underline" onClick={() => removeNote(n.id)}>Delete</button>
                      </div>
                    </div>
                    <p className="whitespace-pre-line">{n.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <ClassHistory studentId={student.id} sessions={sessions} lessons={lessons} onChange={reload} />

          <section>
            <h2 className="text-2xl font-extrabold">Homework</h2>
            <div className="mt-3">
              <StudentHomework studentId={student.id} classId={student.classId} name={student.name}
                lessons={lessons} onChange={reload} />
            </div>
          </section>
        </div>

        <div className="grid content-start gap-8">
          <SharePanel studentId={student.id} name={student.name} code={student.shareCode} showBehaviour={student.showBehaviour} sharedNotes={notes.filter((n) => n.shared).length} onChange={reload} />
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

function SharePanel({ studentId, name, code, showBehaviour, sharedNotes, onChange }: { studentId: string; name: string; code: string | null; showBehaviour: boolean; sharedNotes: number; onChange: () => void }) {
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<'new' | 'off' | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const link = code ? `${window.location.origin}${config.hashRouter ? '/#' : ''}/progress/${code}` : ''
  const set = async (next: string | null) => {
    setBusy(true); setErr(null)
    try { await api.setStudentShareCode(studentId, next); setConfirm(null); onChange() } catch (e) { setErr(errorMessage(e)) } finally { setBusy(false) }
  }
  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 2000) } catch { /* clipboard blocked: the text is selectable */ }
  }
  return (
    <section className={`rounded-2xl border-2 p-5 ${code ? 'border-sage bg-sage-light/50' : 'border-line bg-white'}`}>
      <h2 className="text-xl font-extrabold">Share with {name}</h2>
      {err && <div className="mt-3"><Notice tone="error">{err}</Notice></div>}
      {!code ? (
        <>
          <p className="mt-2 text-[15px] text-inksoft">Give {name} (or a parent) a private code to see their points, homework and the notes you choose to share. They can look but not change anything, and no account is needed.</p>
          <button className="btn-primary mt-4" disabled={busy} onClick={() => set(newShareCode())}>{busy ? 'Creating' : 'Create a progress code'}</button>
        </>
      ) : (
        <div className="mt-3 grid gap-3">
          <div>
            <p className="text-sm text-inksoft">Code</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="select-all rounded-lg bg-white px-3 py-1.5 font-display text-xl font-extrabold tracking-wider">{code}</code>
              <button className="btn-ghost !py-1.5" onClick={() => copy(code, 'code')}>{copied === 'code' ? 'Copied' : 'Copy code'}</button>
            </div>
          </div>
          <div>
            <p className="text-sm text-inksoft">Or send this link</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 max-w-full select-all break-all rounded-lg bg-white px-3 py-1.5 text-[14px]">{link}</span>
              <button className="btn-ghost !py-1.5" onClick={() => copy(link, 'link')}>{copied === 'link' ? 'Copied' : 'Copy link'}</button>
            </div>
          </div>
          <p className="text-[14px] text-inksoft">They see their points, homework and feedback, and {sharedNotes === 1 ? '1 shared note' : `${sharedNotes} shared notes`}. Private notes and contact details stay hidden.</p>
          <label className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
            <span>
              <span className="block font-bold">Show attendance and behaviour</span>
              <span className="block text-[13px] text-inksoft">{showBehaviour ? `${name} can see attendance and behaviour from recent classes.` : 'Hidden. Switch on to let them see it.'}</span>
            </span>
            <input type="checkbox" role="switch" className="h-6 w-6 shrink-0 accent-sage-dark" checked={showBehaviour} disabled={busy}
              onChange={async (e) => { setBusy(true); setErr(null); try { await api.setStudentShowBehaviour(studentId, e.target.checked); onChange() } catch (x) { setErr(errorMessage(x)) } finally { setBusy(false) } }} />
          </label>
          <div className="flex flex-wrap gap-3">
            <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm font-bold underline">See what they see</a>
            {confirm === null && <>
              <button className="text-sm font-bold underline" onClick={() => setConfirm('new')}>Make a new code</button>
              <button className="text-sm font-bold underline" onClick={() => setConfirm('off')}>Turn off</button>
            </>}
          </div>
          {confirm && (
            <div className="rounded-xl bg-white p-3 text-[15px]">
              <p>{confirm === 'new' ? 'The old code and link will stop working. Make a new one?' : `${name} will no longer be able to see their progress. Turn it off?`}</p>
              <div className="mt-2 flex gap-2">
                <button className={confirm === 'off' ? 'btn-danger !py-1.5' : 'btn-primary !py-1.5'} disabled={busy} onClick={() => set(confirm === 'new' ? newShareCode() : null)}>{confirm === 'new' ? 'Make new code' : 'Turn off'}</button>
                <button className="btn-ghost !py-1.5" onClick={() => setConfirm(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function ClassHistory({ studentId, sessions, lessons, onChange }: { studentId: string; sessions: ClassSession[]; lessons: Lesson[]; onChange: () => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const done = sessions.filter((x) => x.endedAt)
  const label = { present: 'Present', late: 'Late', absent: 'Absent' } as const
  const chip = { present: 'bg-sage-light text-sage-dark', late: 'bg-sun-light', absent: 'bg-[#FDECEC] text-[#8E1C20]' } as const
  return (
    <section>
      <h2 className="text-2xl font-extrabold">Class history</h2>
      {done.length === 0 ? <p className="mt-2 text-inksoft">No classes yet. Click Start class at the top when your next lesson begins.</p> : (
        <ul className="mt-3 divide-y-2 divide-line rounded-2xl border-2 border-line bg-white">
          {done.map((x) => {
            const mins = Math.round((new Date(x.endedAt!).getTime() - new Date(x.startedAt).getTime()) / 60000)
            const lesson = lessons.find((l) => l.id === x.lessonId)
            const isOpen = open === x.id
            return (
              <li key={x.id} className="p-4">
                <button className="grid w-full gap-2 text-left" onClick={() => setOpen(isOpen ? null : x.id)} aria-expanded={isOpen}>
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold">{formatDate(x.date)}{lesson ? <span className="font-normal text-inksoft">, {lesson.title}</span> : null}</span>
                    <span className="flex items-center gap-2 text-sm">
                      <span className={`rounded-md px-2 py-0.5 font-bold ${chip[x.attendance]}`}>{label[x.attendance]}</span>
                      <span className="text-inksoft">{mins} min</span>
                    </span>
                  </span>
                  <BehaviourBar marks={x.behaviour} />
                </button>
                {isOpen && (
                  <div className="mt-3 grid gap-1 text-[15px]">
                    {tallyOf(x.behaviour).length > 0 && (
                      <ul className="mb-2 flex flex-wrap gap-1.5">
                        {tallyOf(x.behaviour).map((t) => <li key={t.label} className="rounded-full px-2.5 py-0.5 text-[13px] font-bold" style={{ backgroundColor: t.color, color: textOn(t.color) }}>{t.label} {t.count}</li>)}
                      </ul>
                    )}
                    {x.covered && <p><span className="text-inksoft">Covered:</span> {x.covered}</p>}
                    {x.newWords && <p><span className="text-inksoft">New words:</span> {x.newWords}</p>}
                    {x.corrections && <p><span className="text-inksoft">Say it better:</span> {x.corrections}</p>}
                    {x.notes && <p><span className="text-inksoft">Notes:</span> {x.notes}</p>}
                    <div className="mt-2 flex gap-3 text-sm font-bold">
                      <Link to={`/students/${studentId}/class/${x.id}`} className="underline">Open summary</Link>
                      {confirm === x.id ? (
                        <span>Delete this class record? <button className="text-coral underline" onClick={async () => { await api.deleteClassSession(x.id); setConfirm(null); onChange() }}>Delete</button> <button className="underline" onClick={() => setConfirm(null)}>Keep</button></span>
                      ) : <button className="underline" onClick={() => setConfirm(x.id)}>Delete</button>}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
