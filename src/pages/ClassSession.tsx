import { useEffect, useMemo, useRef, useState } from 'react'
import { NoteBody } from '../components/NoteBody'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { StudentHomework } from '../components/StudentHomework'
import { Field, Input, Notice, Select, Spinner, Textarea } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { config } from '../lib/config'
import { errorMessage, formatDate, formatTime } from '../lib/format'
import { useLoad } from '../lib/hooks'
import { Seo } from '../lib/seo'
import { DEFAULT_BEHAVIOURS, textOn, type Attendance, type BehaviourMark, type BehaviourOption, type BehaviourType, type ClassSession, type Review } from '../lib/types'
import { teachableLessons } from './ClassDetail'
import { typeOfMark } from '../lib/performance'
import { campOfClass, journeyOf, staysOf, type CampStay, type Found, type Tier } from '../lib/discoveries'
import { DiscoveryReveal } from '../components/Discoveries'
import { ExpeditionReveal, eventsOf, type ExpeditionEvent } from '../components/Expedition'
import { expeditionOf, MILESTONES } from '../lib/expedition'
import { Avatar } from '../components/Avatar'
import { AwardIcon } from '../components/AwardIcon'

const ATTENDANCE: { value: Attendance; label: string; cls: string }[] = [
  { value: 'present', label: 'Present', cls: 'bg-sage-light text-sage-dark border-sage' },
  { value: 'late', label: 'Late', cls: 'bg-sun-light border-sun' },
  { value: 'absent', label: 'Absent', cls: 'bg-[#FDECEC] text-[#8E1C20] border-[#E8A8A8]' },
]
export const REVIEW: { value: Review; label: string; cls: string }[] = [
  { value: 'yes', label: 'Yes', cls: 'bg-sage-light text-sage-dark border-sage' },
  { value: 'partly', label: 'Partly', cls: 'bg-sun-light border-sun' },
  { value: 'no', label: 'No', cls: 'bg-[#FDECEC] text-[#8E1C20] border-[#E8A8A8]' },
]
export const reviewLabel = (r: Review | null) => (r ? { yes: 'Reviewed', partly: 'Partly reviewed', no: 'Did not review' }[r] : 'Not checked')
const TYPES: { value: BehaviourType; label: string }[] = [
  { value: 'positive', label: 'Positive' }, { value: 'neutral', label: 'Neutral' }, { value: 'negative', label: 'Negative' },
]
const PICK_COLOURS = ['#46725D', '#2F7F7A', '#5B6C8F', '#7A5C8C', '#F2CC8F', '#D99A3D', '#9A6A1F', '#B42318', '#8E1C20', '#3D405B']

type Fields = Pick<ClassSession, 'covered' | 'newWords' | 'corrections' | 'notes'>

export function tallyOf(marks: BehaviourMark[]) {
  const m = new Map<string, { label: string; color: string; count: number }>()
  marks.forEach((b) => { const t = m.get(b.label) ?? { label: b.label, color: b.color, count: 0 }; t.count++; m.set(b.label, t) })
  return [...m.values()].sort((a, b) => b.count - a.count)
}

/** Thin bar with one coloured segment per behaviour, sized by how often it was marked */
export function BehaviourBar({ marks, className = '' }: { marks: BehaviourMark[]; className?: string }) {
  const t = tallyOf(marks)
  const total = marks.length
  if (!total) return <div className={`h-2.5 rounded-full bg-board ${className}`} aria-label="No behaviour marked" />
  return (
    <div className={`flex h-2.5 overflow-hidden rounded-full ${className}`} role="img" aria-label={t.map((x) => `${x.label} ${x.count}`).join(', ')}>
      {t.map((x) => <span key={x.label} style={{ width: `${(x.count / total) * 100}%`, backgroundColor: x.color }} />)}
    </div>
  )
}

export default function ClassSessionPage() {
  const { id = '', sessionId = '' } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { data, loading, error } = useLoad(async () => {
    const [session, students, notes, sessions, options, lessons, mine] = await Promise.all([
      api.getClassSession(sessionId), api.listStudents(), api.listStudentNotes(id), api.listClassSessions(id), api.getBehaviourOptions(), teachableLessons(isAdmin), api.listAllClassSessions(),
    ])
    const student = students.find((s) => s.id === id) ?? null
    if (!session || !student) return null
    const [categories, classAwards, allAwards, classes, moves, stars] = await Promise.all([api.listAwardCategories(student.classId), api.listAwards(student.classId), api.listAllAwards(), api.listClasses(), api.listClassMoves(student.id), api.listMonthStars({ studentId: student.id })])
    const cls = classes.find((c) => c.id === student.classId)
    const stays = staysOf(moves), camp = campOfClass(cls?.name, cls?.level)
    // Every award this student has had, in any class, for the discovery journey
    const life = [...allAwards.filter((a) => a.studentId === student.id).map((a) => ({ id: a.id, points: a.points, at: a.createdAt })),
      ...stars.filter((w) => w.bonus > 0).map((w) => ({ id: w.id, points: w.bonus, at: w.createdAt }))].sort((a, b) => a.at.localeCompare(b.at))
    const previous = sessions.find((x) => x.id !== session.id && x.endedAt) ?? null
    // Awards already given during this class (for example before a page reload)
    const given = classAwards
      .filter((a) => a.studentId === student.id && a.createdAt >= session.startedAt && (!session.endedAt || a.createdAt <= session.endedAt))
      .map((a) => ({ id: a.id, categoryId: a.categoryId, name: categories.find((c) => c.id === a.categoryId)?.name ?? 'Award', points: a.points }))
    // The last 6 different lessons taught (any student), newest first
    const recentLessons: string[] = []
    for (const x of [...mine].sort((p, q) => q.startedAt.localeCompare(p.startedAt))) {
      const t = (x.lessonTitle || lessons.find((l) => l.id === x.lessonId)?.title || '').trim()
      if (t && x.id !== session.id && !recentLessons.some((r) => r.toLowerCase() === t.toLowerCase())) recentLessons.push(t)
      if (recentLessons.length === 6) break
    }
    return { session, student, notes, previous, options, lessons, categories, given, life, stays, camp, recentLessons }
  }, [id, sessionId, isAdmin])

  const [s, setS] = useState<ClassSession | null>(null)
  const [life, setLife] = useState<{ id: string; points: number; at: string }[]>([])
  // Celebrations waiting to be shown: new discoveries, milestones, summits and lucky finds
  const [reveal, setReveal] = useState<({ find: Found } | { event: ExpeditionEvent })[]>([])
  const camps = useRef<{ stays: CampStay[]; camp: Tier }>({ stays: [], camp: 'Explorers' })
  const [options, setOptions] = useState<BehaviourOption[]>(DEFAULT_BEHAVIOURS)
  const [burst, setBurst] = useState<{ id: string; key: number } | null>(null)
  const [awardsGiven, setAwardsGiven] = useState<{ id: string; categoryId?: string; name: string; points: number }[]>([])
  const [ending, setEnding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState<'saved' | 'saving' | null>(null)
  const [now, setNow] = useState(Date.now())
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => { if (data) { latest.current = data.session; setS(data.session); setOptions(data.options.map((o) => ({ ...o, type: typeOfMark(o, []) }))); setAwardsGiven(data.given); setLife(data.life); camps.current = { stays: data.stays, camp: data.camp } } }, [data])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  // Every change updates the screen at once and is saved; typing is grouped so nothing is lost
  const latest = useRef<ClassSession | null>(null)
  const pending = useRef<Partial<ClassSession>>({})
  useEffect(() => { latest.current = s }, [s])
  const flush = async () => {
    const id = latest.current?.id
    const p = pending.current
    pending.current = {}
    if (!id || !Object.keys(p).length) return
    setSaved('saving')
    try { await api.updateClassSession(id, p); setSaved('saved') } catch (e) { setErr(errorMessage(e)); setSaved(null) }
  }
  const patch = (p: Partial<ClassSession>, debounce = false) => {
    if (!latest.current) return
    latest.current = { ...latest.current, ...p }
    setS(latest.current)
    pending.current = { ...pending.current, ...p }
    clearTimeout(timer.current)
    if (debounce) timer.current = setTimeout(flush, 700)
    else flush()
  }
  // Save anything still waiting when leaving the page
  useEffect(() => () => { clearTimeout(timer.current); flush() }, [])

  if (loading && !s) return <Spinner label="Opening the class" />
  if (error || !data || !s) return <Notice tone="error">{error ?? 'This class no longer exists.'} <Link to={`/students/${id}`} className="underline">Back to the student</Link></Notice>
  const { student, notes, previous, lessons, categories } = data
  const finished = Boolean(s.endedAt)
  const elapsedMin = Math.max(0, Math.round(((s.endedAt ? new Date(s.endedAt).getTime() : now) - new Date(s.startedAt).getTime()) / 60000))
  const elapsed = `${Math.floor(elapsedMin / 60) ? `${Math.floor(elapsedMin / 60)} h ` : ''}${elapsedMin % 60} min`
  const lesson = lessons.find((l) => l.id === s.lessonId)
  const lessonName = s.lessonTitle || lesson?.title || ''

  const mark = (o: BehaviourOption) => patch({ behaviour: [...(latest.current?.behaviour ?? []), { label: o.label, color: o.color, at: new Date().toISOString(), type: o.type ?? 'neutral' }] })
  const undoMark = () => patch({ behaviour: (latest.current?.behaviour ?? []).slice(0, -1) })
  const give = async (categoryId: string, name: string) => {
    setBurst((b) => ({ id: categoryId, key: (b?.key ?? 0) + 1 }))
    try {
      const a = await api.giveAward({ classId: student.classId, studentId: student.id, categoryId, lessonId: s.lessonId })
      setAwardsGiven((x) => [...x, { id: a.id, categoryId, name, points: a.points }])
      // Celebrate any discovery this award unlocks
      setLife((prev) => {
        const next = [...prev, { id: a.id, points: a.points, at: a.createdAt }]
        const { stays, camp } = camps.current
        const seed = data?.student.id ?? ''
        const before = journeyOf(prev, stays, camp, seed).unlocked.length, j = journeyOf(next, stays, camp, seed)
        const eBefore = eventsOf(expeditionOf(prev, stays, camp, seed)).length, ev = eventsOf(expeditionOf(next, stays, camp, seed))
        const add = [...j.unlocked.slice(before).map((f) => ({ find: f })), ...ev.slice(eBefore).sort((a, b) => (a.kind === 'summit' ? 1 : 0) - (b.kind === 'summit' ? 1 : 0)).map((e) => ({ event: e }))]
        if (add.length) setReveal((r) => [...r, ...add])
        return next
      })
    } catch (e) { setErr(errorMessage(e)) }
  }
  const undoAward = async () => {
    const last = awardsGiven[awardsGiven.length - 1]
    if (!last) return
    try { await api.undoAward(last.id); setAwardsGiven((x) => x.slice(0, -1)); setLife((x) => x.filter((a) => a.id !== last.id)) } catch (e) { setErr(errorMessage(e)) }
  }

  return (
    <div>
      <Seo title={`Class with ${student.name}`} noindex />
      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b-2 border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Avatar avatar={student.avatar} name={student.name} size={48} />
          <div className="min-w-0">
            <Link to={`/students/${student.id}`} className="text-sm font-bold underline underline-offset-2">{student.name}'s profile</Link>
            <h1 className="text-2xl font-extrabold">Class with {student.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="sessionDate" className="text-sm text-inksoft">Date</label>
            <Input id="sessionDate" type="date" className="!w-auto !py-1.5" value={s.date} onChange={(e) => e.target.value && patch({ date: e.target.value })} />
          </div>
          <div className="rounded-full bg-board px-4 py-1.5 font-display text-lg font-extrabold tabular-nums" aria-label="Time in class">{elapsed}</div>
          <div className="flex gap-1" role="group" aria-label="Attendance">
            {ATTENDANCE.map((a) => (
              <button key={a.value} aria-pressed={s.attendance === a.value} onClick={() => patch({ attendance: a.value })}
                className={`rounded-full border-2 px-3 py-1 text-sm font-bold ${s.attendance === a.value ? a.cls : 'border-line text-inksoft'}`}>{a.label}</button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-inksoft" aria-live="polite">{saved === 'saving' ? 'Saving' : saved === 'saved' ? 'All changes saved' : ''}</span>
            {!finished && !ending && <button className="btn-primary" onClick={async () => { clearTimeout(timer.current); await flush(); setEnding(true) }}>End class</button>}
          </div>
        </div>
      </div>

      {err && <div className="mb-4"><Notice tone="error">{err}</Notice></div>}

      {ending || finished ? (
        <EndSummary session={s} studentName={student.name} lessonTitle={lessonName || undefined} elapsed={elapsed} awards={awardsGiven}
          onBack={() => setEnding(false)} onSaved={() => navigate(`/students/${student.id}`)} studentId={student.id} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="grid content-start gap-8">
            <section className="rounded-2xl border-2 border-line p-4">
              <h2 className="text-xl font-extrabold">Review</h2>
              <p className="mt-1 text-[15px] text-inksoft">Did {student.name} review last lesson? Ask them to tell you what they remember.</p>
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Reviewed last lesson">
                {REVIEW.map((r) => (
                  <button key={r.value} aria-pressed={s.review === r.value} onClick={() => patch({ review: s.review === r.value ? null : r.value })}
                    className={`rounded-full border-2 px-5 py-2 font-bold ${s.review === r.value ? r.cls : 'border-line text-inksoft'}`}>{r.label}</button>
                ))}
              </div>
            </section>

            <section>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-extrabold">Behaviour</h2>
                <div className="flex gap-3 text-sm font-bold">
                  {s.behaviour.length > 0 && <button className="underline" onClick={undoMark}>Undo last</button>}
                  <button className="underline" onClick={() => setEditing(!editing)}>{editing ? 'Close' : 'Edit buttons'}</button>
                </div>
              </div>
              <p className="mt-1 text-[15px] text-inksoft">Click whenever you notice something. Each click is saved with the time.</p>
              {editing ? <BehaviourEditor options={options} onSave={async (o) => { await api.saveBehaviourOptions(o); setOptions(o); setEditing(false) }} /> : (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {options.map((o) => {
                    const n = s.behaviour.filter((b) => b.label === o.label).length
                    return (
                      <button key={o.label} onClick={() => mark(o)} className="relative rounded-2xl px-4 py-4 text-left font-bold shadow-sm transition-transform active:scale-[0.97]"
                        style={{ backgroundColor: o.color, color: textOn(o.color) }}>
                        {o.label}
                        {n > 0 && <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 text-sm text-ink tabular-nums">{n}</span>}
                      </button>
                    )
                  })}
                </div>
              )}
              {s.behaviour.length > 0 && (
                <p className="mt-3 text-sm text-inksoft">
                  Last: {s.behaviour.slice(-3).reverse().map((b) => `${b.label} at ${formatTime(b.at)}`).join(', ')}
                </p>
              )}
            </section>

            <section>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-extrabold">Awards</h2>
                {awardsGiven.length > 0 && <button className="text-sm font-bold underline" onClick={undoAward}>Undo last award</button>}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:flex sm:flex-nowrap">
                {categories.map((c) => {
                  const n = awardsGiven.filter((x) => x.categoryId === c.id).length
                  return (
                    <button key={c.id} onClick={(e) => { bounce(e.currentTarget); give(c.id, c.name) }} title={`${c.name} +${c.points}`}
                      className={`relative flex w-full min-w-0 flex-col items-center gap-1 rounded-2xl sm:flex-1 border-2 bg-white px-2 pb-2 pt-3 text-center font-bold shadow-sm transition-transform hover:-translate-y-0.5 active:scale-95`}
                      style={{ borderColor: c.color, color: c.color }}>
                      {burst?.id === c.id && <AwardBurst key={burst.key} color={c.color} points={c.points} />}
                      <span key={burst?.id === c.id ? burst.key : 0} className={`relative grid h-14 w-14 place-items-center rounded-full ${burst?.id === c.id ? 'award-icon' : ''}`} style={{ backgroundColor: `${c.color}1F` }}><AwardIcon name={c.name} className="h-9 w-9" /></span>
                      <span className="text-[13px] leading-tight">{c.name}</span>
                      <span className="rounded-full px-2 text-[12px] text-white" style={{ backgroundColor: c.color }}>+{c.points}</span>
                      {n > 0 && <span className="absolute right-1.5 top-1.5 rounded-full bg-ink px-1.5 text-[11px] text-white tabular-nums">{n}</span>}
                    </button>
                  )
                })}
              </div>
              {(() => {
                const j = journeyOf(life, camps.current.stays, camps.current.camp, student.id)
                const e = expeditionOf(life, camps.current.stays, camps.current.camp, student.id)
                const stop = Math.min(4, Math.floor(e.steps / (e.cost / 5)))
                const total = life.reduce((t, a) => t + a.points, 0)
                const thisClass = awardsGiven.reduce((t, a) => t + a.points, 0)
                const toStop = Math.ceil((stop + 1) * (e.cost / 5) - e.steps)
                return (
                  <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-2xl border-2 border-line bg-white sm:grid-cols-4">
                    <div className="border-b-2 border-r-2 border-line px-4 py-3 sm:border-b-0">
                      <p className="text-sm font-bold text-inksoft">Total points</p>
                      <p className="font-display text-4xl font-extrabold tabular-nums">{total}</p>
                    </div>
                    <div className="border-b-2 border-line px-4 py-3 sm:border-b-0 sm:border-r-2">
                      <p className="text-sm font-bold text-inksoft">This class</p>
                      <p className="font-display text-4xl font-extrabold tabular-nums text-sage-dark">+{thisClass}</p>
                    </div>
                    <div className="border-r-2 border-line px-4 py-3">
                      <p className="text-sm font-bold text-inksoft">Next discovery</p>
                      <p className="font-display text-2xl font-extrabold tabular-nums">{j.current} <span className="text-base text-inksoft">/ {j.needed}</span></p>
                      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-board" role="progressbar" aria-label="Points to next discovery" aria-valuenow={j.current} aria-valuemin={0} aria-valuemax={j.needed}>
                        <div className="h-full rounded-full bg-[#E9B949] transition-all duration-500" style={{ width: `${Math.min(100, (j.current / Math.max(1, j.needed)) * 100)}%` }} />
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-sm font-bold text-inksoft">Expedition</p>
                      <p className="font-display text-2xl font-extrabold tabular-nums">{toStop} <span className="text-base text-inksoft">{toStop === 1 ? 'step' : 'steps'}</span></p>
                      <p className="text-[13px] leading-snug text-inksoft">to {MILESTONES[stop]} on <strong className="text-ink">{e.mountain.name}</strong></p>
                    </div>
                  </div>
                )
              })()}
            </section>

            <section>
              <h2 className="text-xl font-extrabold">Notes</h2>
              <p className="mt-1 text-[15px] text-inksoft">Saved as you type. At the end they become a lesson note on {student.name}'s profile.</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {([
                  ['covered', 'Covered today', 'Sections or topics, e.g. warm-up, vocabulary, debate'],
                  ['newWords', 'New words', 'situation, option, suitable'],
                  ['corrections', 'Say it better', 'I am agree > I agree'],
                  ['notes', 'Other notes', 'Anything to remember for next time'],
                ] as [keyof Fields, string, string][]).map(([k, label, ph]) => (
                  <Field key={k} label={label} htmlFor={`f-${k}`}>
                    <Textarea id={`f-${k}`} rows={4} value={s[k]} placeholder={ph} onChange={(e) => patch({ [k]: e.target.value } as Partial<ClassSession>, true)} />
                  </Field>
                ))}
              </div>
            </section>
          </div>

          <aside className="grid content-start gap-6">
            <section className="panel p-5">
              <h2 className="text-lg font-extrabold">Lesson</h2>
              <LessonBox value={lessonName} recent={data.recentLessons} lessons={lessons} onChange={(title) => {
                // A name that matches a lesson on the website links to it, so its slides can be opened
                const match = lessons.find((l) => l.title.trim().toLowerCase() === title.trim().toLowerCase())
                patch({ lessonTitle: title, lessonId: match?.id ?? null }, true)
              }} />
              {lesson && <a href={`${config.hashRouter ? '#' : ''}/teach/${lesson.slug}?class=${student.classId}`} target="_blank" rel="noopener noreferrer" className="btn-sun mt-3">Open slides in a new tab</a>}
            </section>

            <section className="panel p-5">
              <h2 className="text-lg font-extrabold">Before you start</h2>
              {student.goals && <p className="mt-2 text-[15px]"><strong>Goals:</strong> {student.goals}</p>}
              {previous ? (
                <div className="mt-3 text-[15px]">
                  <p className="font-bold">Last class, {formatDate(previous.date)}</p>
                  <BehaviourBar marks={previous.behaviour} className="mt-1.5" />
                  {previous.covered && <p className="mt-2"><span className="text-inksoft">Covered:</span> {previous.covered}</p>}
                  {previous.newWords && <p><span className="text-inksoft">New words:</span> {previous.newWords}</p>}
                  {previous.corrections && <p><span className="text-inksoft">Say it better:</span> {previous.corrections}</p>}
                  {previous.notes && <p><span className="text-inksoft">Notes:</span> {previous.notes}</p>}
                </div>
              ) : notes[0] ? (
                <div className="mt-3 text-[15px]">
                  <p className="font-bold">Latest note, {formatDate(notes[0].date)}</p>
                  <NoteBody text={notes[0].body} className="mt-1" />
                </div>
              ) : <p className="mt-2 text-[15px] text-inksoft">This is your first class with {student.name} on the website.</p>}
            </section>

            <section className="panel p-5">
              <h2 className="text-lg font-extrabold">Homework</h2>
              <p className="mt-1 text-[15px] text-inksoft">Check last homework and set the next one.</p>
              <div className="mt-3"><StudentHomework studentId={student.id} classId={student.classId} name={student.name} lessons={lessons} /></div>
            </section>
          </aside>
        </div>
      )}
      {reveal.length > 0 && ('find' in reveal[0]
        ? <DiscoveryReveal found={reveal[0].find} name={student.name} more={reveal.length - 1} onClose={() => setReveal((r) => r.slice(1))} />
        : <ExpeditionReveal event={reveal[0].event} name={student.name} more={reveal.length - 1} onClose={() => setReveal((r) => r.slice(1))} />)}
    </div>
  )
}

function BehaviourEditor({ options, onSave }: { options: BehaviourOption[]; onSave: (o: BehaviourOption[]) => Promise<void> }) {
  const [list, setList] = useState(options)
  const [busy, setBusy] = useState(false)
  const update = (i: number, p: Partial<BehaviourOption>) => setList(list.map((o, j) => (j === i ? { ...o, ...p } : o)))
  return (
    <div className="panel mt-3 grid gap-3 p-4">
      {list.map((o, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <Input aria-label="Button name" className="!w-auto flex-1 min-w-[10rem]" value={o.label} onChange={(e) => update(i, { label: e.target.value })} />
          <div className="flex flex-wrap gap-1" role="group" aria-label={`Colour for ${o.label}`}>
            {PICK_COLOURS.map((c) => (
              <button key={c} type="button" aria-label={c} aria-pressed={o.color === c} onClick={() => update(i, { color: c })}
                className={`h-7 w-7 rounded-full border-[3px] ${o.color === c ? 'border-ink' : 'border-white ring-1 ring-line'}`} style={{ backgroundColor: c }} />
            ))}
          </div>
          <select aria-label={`Type of ${o.label}`} className="rounded-lg border-2 border-line bg-white px-2 py-1.5 text-sm font-bold" value={o.type ?? 'neutral'}
            onChange={(e) => update(i, { type: e.target.value as BehaviourType })}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button type="button" className="text-sm font-bold underline" onClick={() => setList(list.filter((_, j) => j !== i))}>Remove</button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" onClick={() => setList([...list, { label: 'New behaviour', color: '#5B6C8F', type: 'neutral' }])}>Add a button</button>
        <button type="button" className="btn-ghost" onClick={() => setList(DEFAULT_BEHAVIOURS)}>Back to the default buttons</button>
        <button type="button" className="btn-primary" disabled={busy || list.some((o) => !o.label.trim())}
          onClick={async () => { setBusy(true); await onSave(list.map((o) => ({ ...o, label: o.label.trim() }))); setBusy(false) }}>Save buttons</button>
      </div>
      <p className="hint !mt-0">These buttons are used for all your students. The type decides how a click counts in the overall performance score: positive raises it, negative lowers it, neutral doesn't count.</p>
    </div>
  )
}

function EndSummary({ session, studentName, studentId, lessonTitle, elapsed, awards, onBack, onSaved }: {
  session: ClassSession; studentName: string; studentId: string; lessonTitle?: string; elapsed: string
  awards: { name: string; points: number }[]; onBack: () => void; onSaved: () => void
}) {
  const [share, setShare] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const tally = useMemo(() => tallyOf(session.behaviour), [session.behaviour])
  const finished = Boolean(session.endedAt)
  const attendance = ATTENDANCE.find((a) => a.value === session.attendance)!

  const noteText = [
    lessonTitle && `Lesson: ${lessonTitle}`,
    session.attendance !== 'present' && `Attendance: ${attendance.label}`,
    session.covered.trim() && `Covered: ${session.covered.trim()}`,
    session.newWords.trim() && `New words: ${session.newWords.trim()}`,
    session.corrections.trim() && `Say it better: ${session.corrections.trim()}`,
    session.notes.trim() && session.notes.trim(),
  ].filter(Boolean).join('\n')

  const save = async () => {
    setBusy(true); setErr(null)
    try {
      let noteId: string | null = null
      if (noteText) noteId = (await api.addStudentNote({ studentId, date: session.date, body: noteText, shared: share })).id
      await api.updateClassSession(session.id, { endedAt: new Date().toISOString(), noteId })
      onSaved()
    } catch (e) { setErr(errorMessage(e)); setBusy(false) }
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <h2 className="text-3xl font-extrabold">{finished ? 'Class summary' : 'End of class'}</h2>
      {err && <Notice tone="error">{err}</Notice>}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border-2 border-line bg-line sm:grid-cols-5">
        {[['Date', formatDate(session.date)], ['Length', elapsed], ['Attendance', attendance.label], ['Review', reviewLabel(session.review)], ['Awards', `${awards.reduce((t, a) => t + a.points, 0)} points`]].map(([k, v]) => (
          <div key={k} className="bg-white px-4 py-3"><dt className="text-sm text-inksoft">{k}</dt><dd className="font-bold">{v}</dd></div>
        ))}
      </dl>
      <section>
        <h3 className="text-lg font-bold">Behaviour</h3>
        {tally.length === 0 ? <p className="text-inksoft">No behaviour marked.</p> : (
          <>
            <BehaviourBar marks={session.behaviour} className="mt-2" />
            <ul className="mt-3 flex flex-wrap gap-2">
              {tally.map((t) => <li key={t.label} className="rounded-full px-3 py-1 text-sm font-bold" style={{ backgroundColor: t.color, color: textOn(t.color) }}>{t.label} {t.count}</li>)}
            </ul>
          </>
        )}
      </section>
      <section>
        <h3 className="text-lg font-bold">Lesson note</h3>
        {noteText ? <NoteBody text={noteText} className="panel mt-2 p-4" /> : <p className="text-inksoft">No notes written. You can still save the class.</p>}
        {!finished && noteText && (
          <label className="mt-3 flex items-center gap-2 font-bold">
            <input type="checkbox" className="h-5 w-5 accent-sage-dark" checked={share} onChange={(e) => setShare(e.target.checked)} />
            Show this note to {studentName}
          </label>
        )}
        <p className="hint">Behaviour is never added to the note. Whether {studentName} sees behaviour is set on their profile.</p>
      </section>
      {!finished && (
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary !px-6 !py-3" disabled={busy} onClick={save}>{busy ? 'Saving' : 'Save and finish class'}</button>
          <button className="btn-ghost !py-3" onClick={onBack}>Back to the class</button>
        </div>
      )}
    </div>
  )
}

/** Type the lesson, or pick one of the last 6 taught (shown when the box is clicked). Website lessons also match as you type. */
function LessonBox({ value, recent, lessons, onChange }: { value: string; recent: string[]; lessons: { id: string; title: string }[]; onChange: (title: string) => void }) {
  const [text, setText] = useState(value)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  useEffect(() => { setText(value) }, [value])
  const q = text.trim().toLowerCase()
  const options = (q
    ? [...recent, ...lessons.map((l) => l.title)].filter((t, i, all) => t.toLowerCase().includes(q) && t.toLowerCase() !== q && all.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i)
    : recent).slice(0, 6)
  const pick = (t: string) => { setText(t); onChange(t); setOpen(false); setActive(-1) }
  return (
    <div className="relative mt-2">
      <Input aria-label="Lesson taught" placeholder="Type the lesson, e.g. Unit 3: Food" value={text} maxLength={200} autoComplete="off"
        role="combobox" aria-expanded={open && options.length > 0} aria-controls="lesson-options"
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { setText(e.target.value); onChange(e.target.value); setOpen(true); setActive(-1) }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)) }
          else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(options[active]) }
          else if (e.key === 'Escape') setOpen(false)
        }} />
      {open && options.length > 0 && (
        <ul id="lesson-options" role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border-2 border-line bg-white shadow-lg">
          {!q && <li className="px-3 pt-2 text-[12px] font-bold uppercase tracking-wide text-inksoft">Recent lessons</li>}
          {options.map((t, i) => (
            <li key={t} role="option" aria-selected={i === active}>
              <button type="button" className={`block w-full px-3 py-2 text-left text-[15px] hover:bg-board ${i === active ? 'bg-board' : ''}`}
                onMouseDown={(e) => e.preventDefault()} onClick={() => pick(t)}>{t}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const bounce = (el: HTMLElement) => {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  el.animate?.([
    { transform: 'scale(1)' }, { transform: 'scale(.88)', offset: .2 }, { transform: 'scale(1.12) rotate(-2deg)', offset: .5 },
    { transform: 'scale(.97) rotate(1deg)', offset: .78 }, { transform: 'scale(1)' },
  ], { duration: 550, easing: 'ease-out' })
}

/** A quick celebration over an award tile: a ring, coloured sparks and the points floating up */
function AwardBurst({ color, points }: { color: string; points: number }) {
  const sparks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2 + (i % 2 ? 0.2 : 0)
    const dist = 46 + (i % 3) * 14
    return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist - 10, rot: (i % 2 ? 1 : -1) * (90 + i * 20), round: i % 3 !== 0, c: i % 4 === 1 ? '#F2CC8F' : i % 4 === 3 ? '#E07A5F' : color }
  })
  return (
    <span className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      <span className="award-ring absolute left-1/2 top-[2.6rem] -ml-7 -mt-7 h-14 w-14 rounded-full border-4" style={{ borderColor: color }} />
      {sparks.map((p, i) => (
        <span key={i} className={`award-spark absolute left-1/2 top-[2.6rem] h-3 ${p.round ? 'w-3 rounded-full' : 'w-2 rounded-sm'}`}
          style={{ backgroundColor: p.c, ['--dx' as string]: `${p.dx}px`, ['--dy' as string]: `${p.dy}px`, ['--rot' as string]: `${p.rot}deg` }} />
      ))}
      <span className="award-float absolute left-1/2 top-0 rounded-full px-2.5 py-0.5 text-base font-extrabold text-white shadow-md" style={{ backgroundColor: color }}>+{points}</span>
    </span>
  )
}
