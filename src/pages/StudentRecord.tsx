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
import { ShowMore } from '../components/ShowMore'
import { PerformanceCard } from '../components/Performance'
import { StudentExams } from '../components/StudentExams'
import { Avatar, AvatarPicker } from '../components/Avatar'
import type { AvatarConfig } from '../lib/avatar'
import { StudentMessages } from '../components/StudentMessages'
import { DiscoveryJournal } from '../components/Discoveries'
import { ExpeditionCard } from '../components/Expedition'
import { expeditionOf } from '../lib/expedition'
import { campOfClass, journeyOf, staysOf, tierOf, TIERS } from '../lib/discoveries'
import { teacherMapPeople } from '../lib/mapPeople'
import { computePerformance, toScoreClasses, toScoreHomework } from '../lib/performance'
import { reviewLabel } from './ClassSession'

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
    const [students, classes, awards, homework, statuses, notes, lessons, sessions, options, exams, examTotals, moves] = await Promise.all([
      api.listStudents(), api.listClasses(), api.listAllAwards(), api.listHomework(), api.listAllHomeworkStatus(), api.listStudentNotes(id), api.listLessons({ includeUnpublished: true }),
      api.listClassSessions(id), api.getBehaviourOptions(), api.listExams(id), api.getExamTotals(), api.listClassMoves(id),
    ])
    const student = students.find((s) => s.id === id) ?? null
    if (!student) return null
    const myAwards = awards.filter((a) => a.studentId === id)
    const categories = (await Promise.all([...new Set(myAwards.map((a) => a.classId).concat(student.classId))].map((c) => api.listAwardCategories(c)))).flat()
    return { student, classes, awards: myAwards, categories, homework: homework.filter((h) => h.studentId === id), statuses: statuses.filter((s) => s.studentId === id), notes, lessons, sessions, options, exams, examTotals, moves }
  }, [id])

  const [details, setDetails] = useState({ name: '', classId: '', level: '', contact: '', goals: '', notes: '' })
  const [editing, setEditing] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [starting, setStarting] = useState(false)
  const [picking, setPicking] = useState(false)
  const [allNotes, setAllNotes] = useState(false)

  useEffect(() => {
    if (data?.student) {
      const s = data.student
      setDetails({ name: s.name, classId: s.classId, level: s.level, contact: s.contact, goals: s.goals, notes: s.notes })
    }
  }, [data?.student])

  if (loading && !data) return <Spinner />
  if (!data) return <Notice tone="error">This student no longer exists. <Link to="/students" className="underline">Back to students</Link></Notice>
  const { student, classes, awards, categories, homework, statuses, notes, lessons, sessions, options, exams, examTotals, moves } = data

  const perf = computePerformance(toScoreClasses(sessions, awards, options), toScoreHomework(student.id, homework, statuses), exams)
  const running = sessions.find((x) => !x.endedAt)
  const cls = classes.find((c) => c.id === student.classId)
  const journey = journeyOf(awards.map((a) => ({ points: a.points, at: a.createdAt })), staysOf(moves), campOfClass(cls?.name, cls?.level), student.id)
  const expedition = expeditionOf(awards.map((a) => ({ points: a.points, at: a.createdAt })), staysOf(moves), campOfClass(cls?.name, cls?.level), student.id)

  const totalPoints = awards.reduce((t, a) => t + a.points, 0)
  const byCategory = categories
    .map((c) => ({ c, pts: awards.filter((a) => a.categoryId === c.id).reduce((t, a) => t + a.points, 0), n: awards.filter((a) => a.categoryId === c.id).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.pts - a.pts)

  const saveDetails = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null)
    try { await api.saveStudent({ id: student.id, ...details }); setEditing(false); setMsg({ tone: 'success', text: 'Details saved.' }); reload() }
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
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <button className="group relative shrink-0 rounded-full" onClick={() => setPicking(true)} aria-label={student.avatar ? 'Change avatar' : 'Choose an avatar'} title={student.avatar ? 'Change avatar' : 'Choose an avatar'}>
            <Avatar avatar={student.avatar} name={student.name} size={80} color={cls?.color} className="ring-4 ring-line transition group-hover:ring-ink/40" />
            <span className="absolute -bottom-1 -right-1 rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-white">{student.avatar ? 'Edit' : 'Add'}</span>
          </button>
          <div>
          <h1 className="text-4xl font-extrabold">{student.name}</h1>
          <p className="mt-1 text-inksoft">{cls && <Link to={`/classes/${cls.id}`} className="underline underline-offset-2">{cls.name}</Link>}{(student.level || cls?.level) && `, level ${student.level || cls?.level}`}</p>
          </div>
        </div>
        {running ? (
          <Link to={`/students/${student.id}/class/${running.id}`} className="btn-sun !px-6 !py-3 text-base">Continue class (started {formatTime(running.startedAt)})</Link>
        ) : (
          <button className="btn-primary !px-6 !py-3 text-base" disabled={starting} onClick={startClass}>{starting ? 'Starting' : 'Start class'}</button>
        )}
      </div>

      {msg && <div className="mt-4"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
      {picking && <AvatarPicker value={student.avatar} name={student.name} onClose={() => setPicking(false)} onSave={async (a: AvatarConfig | null) => {
        try { await api.saveStudent({ id: student.id, classId: student.classId, name: student.name, avatar: a }); setPicking(false); reload() } catch (e) { setMsg({ tone: 'error', text: errorMessage(e) }); setPicking(false) }
      }} />}

      <div className="mt-6"><PerformanceCard perf={perf} name={student.name} /></div>

      <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border-2 border-line bg-line sm:grid-cols-3">
        <div className="bg-white px-5 py-4"><dt className="text-sm text-inksoft">Points to next discovery</dt><dd className="font-display text-3xl font-extrabold tabular-nums">{journey.current} / {journey.needed}</dd><dd className="text-sm text-inksoft">Lifetime {totalPoints}, {journey.unlocked.length} {journey.unlocked.length === 1 ? 'discovery' : 'discoveries'}</dd></div>
        <div className="bg-white px-5 py-4"><dt className="text-sm text-inksoft">Classes taken</dt><dd className="font-display text-3xl font-extrabold tabular-nums">{sessions.filter((x) => x.endedAt).length}</dd></div>
        <div className="bg-white px-5 py-4"><dt className="text-sm text-inksoft">Lesson notes</dt><dd className="font-display text-3xl font-extrabold tabular-nums">{notes.length}</dd></div>
      </dl>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <div className="grid content-start gap-8">
          <section>
            <h2 className="text-2xl font-extrabold">Lesson notes</h2>
            {notes.length === 0 ? <p className="mt-3 text-inksoft">No notes yet. When you end a class, its notes are saved here.</p> : (
              <ol className="mt-4 grid gap-3">
                {(allNotes ? notes : notes.slice(0, 1)).map((n) => (
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
            <ShowMore hidden={notes.length - 1} open={allNotes} onToggle={() => setAllNotes(!allNotes)} what={['note', 'notes']} />
          </section>

          <ClassHistory studentId={student.id} sessions={sessions} lessons={lessons} onChange={reload} />

          {(() => {
            // A hint only: moving up stays the teacher's decision (change the class in Details)
            const here = expedition.summits.filter((x) => x.mountain.camp === expedition.camp).length
            const i = TIERS.findIndex((t) => t.tier === expedition.camp)
            if (here < 2 || i >= TIERS.length - 1 || (perf.score ?? 0) < 75) return null
            return (
              <div className="rounded-2xl border-2 border-sage bg-sage-light/60 p-4 text-[15px]">
                <p className="font-extrabold">Ready to move up?</p>
                <p className="mt-1">{student.name} has summited {here} mountains at {tierOf(expedition.camp).camp} and the overall performance is {perf.score}. If their speaking is ready, move them to a {TIERS[i + 1].tier} class under Details.</p>
              </div>
            )
          })()}
          <ExpeditionCard exp={expedition} name={student.name} loadMap={teacherMapPeople} />

          <DiscoveryJournal journey={journey} name={student.name} />

          <StudentExams studentId={student.id} name={student.name} exams={exams} totals={examTotals} onChange={reload} />

          <section>
            <h2 className="text-2xl font-extrabold">Homework</h2>
            <div className="mt-3">
              <StudentHomework studentId={student.id} classId={student.classId} name={student.name}
                lessons={lessons} onChange={reload} />
            </div>
          </section>
        </div>

        <div className="grid content-start gap-8">
          <StudentMessages studentId={student.id} name={student.name} hasCode={Boolean(student.shareCode)} />
          <SharePanel studentId={student.id} name={student.name} code={student.shareCode} showOnMap={student.showOnMap !== false} showBehaviour={student.showBehaviour} sharedNotes={notes.filter((n) => n.shared).length} onChange={reload} />
          <section className="panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold">Details</h2>
              {!editing && <button className="btn-ghost !py-1.5" onClick={() => setEditing(true)}>Edit</button>}
            </div>
            {editing ? (
              <form onSubmit={saveDetails} className="mt-4 grid gap-4">
                <div className="flex items-center gap-3">
                  <Avatar avatar={student.avatar} name={student.name} size={48} color={cls?.color} />
                  <button type="button" className="btn-ghost !py-1.5" onClick={() => setPicking(true)}>{student.avatar ? 'Change avatar' : 'Choose avatar'}</button>
                </div>
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
                      {LEVELS.map((l) => <option key={l}>{l}</option>)}
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
            {byCategory.length === 0 ? <p className="mt-2 text-inksoft">No awards yet. Give awards during a class.</p> : (
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

function SharePanel({ studentId, name, code, showOnMap, showBehaviour, sharedNotes, onChange }: { studentId: string; name: string; code: string | null; showOnMap: boolean; showBehaviour: boolean; sharedNotes: number; onChange: () => void }) {
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
          <p className="mt-2 text-[15px] text-inksoft">Give {name} (or a parent) a private code to see their profile: points, homework, exams and the notes you choose to share. They can look but not change anything, and can send you messages. No account is needed.</p>
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
          <p className="text-[14px] text-inksoft">They see this profile without the edit buttons: points, homework, exam results, feedback and {sharedNotes === 1 ? '1 shared note' : `${sharedNotes} shared notes`}. Private notes and contact details stay hidden.</p>
          <label className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
            <span>
              <span className="block font-bold">Show attendance and behaviour</span>
              <span className="block text-[13px] text-inksoft">{showBehaviour ? `${name} can see attendance and behaviour from recent classes.` : 'Hidden. Switch on to let them see it.'}</span>
            </span>
            <input type="checkbox" role="switch" aria-label="Show attendance and behaviour" className="h-6 w-6 shrink-0 accent-sage-dark" checked={showBehaviour} disabled={busy}
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
      <label className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
        <span>
          <span className="block font-bold">Show on the mountain map</span>
          <span className="block text-[13px] text-inksoft">{showOnMap ? `Other students can see ${name} on the map.` : `Hidden from other students. ${name} still sees themselves.`}</span>
        </span>
        <input type="checkbox" role="switch" aria-label="Show on the mountain map" className="h-6 w-6 shrink-0 accent-sage-dark" checked={showOnMap} disabled={busy}
          onChange={async (e) => { setBusy(true); setErr(null); try { await api.setStudentShowOnMap(studentId, e.target.checked); onChange() } catch (x) { setErr(errorMessage(x)) } finally { setBusy(false) } }} />
      </label>
    </section>
  )
}

function ClassHistory({ studentId, sessions, lessons, onChange }: { studentId: string; sessions: ClassSession[]; lessons: Lesson[]; onChange: () => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const [all, setAll] = useState(false)
  const [confirm, setConfirm] = useState<string | null>(null)
  const done = sessions.filter((x) => x.endedAt)
  const label = { present: 'Present', late: 'Late', absent: 'Absent' } as const
  const chip = { present: 'bg-sage-light text-sage-dark', late: 'bg-sun-light', absent: 'bg-[#FDECEC] text-[#8E1C20]' } as const
  return (
    <section>
      <h2 className="text-2xl font-extrabold">Class history</h2>
      {done.length === 0 ? <p className="mt-2 text-inksoft">No classes yet. Click Start class at the top when your next lesson begins.</p> : (
        <ul className="mt-3 divide-y-2 divide-line rounded-2xl border-2 border-line bg-white">
          {(all ? done : done.slice(0, 1)).map((x) => {
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
                      {x.review && <span className={`rounded-md px-2 py-0.5 font-bold ${{ yes: 'bg-sage-light text-sage-dark', partly: 'bg-sun-light', no: 'bg-[#FDECEC] text-[#8E1C20]' }[x.review]}`}>{reviewLabel(x.review)}</span>}
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
      <ShowMore hidden={done.length - 1} open={all} onToggle={() => setAll(!all)} what={['class', 'classes']} />
    </section>
  )
}
