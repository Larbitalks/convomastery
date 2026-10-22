import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AwardBoard } from '../components/AwardBoard'
import { Field, Input, Notice, Select, Spinner, Textarea } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { errorMessage, formatDate } from '../lib/format'
import { useLoad } from '../lib/hooks'
import { Seo } from '../lib/seo'
import { LEVELS, type ClassGroup, type HomeworkState, type Lesson } from '../lib/types'
import { CLASS_COLORS } from './Classes'

/** Lessons this person can teach: the ones they own, or all of them for the admin. */
export async function teachableLessons(isAdmin: boolean): Promise<Lesson[]> {
  const [lessons, purchases] = await Promise.all([api.listLessons({ includeUnpublished: isAdmin }), api.listMyPurchases()])
  const owned = new Set(purchases.map((p) => p.lessonId))
  return lessons.filter((l) => isAdmin || owned.has(l.id)).sort((a, b) => a.title.localeCompare(b.title))
}

const TABS = [
  ['scores', 'Scoreboard'],
  ['students', 'Students'],
  ['homework', 'Homework'],
  ['awards', 'Award categories'],
  ['settings', 'Class settings'],
] as const

export default function ClassDetail() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const { isAdmin } = useAuth()
  const tab = (params.get('tab') ?? 'scores') as (typeof TABS)[number][0]
  const { data, loading, reload } = useLoad(async () => {
    const [classes, lessons] = await Promise.all([api.listClasses(), teachableLessons(isAdmin)])
    return { cls: classes.find((c) => c.id === id) ?? null, lessons }
  }, [id, isAdmin])
  const [lessonSlug, setLessonSlug] = useState('')
  const navigate = useNavigate()

  if (loading) return <Spinner />
  if (!data?.cls) return <Notice tone="error">This class no longer exists. <Link to="/classes" className="underline">Back to classes</Link></Notice>
  const cls = data.cls

  return (
    <div>
      <Seo title={cls.name} noindex />
      <Link to="/classes" className="text-[15px] font-bold underline underline-offset-2">All classes</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-10 w-3 rounded-full" style={{ backgroundColor: cls.color }} aria-hidden="true" />
          <div>
            <h1 className="text-3xl font-extrabold">{cls.name}</h1>
            <p className="text-inksoft">Level {cls.level}</p>
          </div>
        </div>
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (lessonSlug) navigate(`/teach/${lessonSlug}?class=${cls.id}`) }}>
          <div>
            <label htmlFor="teachLesson" className="label">Teach a lesson to this class</label>
            <Select id="teachLesson" className="!w-64" value={lessonSlug} onChange={(e) => setLessonSlug(e.target.value)}>
              <option value="">{data.lessons.length ? 'Choose a lesson' : 'No lessons in your library yet'}</option>
              {data.lessons.map((l) => <option key={l.id} value={l.slug}>{l.title}</option>)}
            </Select>
          </div>
          <button className="btn-sun" disabled={!lessonSlug}>Start lesson</button>
        </form>
      </div>

      <nav className="mt-8 no-scrollbar flex gap-1 overflow-x-auto border-b-2 border-line" aria-label="Class sections">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setParams(k === 'scores' ? {} : { tab: k }, { replace: true })} aria-current={tab === k ? 'page' : undefined}
            className={`-mb-[2px] shrink-0 border-b-[3px] px-4 py-2.5 font-bold ${tab === k ? 'border-brand text-ink' : 'border-transparent text-inksoft hover:text-ink'}`}>{l}</button>
        ))}
      </nav>
      <div className="mt-6">
        {tab === 'scores' && <div className="max-w-3xl"><AwardBoard classId={cls.id} /></div>}
        {tab === 'students' && <Students classId={cls.id} />}
        {tab === 'homework' && <HomeworkTab classId={cls.id} lessons={data.lessons} />}
        {tab === 'awards' && <AwardCategories classId={cls.id} />}
        {tab === 'settings' && <Settings cls={cls} onSaved={reload} />}
      </div>
    </div>
  )
}

function Students({ classId }: { classId: string }) {
  const { data, loading, reload } = useLoad(() => api.listStudents(classId), [classId])
  const [names, setNames] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState({ name: '', notes: '' })
  const [removing, setRemoving] = useState<string | null>(null)

  const add = async (e: FormEvent) => {
    e.preventDefault(); setErr(null)
    const list = names.split(/[\n,]/).map((n) => n.trim()).filter(Boolean)
    try {
      for (const name of list) await api.saveStudent({ classId, name })
      setNames(''); reload()
    } catch (e2) { setErr(errorMessage(e2)) }
  }
  const save = async (id: string) => {
    try { await api.saveStudent({ id, classId, ...draft }); setEditing(null); reload() } catch (e) { setErr(errorMessage(e)) }
  }
  const remove = async (id: string) => {
    try { await api.deleteStudent(id); setRemoving(null); reload() } catch (e) { setErr(errorMessage(e)) }
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <form onSubmit={add} className="panel grid gap-3 p-5">
        <Field label="Add students" htmlFor="newStudents" hint="One name per line, or separate names with commas. Students do not need an account.">
          <Textarea id="newStudents" rows={3} value={names} onChange={(e) => setNames(e.target.value)} placeholder={'Amy\nBen\nChloe'} />
        </Field>
        <button className="btn-primary justify-self-start" disabled={!names.trim()}>Add to class</button>
      </form>
      {err && <Notice tone="error">{err}</Notice>}
      {loading ? <Spinner /> : !data?.length ? <p className="text-inksoft">No students in this class yet.</p> : (
        <ul className="divide-y-2 divide-line rounded-2xl border-2 border-line bg-white">
          {data.map((s) => (
            <li key={s.id} className="p-4">
              {editing === s.id ? (
                <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
                  <Field label="Name" htmlFor={`sn-${s.id}`}><Input id={`sn-${s.id}`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
                  <Field label="Private notes" htmlFor={`snotes-${s.id}`}><Input id={`snotes-${s.id}`} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Strengths, goals, things to remember" /></Field>
                  <div className="flex gap-2"><button className="btn-primary" onClick={() => save(s.id)}>Save</button><button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button></div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/students/${s.id}`} className="font-bold underline underline-offset-2">{s.name}</Link>
                    {s.notes && <p className="text-[15px] text-inksoft">{s.notes}</p>}
                  </div>
                  {removing === s.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[15px]">Remove {s.name} and their awards?</span>
                      <button className="btn-danger !py-1.5" onClick={() => remove(s.id)}>Remove</button>
                      <button className="btn-ghost !py-1.5" onClick={() => setRemoving(null)}>Keep</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Link to={`/students/${s.id}`} className="btn-ghost !py-1.5">Open record</Link>
                      <button className="btn-ghost !py-1.5" onClick={() => { setEditing(s.id); setDraft({ name: s.name, notes: s.notes }) }}>Edit</button>
                      <button className="btn-ghost !py-1.5" onClick={() => setRemoving(s.id)}>Remove</button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const STATES: { value: HomeworkState; label: string; cls: string }[] = [
  { value: 'assigned', label: 'Not yet', cls: 'bg-white' },
  { value: 'done', label: 'Done', cls: 'bg-sage-light' },
  { value: 'late', label: 'Late', cls: 'bg-sun-light' },
  { value: 'missing', label: 'Missing', cls: 'bg-[#FDECEC]' },
]

function HomeworkTab({ classId, lessons }: { classId: string; lessons: Lesson[] }) {
  const { data, loading, reload, setData } = useLoad(async () => {
    const [homework, students, statuses] = await Promise.all([api.listHomework(classId), api.listStudents(classId), api.listHomeworkStatus(classId)])
    return { homework, students, statuses }
  }, [classId])
  const blank = { title: '', instructions: '', dueDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), lessonId: '' }
  const [form, setForm] = useState(blank)
  const [open, setOpen] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const create = async (e: FormEvent) => {
    e.preventDefault(); setErr(null)
    try {
      const h = await api.saveHomework({ classId, title: form.title, instructions: form.instructions, dueDate: form.dueDate, lessonId: form.lessonId || null })
      setForm(blank); setCreating(false); setOpen(h.id); reload()
    } catch (e2) { setErr(errorMessage(e2)) }
  }
  if (loading || !data) return <Spinner />

  const statusOf = (hid: string, sid: string) => data.statuses.find((s) => s.homeworkId === hid && s.studentId === sid)
  const setStatus = async (homeworkId: string, studentId: string, patch: Partial<{ status: HomeworkState; feedback: string }>) => {
    const cur = statusOf(homeworkId, studentId) ?? { homeworkId, studentId, status: 'assigned' as HomeworkState, feedback: '' }
    const next = { ...cur, ...patch }
    setData({ ...data, statuses: [...data.statuses.filter((s) => !(s.homeworkId === homeworkId && s.studentId === studentId)), next] })
    try { await api.setHomeworkStatus(next) } catch (e) { setErr(errorMessage(e)); reload() }
  }
  const remove = async (id: string) => { try { await api.deleteHomework(id); reload() } catch (e) { setErr(errorMessage(e)) } }
  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div className="grid max-w-4xl gap-6">
      {err && <Notice tone="error">{err}</Notice>}
      {creating ? (
        <form onSubmit={create} className="panel grid gap-4 p-5">
          <h2 className="text-lg font-bold">Set homework</h2>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label="Title" htmlFor="hwTitle"><Input id="hwTitle" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sleep diary" /></Field>
            <Field label="Due" htmlFor="hwDue"><Input id="hwDue" type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
          </div>
          <Field label="Instructions" htmlFor="hwInstr"><Textarea id="hwInstr" rows={3} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></Field>
          <Field label="Linked lesson (optional)" htmlFor="hwLesson">
            <Select id="hwLesson" value={form.lessonId} onChange={(e) => setForm({ ...form, lessonId: e.target.value })}>
              <option value="">None</option>
              {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </Select>
          </Field>
          <div className="flex gap-2"><button className="btn-primary">Set homework</button><button type="button" className="btn-ghost" onClick={() => setCreating(false)}>Cancel</button></div>
        </form>
      ) : (
        <button className="btn-primary justify-self-start" onClick={() => setCreating(true)}>Set homework</button>
      )}

      {data.homework.length === 0 ? <p className="text-inksoft">No homework set for this class yet.</p> : (
        <ul className="grid gap-4">
          {data.homework.map((h) => {
            const handed = data.students.filter((s) => ['done', 'late'].includes(statusOf(h.id, s.id)?.status ?? '')).length
            const isOpen = open === h.id
            const lesson = lessons.find((l) => l.id === h.lessonId)
            return (
              <li key={h.id} className="panel">
                <button className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left" onClick={() => setOpen(isOpen ? null : h.id)} aria-expanded={isOpen}>
                  <span>
                    <span className="block text-lg font-bold">{h.title}</span>
                    <span className="text-[15px] text-inksoft">{h.dueDate < todayStr ? 'Was due' : 'Due'} {formatDate(h.dueDate)}{lesson ? `. Lesson: ${lesson.title}` : ''}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="rounded-md bg-board px-2 py-0.5 text-sm font-bold">{handed} of {data.students.length} handed in</span>
                    <span className="font-bold text-brand-dark">{isOpen ? 'Close' : 'Track'}</span>
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t-2 border-line p-4">
                    {h.instructions && <p className="mb-4 whitespace-pre-line text-inksoft">{h.instructions}</p>}
                    {data.students.length === 0 ? <p className="text-inksoft">Add students to this class to track homework.</p> : (
                      <ul className="grid gap-2">
                        {data.students.map((s) => {
                          const st = statusOf(h.id, s.id)
                          const state = st?.status ?? 'assigned'
                          return (
                            <li key={s.id} className="grid items-center gap-2 sm:grid-cols-[140px_auto_1fr]">
                              <span className="font-bold">{s.name}</span>
                              <div className="flex flex-wrap gap-1" role="group" aria-label={`Homework status for ${s.name}`}>
                                {STATES.map((o) => (
                                  <button key={o.value} type="button" aria-pressed={state === o.value} onClick={() => setStatus(h.id, s.id, { status: o.value })}
                                    className={`rounded-full border-2 px-2.5 py-0.5 text-[13px] font-bold ${state === o.value ? `border-ink ${o.cls}` : 'border-line text-inksoft'}`}>{o.label}</button>
                                ))}
                              </div>
                              <Input aria-label={`Feedback for ${s.name}`} className="!py-1.5 text-[15px]" placeholder="Feedback (optional)" defaultValue={st?.feedback ?? ''}
                                onBlur={(e) => { if (e.target.value !== (st?.feedback ?? '')) setStatus(h.id, s.id, { feedback: e.target.value }) }} />
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    <button className="mt-4 text-sm font-bold text-coral underline" onClick={() => remove(h.id)}>Delete this homework</button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function AwardCategories({ classId }: { classId: string }) {
  const { data, loading, reload } = useLoad(() => api.listAwardCategories(classId), [classId])
  const [form, setForm] = useState({ name: '', points: 1 })
  const [err, setErr] = useState<string | null>(null)
  const colors = ['#3D405B', '#46725D', '#7A5C8C', '#9A6A1F', '#2F5D62', '#5B6C8F', '#6B7F3A']

  const add = async (e: FormEvent) => {
    e.preventDefault(); setErr(null)
    try {
      const n = data?.length ?? 0
      await api.saveAwardCategory({ classId, name: form.name, points: form.points, color: colors[n % colors.length], position: n })
      setForm({ name: '', points: 1 }); reload()
    } catch (e2) { setErr(errorMessage(e2)) }
  }
  const update = async (id: string, patch: Partial<{ name: string; points: number; color: string; position: number }>) => {
    const c = data?.find((x) => x.id === id)
    if (!c) return
    try { await api.saveAwardCategory({ ...c, ...patch }); reload() } catch (e) { setErr(errorMessage(e)) }
  }
  const move = async (i: number, dir: -1 | 1) => {
    if (!data) return
    const a = data[i], b = data[i + dir]
    if (!b) return
    try {
      await api.saveAwardCategory({ ...a, position: b.position })
      await api.saveAwardCategory({ ...b, position: a.position })
      reload()
    } catch (e) { setErr(errorMessage(e)) }
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <p className="text-inksoft">These are the awards you can give in this class. Each class has its own list, so you can reward what matters for that group.</p>
      {err && <Notice tone="error">{err}</Notice>}
      {loading ? <Spinner /> : (
        <ul className="grid gap-2">
          {data?.map((c, i) => (
            <li key={c.id} className="panel flex flex-wrap items-center gap-3 p-3">
              <input type="color" aria-label={`Colour for ${c.name}`} value={c.color} onChange={(e) => update(c.id, { color: e.target.value })} className="h-9 w-9 cursor-pointer rounded-lg border-2 border-line" />
              <Input aria-label="Award name" className="!w-auto flex-1 min-w-[10rem]" defaultValue={c.name} onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && update(c.id, { name: e.target.value.trim() })} />
              <Select aria-label={`Points for ${c.name}`} className="!w-auto" value={c.points} onChange={(e) => update(c.id, { points: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>{p} {p === 1 ? 'point' : 'points'}</option>)}
              </Select>
              <div className="flex gap-1">
                <button className="btn-ghost !px-3 !py-1.5" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${c.name} up`}>Up</button>
                <button className="btn-ghost !px-3 !py-1.5" onClick={() => move(i, 1)} disabled={i === data.length - 1} aria-label={`Move ${c.name} down`}>Down</button>
                <button className="btn-danger !px-3 !py-1.5" onClick={async () => { await api.deleteAwardCategory(c.id); reload() }}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="panel grid gap-3 p-5 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
        <Field label="New award" htmlFor="awName"><Input id="awName" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Asked a follow-up question" /></Field>
        <Field label="Points" htmlFor="awPts">
          <Select id="awPts" value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map((p) => <option key={p}>{p}</option>)}</Select>
        </Field>
        <button className="btn-primary">Add award</button>
      </form>
      <p className="hint">Deleting an award category also removes the points already given for it.</p>
    </div>
  )
}

function Settings({ cls, onSaved }: { cls: ClassGroup; onSaved: () => void }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: cls.name, level: cls.level, color: cls.color })
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [confirm, setConfirm] = useState(false)
  const save = async (e: FormEvent) => {
    e.preventDefault()
    try { await api.saveClass({ id: cls.id, ...form }); setMsg({ tone: 'success', text: 'Class saved.' }); onSaved() } catch (e2) { setMsg({ tone: 'error', text: errorMessage(e2) }) }
  }
  return (
    <div className="grid max-w-2xl gap-6">
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <form onSubmit={save} className="panel grid gap-4 p-5">
        <Field label="Class name" htmlFor="setName"><Input id="setName" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Level" htmlFor="setLevel">
          <Select id="setLevel" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>{LEVELS.map((l) => <option key={l}>{l}</option>)}<option>Mixed</option></Select>
        </Field>
        <div>
          <p className="label">Colour</p>
          <div className="flex flex-wrap gap-2">
            {CLASS_COLORS.map((c) => (
              <button type="button" key={c} aria-label={`Colour ${c}`} aria-pressed={form.color === c} onClick={() => setForm({ ...form, color: c })}
                className={`h-8 w-8 rounded-full border-[3px] ring-2 ring-line ${form.color === c ? 'border-sun' : 'border-white'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <button className="btn-primary justify-self-start">Save class</button>
      </form>
      <div className="panel grid gap-3 p-5">
        {confirm ? (
          <>
            <p>Delete {cls.name} with all its students, awards and homework? This cannot be undone.</p>
            <div className="flex gap-2">
              <button className="btn-danger" onClick={async () => { await api.deleteClass(cls.id); navigate('/classes', { replace: true }) }}>Delete class</button>
              <button className="btn-ghost" onClick={() => setConfirm(false)}>Keep it</button>
            </div>
          </>
        ) : <button className="btn-danger justify-self-start" onClick={() => setConfirm(true)}>Delete class</button>}
      </div>
    </div>
  )
}
