import { presetAvatar } from '../avatar'
// Sample classes, students, homework, bookings and messages for demo mode.
import { DEFAULT_AWARD_CATEGORIES } from '../types'
import type { DemoDb } from './demo'

const day = 24 * 60 * 60 * 1000
const iso = (d: Date) => d.toISOString()
const ymd = (d: Date) => d.toISOString().slice(0, 10)

export function seedTeaching(): Pick<DemoDb, 'classes' | 'students' | 'studentNotes' | 'sessions' | 'exams' | 'studentMessages' | 'classMoves' | 'awardCategories' | 'awards' | 'homework' | 'homeworkStatus' | 'slots' | 'bookings' | 'messages'> {
  const now = new Date()
  const classes: DemoDb['classes'] = [
    { id: 'c-teens', ownerId: 'u-admin', name: 'Thursday Teens', level: 'B1', color: '#46725D', createdAt: iso(new Date(now.getTime() - 30 * day)) },
    { id: 'c-adults', ownerId: 'u-admin', name: 'Adult Conversation Club', level: 'B2', color: '#3D405B', createdAt: iso(new Date(now.getTime() - 20 * day)) },
    { id: 'c-tutor', ownerId: 'u-teacher', name: 'My online students', level: 'B1', color: '#7A5C8C', createdAt: iso(new Date(now.getTime() - 10 * day)) },
  ]
  const names: Record<string, string[]> = {
    'c-teens': ['Amy', 'Ben', 'Chloe', 'Daniel', 'Emma', 'Felix'],
    'c-adults': ['Hana', 'Ivan', 'Julia', 'Kenji'],
    'c-tutor': ['Leo', 'Mia', 'Noah'],
  }
  const students: DemoDb['students'] = classes.flatMap((c) =>
    names[c.id].map((n, i) => ({ id: `s-${c.id}-${i}`, ownerId: c.ownerId, classId: c.id, name: n, notes: '', level: c.level, contact: '', goals: '', shareCode: null, showBehaviour: false, createdAt: c.createdAt })),
  )
  // Most demo students have an avatar; a couple don't, to show the initials
  students.forEach((s, i) => { if (i % 5 !== 4) s.avatar = presetAvatar(i * 3 + 1) })
  Object.assign(students[0], { shareCode: 'DEMO-AMY2-CODE', contact: "Parent: Mrs Lee, lee.family@example.com", goals: 'Speak more fluently in debates; use linking words', notes: 'Confident speaker, sometimes rushes answers.', lastViewedAt: new Date(Date.now() - 3 * 3600e3).toISOString(), viewCount: 12 })
  Object.assign(students[1], { goals: 'Build confidence speaking in front of the group', notes: 'Quiet at first, warms up in pair work.' })
  const studentNotes: DemoDb['studentNotes'] = [
    { id: 'n-1', ownerId: 'u-admin', studentId: students[0].id, date: ymd(new Date(now.getTime() - 7 * day)), body: 'Sleep On It: great opinions in the debate. Practise "on the other hand" and "whereas".', createdAt: iso(new Date(now.getTime() - 7 * day)), shared: true },
    { id: 'n-2', ownerId: 'u-admin', studentId: students[0].id, date: ymd(new Date(now.getTime() - 14 * day)), body: 'Lucky Breaks: needed help with past tense when telling stories. Homework handed in on time.', createdAt: iso(new Date(now.getTime() - 14 * day)), shared: false },
    { id: 'n-3', ownerId: 'u-admin', studentId: students[1].id, date: ymd(new Date(now.getTime() - 7 * day)), body: 'Spoke much more in pair work today. Give him a role in the next debate.', createdAt: iso(new Date(now.getTime() - 7 * day)), shared: false },
  ]
  const awardCategories: DemoDb['awardCategories'] = classes.flatMap((c) =>
    DEFAULT_AWARD_CATEGORIES.map((a, i) => ({ ...a, id: `ac-${c.id}-${i}`, ownerId: c.ownerId, classId: c.id, position: i })),
  )
  // A few awards from earlier lessons so the scoreboard has something to show
  const awards: DemoDb['awards'] = []
  const pattern = [[0, 0], [0, 1], [1, 0], [2, 1], [2, 0], [3, 2], [4, 0], [4, 1], [4, 3], [5, 0], [0, 4], [2, 4]]
  pattern.forEach(([s, a], i) => {
    const cat = DEFAULT_AWARD_CATEGORIES[a]
    awards.push({
      id: `aw-${i}`, ownerId: 'u-admin', classId: 'c-teens', studentId: `s-c-teens-${s}`, categoryId: `ac-c-teens-${a}`,
      points: cat.points, lessonId: 'les-sleep-on-it', createdAt: iso(new Date(now.getTime() - (7 - (i % 3)) * day)),
    })
  })
  // Homework is set for each student individually
  const homework: DemoDb['homework'] = []
  const homeworkStatus: DemoDb['homeworkStatus'] = []
  const states = ['done', 'done', 'late', 'done', 'missing', 'done'] as const
  names['c-teens'].forEach((_, i) => {
    const sid = `s-c-teens-${i}`
    homework.push({ id: `hw-diary-${i}`, ownerId: 'u-admin', classId: 'c-teens', studentId: sid, title: 'Sleep diary', instructions: 'Record what time you go to bed and wake up for five days. Be ready to talk about it using three words from the lesson.', dueDate: ymd(new Date(now.getTime() - 2 * day)), lessonId: 'les-sleep-on-it', createdAt: iso(new Date(now.getTime() - 9 * day)) })
    homeworkStatus.push({ ownerId: 'u-admin', homeworkId: `hw-diary-${i}`, studentId: sid, status: states[i], feedback: i === 0 ? 'Great detail, well done.' : '' })
  })
  ;[0, 1].forEach((i) => homework.push({ id: `hw-family-${i}`, ownerId: 'u-admin', classId: 'c-teens', studentId: `s-c-teens-${i}`, title: 'Family interview', instructions: 'Ask an older family member three questions about their childhood. Write down their answers in English.', dueDate: ymd(new Date(now.getTime() + 5 * day)), lessonId: 'les-all-in-the-family', createdAt: iso(new Date(now.getTime() - 1 * day)) }))

  // Two past one-to-one classes for Amy, with attendance and behaviour
  const mark = (label: string, color: string, d: number, min: number) => ({ label, color, at: iso(new Date(now.getTime() - d * day + min * 60000)) })
  const sessions: DemoDb['sessions'] = [
    { id: 'cs-1', ownerId: 'u-admin', studentId: students[0].id, classId: 'c-teens', date: ymd(new Date(now.getTime() - 14 * day)), startedAt: iso(new Date(now.getTime() - 14 * day)), endedAt: iso(new Date(now.getTime() - 14 * day + 55 * 60000)), attendance: 'present', review: 'no', lessonId: 'les-lucky-breaks',
      behaviour: [mark('Active', '#46725D', 14, 5), mark('Distracted', '#D99A3D', 14, 20), mark('Active', '#46725D', 14, 35)], covered: 'Warm-up, vocabulary, conversation', newWords: 'superstition, coincidence', corrections: 'I am agree > I agree', notes: '', noteId: null, createdAt: iso(new Date(now.getTime() - 14 * day)) },
    { id: 'cs-2', ownerId: 'u-admin', studentId: students[0].id, classId: 'c-teens', date: ymd(new Date(now.getTime() - 7 * day)), startedAt: iso(new Date(now.getTime() - 7 * day)), endedAt: iso(new Date(now.getTime() - 7 * day + 60 * 60000)), attendance: 'late', review: 'yes', lessonId: 'les-sleep-on-it',
      behaviour: [mark('Participating well', '#2F7F7A', 7, 10), mark('Active', '#46725D', 7, 25), mark('Active', '#46725D', 7, 40), mark('Participating well', '#2F7F7A', 7, 50)], covered: 'Dilemmas and debate', newWords: 'night owl, early bird', corrections: '', notes: 'Great debate.', noteId: null, createdAt: iso(new Date(now.getTime() - 7 * day)) },
  ]

  // Bookable times over the next two weeks
  const slots: DemoDb['slots'] = []
  const kinds = ['One-to-one lesson', 'Trial lesson', 'One-to-one lesson', 'Teacher training'] as const
  for (let d = 1; d <= 12; d += 2) {
    for (const [h, k] of [[9, 0], [14, 1], [18, (d % 4 === 1 ? 3 : 2)]] as const) {
      const start = new Date(now.getTime() + d * day)
      start.setHours(h, 0, 0, 0)
      const kind = kinds[k]
      slots.push({
        id: `sl-${d}-${h}`, startsAt: iso(start), durationMinutes: kind === 'Trial lesson' ? 30 : 60, kind,
        capacity: kind === 'Teacher training' ? 8 : 1, notes: kind === 'Teacher training' ? 'Online workshop: running speaking lessons with large classes.' : '', bookedCount: 0,
      })
    }
  }
  const bookings: DemoDb['bookings'] = [
    { id: 'b-1', slotId: slots[1].id, userId: 'u-teacher', status: 'confirmed', message: 'I would like to see how you teach the debate section.', createdAt: iso(new Date(now.getTime() - 1 * day)) },
  ]
  slots[1].bookedCount = 1

  const messages: DemoDb['messages'] = [
    { id: 'm-1', threadUserId: 'u-teacher', fromAdmin: false, body: 'Hi Larbi, can I use the lessons with a class of 25 students?', createdAt: iso(new Date(now.getTime() - 2 * day)), read: true },
    { id: 'm-2', threadUserId: 'u-teacher', fromAdmin: true, body: 'Yes. The debate and dilemma sections work well in groups. Put students in teams of four or five.', createdAt: iso(new Date(now.getTime() - 2 * day + 3600_000)), read: true },
    { id: 'm-3', threadUserId: 'u-teacher', fromAdmin: false, body: 'Thanks! I booked a trial lesson too.', createdAt: iso(new Date(now.getTime() - 1 * day)), read: false },
  ]
  const exams: DemoDb['exams'] = [
    { id: 'ex-1', ownerId: 'u-admin', studentId: 's-c-teens-0', type: 'unit', title: 'Unit 1: Lucky Breaks', date: ymd(new Date(now.getTime() - 14 * day)), score: 17, outOf: 20, feedback: 'Strong vocabulary. Check past tense endings.', createdAt: iso(new Date(now.getTime() - 14 * day)) },
    { id: 'ex-2', ownerId: 'u-admin', studentId: 's-c-teens-0', type: 'unit', title: 'Unit 2: Sleep On It', date: ymd(new Date(now.getTime() - 6 * day)), score: 15, outOf: 20, feedback: '', createdAt: iso(new Date(now.getTime() - 6 * day)) },
  ]
  const studentMessages: DemoDb['studentMessages'] = [
    { id: 'sm-1', ownerId: 'u-admin', studentId: 's-c-teens-0', fromTeacher: false, body: 'Hi teacher, is the family interview homework for Monday or Thursday?', read: false, createdAt: iso(new Date(now.getTime() - 3 * 3600_000)) },
  ]
  const classMoves: DemoDb['classMoves'] = students.map((s) => {
    const c = classes.find((x) => x.id === s.classId)!
    return { ownerId: s.ownerId, studentId: s.id, className: c.name, classLevel: c.level, at: s.createdAt }
  })
  return { classes, students, studentNotes, sessions, exams, studentMessages, classMoves, awardCategories, awards, homework, homeworkStatus, slots, bookings, messages }
}
