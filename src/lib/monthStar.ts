import { computePerformance, toScoreClasses, toScoreExams, toScoreHomework } from './performance'
import type { Award, BehaviourOption, ClassSession, Exam, Homework, HomeworkStatus, MonthStar, Student } from './types'

type Log = { points: number; at: string }[]

/** A student's point history with their student of the month bonuses added, oldest first */
export function withStarBonus(log: Log, stars: { bonus: number; createdAt?: string; at?: string }[]): Log {
  const extra = stars.filter((w) => w.bonus > 0).map((w) => ({ points: w.bonus, at: (w.createdAt ?? w.at)! }))
  return extra.length ? [...log, ...extra].sort((a, b) => a.at.localeCompare(b.at)) : log
}

/** "2026-10" for a date */
export const monthOf = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
/** The month before ("2026-10" to "2026-09") */
export function prevMonth(m: string) {
  const [y, mo] = m.split('-').map(Number)
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`
}
/** "October 2026" */
export const monthName = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

/** Wears the crown: the latest winner in their class, picked for this month or last month */
export function crownedIds(stars: MonthStar[], now = new Date()): Set<string> {
  const recent = [monthOf(now), prevMonth(monthOf(now))]
  const latest = new Map<string, MonthStar>()
  stars.forEach((w) => { const l = latest.get(w.classId); if (!l || w.month > l.month) latest.set(w.classId, w) })
  return new Set([...latest.values()].filter((w) => recent.includes(w.month)).map((w) => w.studentId))
}

export interface Candidate { student: Student; score: number | null; points: number; classes: number; reasons: string[] }

/**
 * Who did best in one class during one month: the overall score worked out from that month only
 * (behaviour, homework, attendance, awards, review and exams), then points earned as a tie-break.
 * Students with no class that month are left out.
 */
export function monthCandidates(month: string, students: Student[], d: { sessions: ClassSession[]; awards: Award[]; options: BehaviourOption[]; homework: Homework[]; statuses: HomeworkStatus[]; exams: Exam[] }): Candidate[] {
  const inMonth = (iso: string) => iso.slice(0, 7) === month
  const end = `${month}-31`
  return students.map((s) => {
    const sessions = d.sessions.filter((x) => x.studentId === s.id && x.endedAt && inMonth(x.date))
    const hw = toScoreHomework(s.id, d.homework, d.statuses).filter((h) => inMonth(h.dueDate))
    const exams = toScoreExams(s.id, d.exams).filter((e) => inMonth(e.date))
    const perf = computePerformance(toScoreClasses(sessions, d.awards, d.options), hw, exams, end)
    const points = d.awards.filter((a) => a.studentId === s.id && inMonth(a.createdAt)).reduce((t, a) => t + a.points, 0)
    const best = perf.parts.filter((p) => p.value !== null && p.value >= 0.8).sort((a, b) => b.value! - a.value!).slice(0, 2).map((p) => p.label.toLowerCase())
    return { student: s, score: perf.score, points, classes: sessions.length, reasons: best }
  }).filter((c) => c.classes > 0)
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.points - a.points || a.student.name.localeCompare(b.student.name))
}
