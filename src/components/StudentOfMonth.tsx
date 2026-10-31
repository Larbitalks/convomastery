import { useState } from 'react'
import { api } from '../lib/api'
import { errorMessage } from '../lib/format'
import { monthCandidates, monthName, monthOf, prevMonth } from '../lib/monthStar'
import { MONTH_STAR_BONUS, type Award, type BehaviourOption, type ClassSession, type Exam, type Homework, type HomeworkStatus, type MonthStar, type Student } from '../lib/types'
import { Avatar } from './Avatar'
import { Crown, Trophy } from './MonthStar'

interface Data { sessions: ClassSession[]; awards: Award[]; options: BehaviourOption[]; homework: Homework[]; statuses: HomeworkStatus[]; exams: Exam[] }

/** Class page: suggests the best students of a month, the teacher picks the winner and says why */
export function StudentOfMonthCard({ classId, color, students, stars, data, onChange }: { classId: string; color?: string; students: Student[]; stars: MonthStar[]; data: Data; onChange: () => void }) {
  const now = monthOf()
  const last = prevMonth(now)
  // Early in the month, the month that just ended is the one to decide
  const [month, setMonth] = useState(new Date().getDate() <= 7 ? last : now)
  const [picking, setPicking] = useState<Student | null>(null)
  const [reason, setReason] = useState('')
  const [bonus, setBonus] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [other, setOther] = useState('')
  const [history, setHistory] = useState(false)

  const winner = stars.find((w) => w.month === month)
  const winnerStudent = winner && students.find((s) => s.id === winner.studentId)
  const candidates = monthCandidates(month, students, data)
  const top = candidates.slice(0, 3)
  const past = stars.filter((w) => w.month !== month)

  const start = (s: Student, why = '') => { setPicking(s); setReason(why); setBonus(winner ? winner.bonus > 0 : true); setErr(null) }
  const save = async () => {
    if (!picking) return
    setBusy(true); setErr(null)
    try { await api.setMonthStar({ classId, studentId: picking.id, month, reason, bonus: bonus ? MONTH_STAR_BONUS : 0 }); setPicking(null); setOther(''); onChange() }
    catch (e) { setErr(errorMessage(e)) } finally { setBusy(false) }
  }
  const remove = async () => {
    if (!winner) return
    setBusy(true); setErr(null)
    try { await api.removeMonthStar(winner.id); onChange() } catch (e) { setErr(errorMessage(e)) } finally { setBusy(false) }
  }

  return (
    <section className="rounded-2xl border-2 border-[#E9B949] bg-gradient-to-br from-[#FFF8E6] to-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Trophy className="h-11 w-11 shrink-0" />
          <h2 className="text-xl font-extrabold">Student of the month</h2>
        </div>
        <div className="flex rounded-full bg-white p-1 shadow-sm" role="group" aria-label="Month">
          {[last, now].map((m) => (
            <button key={m} type="button" aria-pressed={month === m} onClick={() => { setMonth(m); setPicking(null) }}
              className={`rounded-full px-3 py-1.5 text-sm font-bold ${month === m ? 'bg-ink text-white' : 'text-inksoft hover:text-ink'}`}>{monthName(m)}</button>
          ))}
        </div>
      </div>
      {err && <p className="mt-3 rounded-lg bg-[#FDECEC] px-3 py-2 text-[14px] text-[#8E1C20]" role="alert">{err}</p>}

      {picking ? (
        <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Avatar avatar={picking.avatar} name={picking.name} size={48} color={color} />
            <p className="text-lg font-extrabold">{picking.name}, student of the month for {monthName(month)}</p>
          </div>
          <label className="mt-3 block text-sm font-bold" htmlFor="som-reason">Why? {picking.name} will see this</label>
          <textarea id="som-reason" rows={2} maxLength={300} className="mt-1 w-full rounded-xl border-2 border-line px-3 py-2 text-[15px] focus:border-ink focus:outline-none"
            placeholder="Spoke up much more in debates this month" value={reason} onChange={(e) => setReason(e.target.value)} />
          <label className="mt-2 flex items-center gap-2 text-[15px]">
            <input type="checkbox" className="h-5 w-5 accent-sage-dark" checked={bonus} onChange={(e) => setBonus(e.target.checked)} />
            Give +{MONTH_STAR_BONUS} bonus points (they count towards discoveries and the climb)
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving' : winner ? 'Save' : 'Choose as student of the month'}</button>
            <button className="btn-ghost" disabled={busy} onClick={() => setPicking(null)}>Cancel</button>
          </div>
        </div>
      ) : winner && winnerStudent ? (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
          <span className="relative shrink-0">
            <Avatar avatar={winnerStudent.avatar} name={winnerStudent.name} size={64} color={color} className="ring-4 ring-[#F2C14E]" />
            <Crown className="absolute -top-5 left-1/2 h-6 w-8 -translate-x-1/2 -rotate-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-extrabold">{winnerStudent.name}</p>
            <p className="text-[14px] text-inksoft">{monthName(month)}{winner.bonus ? `, +${winner.bonus} bonus points` : ''}</p>
            {winner.reason && <p className="mt-1 text-[15px]">"{winner.reason}"</p>}
          </div>
          <div className="flex gap-3">
            <button className="text-sm font-bold underline" onClick={() => start(winnerStudent, winner.reason)}>Edit</button>
            <button className="text-sm font-bold underline" disabled={busy} onClick={remove}>Remove</button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          {top.length === 0 ? (
            <p className="text-[15px] text-inksoft">No finished classes in {monthName(month)} yet. Suggestions appear once classes are taught this month.</p>
          ) : (
            <>
              <p className="text-[15px] text-inksoft">Top suggestions for {monthName(month)}, from that month only: behaviour, homework, attendance, awards, review and exams.</p>
              <ol className="mt-3 grid gap-2 sm:grid-cols-3">
                {top.map((c, i) => (
                  <li key={c.student.id} className="flex flex-col rounded-xl bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-extrabold text-white" style={{ backgroundColor: ['#E9A23B', '#8D99AE', '#B5835A'][i] }}>{i + 1}</span>
                      <Avatar avatar={c.student.avatar} name={c.student.name} size={36} color={color} />
                      <span className="min-w-0 truncate font-bold">{c.student.name}</span>
                    </div>
                    <p className="mt-2 text-[14px] text-inksoft">
                      {c.score !== null ? <><strong className="text-ink">{c.score}</strong> score, </> : null}
                      <strong className="text-ink">{c.points}</strong> {c.points === 1 ? 'point' : 'points'}, {c.classes} {c.classes === 1 ? 'class' : 'classes'}
                    </p>
                    {c.reasons.length > 0 && <p className="text-[13px] text-inksoft">Strong {c.reasons.join(' and ')}</p>}
                    <button className="btn-ghost mt-2 !py-1.5 text-sm" onClick={() => start(c.student)}>Choose</button>
                  </li>
                ))}
              </ol>
            </>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[14px]">
            <label htmlFor="som-other" className="font-bold">Or choose someone else:</label>
            <select id="som-other" className="rounded-xl border-2 border-line bg-white px-3 py-1.5" value={other} onChange={(e) => setOther(e.target.value)}>
              <option value="">Pick a student</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button className="btn-ghost !py-1.5 text-sm" disabled={!other} onClick={() => { const s = students.find((x) => x.id === other); if (s) start(s) }}>Choose</button>
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-4">
          <button className="text-sm font-bold underline" onClick={() => setHistory(!history)} aria-expanded={history}>{history ? 'Hide past winners' : `Past winners (${past.length})`}</button>
          {history && (
            <ul className="mt-2 grid gap-1.5">
              {past.map((w) => {
                const s = students.find((x) => x.id === w.studentId)
                return (
                  <li key={w.id} className="flex items-center gap-2 text-[14px]">
                    <Trophy className="h-5 w-5 shrink-0" />
                    <span className="font-bold">{monthName(w.month)}</span>
                    <span>{s?.name ?? 'A former student'}</span>
                    {w.reason && <span className="min-w-0 truncate text-inksoft">"{w.reason}"</span>}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
