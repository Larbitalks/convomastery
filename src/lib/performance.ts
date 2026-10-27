import { DEFAULT_BEHAVIOURS, type Attendance, type Award, type BehaviourOption, type BehaviourType, type ClassSession, type Homework, type HomeworkState, type HomeworkStatus, type Review, type Exam, type ExamType, EXAM_TYPES } from './types'

/** One finished class, reduced to what the score needs */
export interface ScoreClass {
  date: string
  attendance: Attendance
  review: Review | null
  /** How many behaviour clicks of each type */
  positive: number
  negative: number
  /** Award points given during the class */
  points: number
}
export interface ScoreHomework { dueDate: string; status: HomeworkState }
export interface ScoreExam { date: string; type: ExamType; score: number; outOf: number }

export type PartKey = 'behaviour' | 'homework' | 'attendance' | 'awards' | 'review' | 'exams'
export interface ScorePart { key: PartKey; label: string; weight: number; value: number | null; detail: string }
export interface Performance {
  score: number | null
  band: Band | null
  parts: ScorePart[]
  /** Change against the 8 classes before, null when there is nothing to compare */
  trend: number | null
  classesCounted: number
}
export interface Band { label: string; color: string }

export const WINDOW = 8
/** About this many award points in a class counts as full marks */
export const POINTS_FOR_FULL = 5
export const WEIGHTS: Record<PartKey, number> = { behaviour: 25, homework: 15, attendance: 15, awards: 15, review: 10, exams: 20 }
const LABELS: Record<PartKey, string> = { behaviour: 'Behaviour', homework: 'Homework', attendance: 'Attendance', awards: 'Awards', review: 'Review', exams: 'Exams' }

export function bandOf(score: number): Band {
  if (score >= 80) return { label: 'Excellent', color: '#46725D' }
  if (score >= 60) return { label: 'Good', color: '#2F7F7A' }
  if (score >= 40) return { label: 'Needs support', color: '#F2CC8F' }
  return { label: 'At risk', color: '#B42318' }
}

/** Type of a behaviour click: saved on the click, else the teacher's button, else the default button, else neutral */
export function typeOfMark(mark: { label: string; type?: BehaviourType }, options: BehaviourOption[]): BehaviourType {
  return mark.type ?? options.find((o) => o.label === mark.label)?.type ?? DEFAULT_BEHAVIOURS.find((o) => o.label === mark.label)?.type ?? 'neutral'
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const ATT: Record<Attendance, number> = { present: 100, late: 50, absent: 0 }
const REV: Record<Review, number> = { yes: 100, partly: 50, no: 0 }
const HW: Partial<Record<HomeworkState, number>> = { done: 100, late: 50, missing: 0 }

function partsFor(classes: ScoreClass[], homework: ScoreHomework[], exams: ScoreExam[]): ScorePart[] {
  const attended = classes.filter((c) => c.attendance !== 'absent')
  const pos = classes.reduce((t, c) => t + c.positive, 0)
  const neg = classes.reduce((t, c) => t + c.negative, 0)
  const reviews = classes.filter((c) => c.review).map((c) => REV[c.review!])
  const checked = homework.filter((h) => HW[h.status] !== undefined)
  const pts = attended.reduce((t, c) => t + c.points, 0)
  // Bigger exams count more: unit 1, mid-term 2, final 3
  const ew = (t: ExamType) => EXAM_TYPES.find((x) => x.value === t)?.weight ?? 1
  const examW = exams.reduce((t, e) => t + ew(e.type), 0)
  const examAvg = examW ? exams.reduce((t, e) => t + (e.score / e.outOf) * 100 * ew(e.type), 0) / examW : null

  const values: Record<PartKey, [number | null, string]> = {
    behaviour: [pos + neg ? (pos / (pos + neg)) * 100 : null, pos + neg ? `${pos} positive, ${neg} negative` : 'No behaviour marked'],
    homework: [avg(checked.map((h) => HW[h.status]!)), checked.length ? `${checked.filter((h) => h.status === 'done').length} of ${checked.length} done on time` : 'No homework checked'],
    attendance: [avg(classes.map((c) => ATT[c.attendance])), classes.length ? `${classes.filter((c) => c.attendance === 'present').length} of ${classes.length} on time` : 'No classes yet'],
    awards: [attended.length ? Math.min(100, (pts / attended.length / POINTS_FOR_FULL) * 100) : null, attended.length ? (() => { const n = Math.round((pts / attended.length) * 10) / 10; return `${n} ${n === 1 ? 'point' : 'points'} a class` })() : 'No classes yet'],
    exams: [examAvg, exams.length ? `${exams.length} ${exams.length === 1 ? 'exam' : 'exams'}, finals count most` : 'No exams yet'],
    review: [avg(reviews), reviews.length ? `Reviewed ${classes.filter((c) => c.review === 'yes').length} of ${reviews.length} times` : 'Not checked yet'],
  }
  return (Object.keys(WEIGHTS) as PartKey[]).map((key) => ({ key, label: LABELS[key], weight: WEIGHTS[key], value: values[key][0] === null ? null : Math.round(values[key][0]!), detail: values[key][1] }))
}

/** Weighted score; parts with no data are left out and the other weights scaled up */
function scoreOf(parts: ScorePart[]): number | null {
  const used = parts.filter((p) => p.value !== null)
  const w = used.reduce((t, p) => t + p.weight, 0)
  if (!w) return null
  return Math.round(used.reduce((t, p) => t + p.value! * p.weight, 0) / w)
}

/**
 * Overall performance from the last 8 finished classes, the homework due in that period,
 * and a trend against the 8 classes before.
 */
export function computePerformance(allClasses: ScoreClass[], allHomework: ScoreHomework[], allExams: ScoreExam[] = [], today = new Date().toISOString().slice(0, 10)): Performance {
  const classes = [...allClasses].sort((a, b) => b.date.localeCompare(a.date))
  const now = classes.slice(0, WINDOW)
  const before = classes.slice(WINDOW, WINDOW * 2)
  const due = allHomework.filter((h) => h.dueDate <= today || h.status !== 'assigned')
  // Homework belongs to the period its due date falls in
  const start = classes.length > WINDOW ? now[now.length - 1].date : ''
  const prevStart = classes.length > WINDOW * 2 ? before[before.length - 1].date : ''
  const hwNow = due.filter((h) => h.dueDate >= start)
  const hwBefore = start ? due.filter((h) => h.dueDate < start && h.dueDate >= prevStart) : []

  const exNow = allExams.filter((e) => e.date <= today && e.date >= start)
  const exBefore = start ? allExams.filter((e) => e.date < start && e.date >= prevStart) : []
  const parts = partsFor(now, hwNow, exNow)
  // A score needs at least one class: homework or awards alone say too little
  const score = now.length ? scoreOf(parts) : null
  const prev = before.length ? scoreOf(partsFor(before, hwBefore, exBefore)) : null
  return { score, band: score === null ? null : bandOf(score), parts, trend: score !== null && prev !== null ? score - prev : null, classesCounted: now.length }
}

/** Turn saved classes and awards into the score's input (unfinished classes are left out) */
export function toScoreClasses(sessions: ClassSession[], awards: Award[], options: BehaviourOption[]): ScoreClass[] {
  return sessions.filter((s) => s.endedAt).map((s) => {
    const types = s.behaviour.map((m) => typeOfMark(m, options))
    return {
      date: s.date, attendance: s.attendance, review: s.review ?? null,
      positive: types.filter((t) => t === 'positive').length,
      negative: types.filter((t) => t === 'negative').length,
      points: awards.filter((a) => a.studentId === s.studentId && a.createdAt >= s.startedAt && a.createdAt <= s.endedAt!).reduce((t, a) => t + a.points, 0),
    }
  })
}

/** One student's homework with its marked status */
export function toScoreHomework(studentId: string, homework: Homework[], statuses: HomeworkStatus[]): ScoreHomework[] {
  return homework.filter((h) => h.studentId === studentId).map((h) => ({
    dueDate: h.dueDate, status: statuses.find((x) => x.homeworkId === h.id && x.studentId === studentId)?.status ?? 'assigned',
  }))
}

/** One student's exams */
export const toScoreExams = (studentId: string, exams: Exam[]): ScoreExam[] => exams.filter((e) => e.studentId === studentId)
