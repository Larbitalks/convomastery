import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Input, Notice, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'
import { useLoad } from '../lib/hooks'
import { Seo } from '../lib/seo'
import { DEFAULT_EXAM_TOTALS, textOn, type Exam, type HomeworkState } from '../lib/types'
import { StudentExams } from '../components/StudentExams'
import { MessageThread } from '../components/MessageThread'
import { ShowMore } from '../components/ShowMore'
import { Avatar } from '../components/Avatar'
import { cleanAvatar } from '../lib/avatar'
import { studentMapPeople } from '../lib/mapPeople'
import { DiscoveryJournal, DiscoveryReveal } from '../components/Discoveries'
import { ExpeditionCard, ExpeditionReveal, eventsOf, type ExpeditionEvent } from '../components/Expedition'
import { expeditionOf } from '../lib/expedition'
import { campOfClass, journeyOf, staysOf, type Found } from '../lib/discoveries'
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

/** Read-only copy of the student's profile, opened with the code from the teacher. Only messages can be sent. */
export function ProgressView() {
  const { code = '' } = useParams()
  const { data, loading, error, reload } = useLoad(() => api.getStudentProgress(code), [code])
  const [allNotes, setAllNotes] = useState(false)
  const [allClasses, setAllClasses] = useState(false)
  const [allHw, setAllHw] = useState(false)
  const loadMap = useCallback(() => studentMapPeople(code), [code])

  if (loading && !data) return <Spinner label="Loading your progress" />
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

  const journey = journeyOf(data.awardLog ?? [], staysOf(data.moves ?? []), campOfClass(data.className, data.classLevel ?? data.level), data.seed ?? data.name)
  const expedition = expeditionOf(data.awardLog ?? [], staysOf(data.moves ?? []), campOfClass(data.className, data.classLevel ?? data.level), data.seed ?? data.name)
  const expEvents = eventsOf(expedition)
  const teacher = data.teacherName || 'your teacher'
  const first = teacher.split(/[\s(]/)[0] || 'your teacher'
  const perf = data.classes
    ? computePerformance(data.classes.map((c) => ({ date: c.date, attendance: c.attendance, review: c.review ?? null, points: c.points ?? 0, positive: c.positive ?? 0, negative: c.negative ?? 0 })), data.homework, data.exams ?? [])
    : null
  const exams: Exam[] = (data.exams ?? []).map((e, i) => ({ ...e, id: `e${i}`, studentId: '', createdAt: e.date }))
  const awarded = data.categories.filter((c) => (c.count ?? c.points) > 0).sort((a, b) => b.points - a.points)
  const today = new Date().toISOString().slice(0, 10)
  const toDo = data.homework.filter((h) => h.status === 'assigned' && h.dueDate >= today).length

  return (
    <div className="wrap py-10">
      <Seo title={`${data.name}'s progress`} noindex />
      <p className="text-[15px] text-inksoft">Your progress page</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar avatar={cleanAvatar(data.avatar)} name={data.name} size={80} className="ring-4 ring-line" />
          <div>
            <h1 className="text-4xl font-extrabold">{data.name}</h1>
            <p className="mt-1 text-inksoft">{data.className}{data.level ? `, level ${data.level}` : ''}</p>
          </div>
        </div>
        <a href="#messages" className="btn-primary !px-6 !py-3 text-base">Message {first}</a>
      </div>

      {perf && perf.score !== null && <div className="mt-6"><PerformanceCard perf={perf} name={data.name} /></div>}

      <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border-2 border-line bg-line sm:grid-cols-3">
        <div className="bg-white px-5 py-4"><dt className="text-sm text-inksoft">Points to next discovery</dt><dd className="font-display text-3xl font-extrabold tabular-nums">{journey.current} / {journey.needed}</dd><dd className="text-sm text-inksoft">Lifetime {journey.lifetime}, {journey.unlocked.length} {journey.unlocked.length === 1 ? 'discovery' : 'discoveries'}</dd></div>
        <div className="bg-white px-5 py-4"><dt className="text-sm text-inksoft">Classes taken</dt><dd className="font-display text-3xl font-extrabold tabular-nums">{data.classesTaken ?? 0}</dd></div>
        <div className="bg-white px-5 py-4"><dt className="text-sm text-inksoft">Lesson notes</dt><dd className="font-display text-3xl font-extrabold tabular-nums">{data.notes.length}</dd></div>
      </dl>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <div className="grid min-w-0 content-start gap-8">
          <section>
            <h2 className="text-2xl font-extrabold">Lesson notes</h2>
            {data.notes.length === 0 ? <p className="mt-2 text-inksoft">No notes from {first} yet.</p> : (
              <ol className="mt-4 grid gap-3">
                {(allNotes ? data.notes : data.notes.slice(0, 1)).map((n, i) => (
                  <li key={i} className="grid gap-1 border-l-[3px] border-sage pl-4">
                    <p className="text-sm font-bold text-inksoft">{formatDate(n.date)}</p>
                    <p className="whitespace-pre-line">{n.body}</p>
                  </li>
                ))}
              </ol>
            )}
            <ShowMore hidden={data.notes.length - 1} open={allNotes} onToggle={() => setAllNotes(!allNotes)} what={['note', 'notes']} />
          </section>

          {data.classes && (
            <section>
              <h2 className="text-2xl font-extrabold">Class history</h2>
              {data.classes.length === 0 ? <p className="mt-2 text-inksoft">No classes yet.</p> : (
                <ul className="mt-3 divide-y-2 divide-line rounded-2xl border-2 border-line bg-white">
                  {data.classes.slice(0, allClasses ? 8 : 1).map((c, i) => {
                    const total = c.behaviour.reduce((t, b) => t + b.count, 0)
                    const att = { present: ['Present', 'bg-sage-light text-sage-dark'], late: ['Late', 'bg-sun-light'], absent: ['Absent', 'bg-[#FDECEC] text-[#8E1C20]'] }[c.attendance]
                    return (
                      <li key={i} className="grid gap-2 p-4">
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold">{formatDate(c.date)}{c.lesson ? <span className="font-normal text-inksoft">, {c.lesson}</span> : null}</span>
                          <span className="flex flex-wrap items-center gap-2 text-sm">
                            <span className={`rounded-md px-2 py-0.5 font-bold ${att[1]}`}>{att[0]}</span>
                            {c.review && <span className={`rounded-md px-2 py-0.5 font-bold ${{ yes: 'bg-sage-light text-sage-dark', partly: 'bg-sun-light', no: 'bg-[#FDECEC] text-[#8E1C20]' }[c.review]}`}>{{ yes: 'Reviewed', partly: 'Partly reviewed', no: 'Did not review' }[c.review]}</span>}
                            {typeof c.minutes === 'number' && <span className="text-inksoft">{c.minutes} min</span>}
                          </span>
                        </span>
                        {total > 0 ? (
                          <>
                            <div className="flex h-2.5 overflow-hidden rounded-full" aria-hidden="true">
                              {c.behaviour.map((b) => <span key={b.label} style={{ width: `${(b.count / total) * 100}%`, backgroundColor: b.color }} />)}
                            </div>
                            <ul className="flex flex-wrap gap-1.5">
                              {c.behaviour.map((b) => <li key={b.label} className="rounded-full px-2.5 py-0.5 text-[13px] font-bold" style={{ backgroundColor: b.color, color: textOn(b.color) }}>{b.label} {b.count}</li>)}
                            </ul>
                          </>
                        ) : <div className="h-2.5 rounded-full bg-board" aria-hidden="true" />}
                      </li>
                    )
                  })}
                </ul>
              )}
              <ShowMore hidden={Math.min(8, data.classes.length) - 1} open={allClasses} onToggle={() => setAllClasses(!allClasses)} what={['class', 'classes']} />
            </section>
          )}

          <ExpeditionCard own exp={expedition} name={data.name} loadMap={loadMap} />

          <DiscoveryJournal own journey={journey} name={data.name} />

          <StudentExams readOnly studentId="" name={data.name} exams={exams} totals={DEFAULT_EXAM_TOTALS} onChange={() => {}} />

          <section>
            <h2 className="text-2xl font-extrabold">Homework</h2>
            {toDo > 0 && <div className="mt-3"><Notice>You have {toDo === 1 ? '1 homework' : `${toDo} homeworks`} to do.</Notice></div>}
            {data.homework.length === 0 ? <p className="mt-2 text-inksoft">No homework yet.</p> : (
              <ul className="mt-3 grid gap-3">
                {data.homework.slice(0, allHw ? undefined : 1).map((h, i) => {
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
                      {h.feedback && <p className="mt-2 rounded-lg bg-board px-3 py-2 text-[15px]"><strong>{first}:</strong> {h.feedback}</p>}
                    </li>
                  )
                })}
              </ul>
            )}
            <ShowMore hidden={data.homework.length - 1} open={allHw} onToggle={() => setAllHw(!allHw)} what={['homework task', 'homework tasks']} />
          </section>
        </div>

        <div className="grid min-w-0 content-start gap-8">
          <section id="messages" className="scroll-mt-6 rounded-2xl border-2 border-sage bg-sage-light/50 p-5">
            <h2 className="text-xl font-extrabold">Messages with {first}</h2>
            <p className="mt-1 text-[14px] text-inksoft">Ask a question or tell {first} something. {first} replies here.</p>
            <div className="mt-3">
              <MessageThread
                messages={(data.messages ?? []).map((m) => ({ mine: !m.fromTeacher, who: m.fromTeacher ? first : 'You', body: m.body, createdAt: m.createdAt }))}
                onSend={async (b) => { await api.sendStudentMessage(code, b); reload() }}
                placeholder={`Write to ${first}`} sendLabel="Send message"
                empty="No messages yet."
              />
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="text-xl font-extrabold">Details</h2>
            <dl className="mt-3 grid gap-3">
              {([['Class', data.className], ['Level', data.level], ['Goals', data.goals ?? '']] as const).filter(([, v]) => v).map(([k, v]) => (
                <div key={k}><dt className="text-sm text-inksoft">{k}</dt><dd className="whitespace-pre-line">{v}</dd></div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="text-xl font-extrabold">Awards</h2>
            {awarded.length === 0 ? <p className="mt-2 text-inksoft">No awards yet.</p> : (
              <>
                <ul className="mt-3 grid gap-2">
                  {awarded.map((c) => (
                    <li key={c.name} className="flex items-center gap-3">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} aria-hidden="true" />
                      <span className="flex-1">{c.name}</span>
                      {typeof c.count === 'number' && <span className="text-[15px] text-inksoft">{c.count} {c.count === 1 ? 'time' : 'times'}</span>}
                      <span className="w-10 text-right font-bold tabular-nums">{c.points}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      </div>

      <p className="mt-16 text-sm text-inksoft">This page is just for you. Keep your code private.</p>
      <Celebrate code={code} name={data.name} found={journey.unlocked} events={expEvents} />
    </div>
  )
}

/** Shows each discovery and expedition event since this browser last opened the page, one after another */
function Celebrate({ code, name, found, events }: { code: string; name: string; found: Found[]; events: ExpeditionEvent[] }) {
  const id = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const kF = `cm-discoveries-seen-${id}`, kE = `cm-expedition-seen-${id}`
  const [queue, setQueue] = useState<({ find: Found; n: number } | { event: ExpeditionEvent; n: number })[]>([])
  useEffect(() => {
    const read = (k: string, count: number) => { try { const v = Number(localStorage.getItem(k) ?? '-1'); return v < 0 ? Math.max(0, count - 1) : v } catch { return count } }
    const f = read(kF, found.length), e = read(kE, events.length)
    setQueue([
      ...found.slice(f).map((x, i) => ({ find: x, n: f + i + 1 })),
      ...events.slice(e).map((x, i) => ({ event: x, n: e + i + 1 })),
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kF, kE, found.length, events.length])
  if (!queue.length) return null
  const head = queue[0]
  const close = () => {
    try { localStorage.setItem('find' in head ? kF : kE, String(head.n)) } catch { /* private window: show again next time */ }
    setQueue(queue.slice(1))
  }
  return 'find' in head
    ? <DiscoveryReveal found={head.find} name={name} more={queue.length - 1} onClose={close} />
    : <ExpeditionReveal event={head.event} name={name} more={queue.length - 1} onClose={close} />
}
