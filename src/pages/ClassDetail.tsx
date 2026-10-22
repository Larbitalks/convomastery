import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PerformanceMini } from '../components/Performance'
import { computePerformance, toScoreClasses, toScoreHomework } from '../lib/performance'
import { HOMEWORK_STATES } from '../components/StudentHomework'
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
  ['scores', 'Overview'],
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
        {tab === 'scores' && <Overview classId={cls.id} />}
        {tab === 'students' && <Students classId={cls.id} />}
        {tab === 'homework' && <HomeworkTab classId={cls.id} lessons={data.lessons} />}
        {tab === 'awards' && <AwardCategories classId={cls.id} />}
        {tab === 'settings' && <Settings cls={cls} onSaved={reload} />}
      </div>
    </div>
  )
}

/** One row per student: performance bar and key numbers. Awards are given during a class, not here. */
function Overview({ classId }: { classId: string }) {
  const { data, loading } = useLoad(async () => {
    const [students, awards, homework, statuses, sessions, options] = await Promise.all([
      api.listStudents(classId), api.listAllAwards(), api.listHomework(), api.listAllHomeworkStatus(), api.listAllClassSessions(), api.getBehaviourOptions(),
    ])
    return { students, awards, homework, statuses, sessions, options }
  }, [classId])
  if (loading || !data) return <Spinner />
  if (!data.students.length) return <p className="text-inksoft">No students in this class yet. Add them in the Students tab.</p>
  const today = new Date().toISOString().slice(0, 10)
  const rows = data.students.map((s) => {
    const mine = data.sessions.filter((x) => x.studentId === s.id && x.endedAt).sort((a, b) => b.date.localeCompare(a.date))
    const awards = data.awards.filter((a) => a.studentId === s.id)
    const due = data.homework.filter((h) => h.studentId === s.id && h.dueDate <= today)
    const handed = due.filter((h) => ['done', 'late'].includes(data.statuses.find((x) => x.homeworkId === h.id && x.studentId === s.id)?.status ?? '')).length
    return {
      s, classes: mine.length, last: mine[0]?.date,
      awards: awards.length, points: awards.reduce((t, a) => t + a.points, 0),
      homework: due.length ? `${handed} of ${due.length}` : 'None due',
      perf: computePerformance(toScoreClasses(mine, data.awards, data.options), toScoreHomework(s.id, data.homework, data.statuses)),
    }
  }).sort((a, b) => (b.perf.score ?? -1) - (a.perf.score ?? -1) || a.s.name.localeCompare(b.s.name))

  return (
    <div className="grid max-w-4xl gap-3">
      {rows.map(({ s, classes, last, awards, points, homework, perf }) => (
        <Link key={s.id} to={`/students/${s.id}`} className="rounded-2xl border-2 border-line bg-white p-4 hover:border-ink/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-lg font-bold">{s.name}</span>
            <span className="flex items-center gap-2">
              {perf.band && <span className="text-sm font-bold text-inksoft">{perf.band.label}</span>}
              <PerformanceMini perf={perf} />
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[15px] sm:grid-cols-4">
            <div><dt className="text-sm text-inksoft">Awards</dt><dd className="font-bold tabular-nums">{awards} ({points} {points === 1 ? 'point' : 'points'})</dd></div>
            <div><dt className="text-sm text-inksoft">Homework handed in</dt><dd className="font-bold">{homework}</dd></div>
            <div><dt className="text-sm text-inksoft">Classes</dt><dd className="font-bold tabular-nums">{classes}</dd></div>
            <div><dt className="text-sm text-inksoft">Last class</dt><dd className="font-bold">{last ? formatDate(last) : 'None yet'}</dd></div>
          </dl>
        </Link>
      ))}
      <p className="text-sm text-inksoft">Give awards during a class: open a student and click Start class. Click a student to see their full record.</p>
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

function HomeworkTab({ classId, lessons }: { classId: string; lessons: Lesson[] }) {
  const { data, loading } = useLoad(async () => {
    const [homework, students, statuses] = await Promise.all([api.listHomework(classId), api.listStudents(classId), api.listHomeworkStatus(classId)])
    return { homework, students, statuses }
  }, [classId])
  if (loading || !data) return <Spinner />
  const today = new Date().toISOString().slice(0, 10)
  const label = (state: HomeworkState) => HOMEWORK_STATES.find((s) => s.value === state) ?? HOMEWORK_STATES[0]

  return (
    <div className="grid max-w-4xl gap-6">
      <Notice>Homework is set for each student on their own page. Click a student's name to set or update theirs.</Notice>
      {data.students.length === 0 ? <p className="text-inksoft">Add students to this class first.</p> : (
        <ul className="grid gap-4">
          {data.students.map((s) => {
            const mine = data.homework.filter((h) => h.studentId === s.id).sort((a, b) => b.dueDate.localeCompare(a.dueDate))
            return (
              <li key={s.id} className="panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to={`/students/${s.id}`} className="text-lg font-bold underline underline-offset-2">{s.name}</Link>
                  <Link to={`/students/${s.id}`} className="btn-ghost !py-1.5">Set homework</Link>
                </div>
                {mine.length === 0 ? <p className="mt-2 text-[15px] text-inksoft">No homework yet.</p> : (
                  <ul className="mt-3 grid gap-2">
                    {mine.slice(0, 4).map((h) => {
                      const state = data.statuses.find((x) => x.homeworkId === h.id)?.status ?? 'assigned'
                      const l = label(state)
                      const overdue = state === 'assigned' && h.dueDate < today
                      return (
                        <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 text-[15px]">
                          <span><strong>{h.title}</strong> <span className={overdue ? 'font-bold text-[#8E1C20]' : 'text-inksoft'}>{overdue ? 'overdue, was due' : 'due'} {formatDate(h.dueDate)}</span>{lessons.find((x) => x.id === h.lessonId) ? <span className="text-inksoft">, {lessons.find((x) => x.id === h.lessonId)?.title}</span> : null}</span>
                          <span className={`rounded-md px-2 py-0.5 text-sm font-bold ${l.cls}`}>{l.label}</span>
                        </li>
                      )
                    })}
                    {mine.length > 4 && <li className="text-sm text-inksoft">and {mine.length - 4} more on {s.name}'s page</li>}
                  </ul>
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
