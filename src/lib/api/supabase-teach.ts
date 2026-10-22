// Live versions of the teaching, booking and messaging functions (Supabase).
import type { Award, AwardCategory, Booking, BookingSlot, ClassGroup, Homework, HomeworkStatus, Message, Student, StudentNote, StudentProgress, TeachApi, ClassSession, SessionPatch } from '../types'
import { DEFAULT_BEHAVIOURS } from '../types'
import { supabase } from './supabase'

type Row = Record<string, any>
function check<T = any>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}
const notify = (fn: string, body: object) => { supabase.functions.invoke(fn, { body }).catch(() => {}) }

const toClass = (r: Row): ClassGroup => ({ id: r.id, name: r.name, level: r.level, color: r.color, createdAt: r.created_at })
const toStudent = (r: Row): Student => ({ id: r.id, classId: r.class_id, name: r.name, notes: r.notes ?? '', level: r.level ?? '', contact: r.contact ?? '', goals: r.goals ?? '', shareCode: r.share_code ?? null, showBehaviour: Boolean(r.show_behaviour), createdAt: r.created_at })
const toNote = (r: Row): StudentNote => ({ id: r.id, studentId: r.student_id, date: r.date, body: r.body, shared: Boolean(r.shared), createdAt: r.created_at })
const toCategory = (r: Row): AwardCategory => ({ id: r.id, classId: r.class_id, name: r.name, points: r.points, color: r.color, position: r.position })
const toAward = (r: Row): Award => ({ id: r.id, classId: r.class_id, studentId: r.student_id, categoryId: r.category_id, points: r.points, lessonId: r.lesson_id, createdAt: r.created_at })
const toHomework = (r: Row): Homework => ({ id: r.id, classId: r.class_id, studentId: r.student_id ?? null, title: r.title, instructions: r.instructions ?? '', dueDate: r.due_date, lessonId: r.lesson_id, createdAt: r.created_at })
const toStatus = (r: Row): HomeworkStatus => ({ homeworkId: r.homework_id, studentId: r.student_id, status: r.status, feedback: r.feedback ?? '' })
const toSlot = (r: Row): BookingSlot => ({ id: r.id, startsAt: r.starts_at, durationMinutes: r.duration_minutes, kind: r.kind, capacity: r.capacity, notes: r.notes ?? '', bookedCount: r.booked_count ?? 0 })
const toMessage = (r: Row): Message => ({ id: r.id, threadUserId: r.thread_user_id, fromAdmin: r.from_admin, body: r.body, createdAt: r.created_at, read: r.read })
const toBooking = (r: Row, slots: Map<string, BookingSlot>): Booking => ({
  id: r.id, slotId: r.slot_id, userId: r.user_id, status: r.status, message: r.message ?? '', createdAt: r.created_at,
  slot: slots.get(r.slot_id) ?? (r.booking_slots ? toSlot(r.booking_slots) : undefined), userEmail: r.profiles?.email, userName: r.profiles?.full_name,
})

const toSession = (r: Row): ClassSession => ({
  id: r.id, studentId: r.student_id, classId: r.class_id, date: r.date, startedAt: r.started_at, endedAt: r.ended_at,
  attendance: r.attendance, lessonId: r.lesson_id, behaviour: r.behaviour ?? [], covered: r.covered ?? '', newWords: r.new_words ?? '',
  corrections: r.corrections ?? '', notes: r.notes ?? '', noteId: r.note_id, createdAt: r.created_at,
})
function fromSessionPatch(p: SessionPatch): Row {
  const map: Record<string, string> = { date: 'date', endedAt: 'ended_at', attendance: 'attendance', lessonId: 'lesson_id', behaviour: 'behaviour', covered: 'covered', newWords: 'new_words', corrections: 'corrections', notes: 'notes', noteId: 'note_id' }
  const row: Row = {}
  for (const [k, v] of Object.entries(p)) if (v !== undefined) row[map[k]] = v
  return row
}

async function uid() {
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Sign in to continue.')
  return data.user.id
}
async function upsert(table: string, input: Row, id?: string) {
  const res = id
    ? await supabase.from(table).update(input).eq('id', id).select().single()
    : await supabase.from(table).insert(input).select().single()
  return check(res) as Row
}
const safeName = (n: string) => n.replace(/[^\w.\-]+/g, '_')

export const supabaseTeach: TeachApi = {
  async listClasses() {
    return check(await supabase.from('classes').select('*').eq('owner_id', await uid()).order('name')).map(toClass)
  },
  async saveClass({ id, name, level, color }) {
    return toClass(await upsert('classes', { name, level, color }, id))
  },
  async deleteClass(id) { check(await supabase.from('classes').delete().eq('id', id)) },
  async listStudents(classId) {
    let q = supabase.from('students').select('*').eq('owner_id', await uid()).order('name')
    if (classId) q = q.eq('class_id', classId)
    return check(await q).map(toStudent)
  },
  async saveStudent({ id, classId, name, notes, level, contact, goals }) {
    const row: Row = { class_id: classId, name }
    if (notes !== undefined) row.notes = notes
    if (level !== undefined) row.level = level
    if (contact !== undefined) row.contact = contact
    if (goals !== undefined) row.goals = goals
    return toStudent(await upsert('students', row, id))
  },
  async deleteStudent(id) { check(await supabase.from('students').delete().eq('id', id)) },
  async listAllAwards() {
    return check(await supabase.from('awards').select('*').eq('owner_id', await uid()).order('created_at')).map(toAward)
  },
  async listAllHomeworkStatus() {
    return check(await supabase.from('homework_status').select('*').eq('owner_id', await uid())).map(toStatus)
  },
  async listStudentNotes(studentId) {
    let q = supabase.from('student_notes').select('*').eq('owner_id', await uid()).order('date', { ascending: false }).order('created_at', { ascending: false })
    if (studentId) q = q.eq('student_id', studentId)
    return check(await q).map(toNote)
  },
  async addStudentNote({ studentId, date, body, shared = false }) {
    return toNote(await upsert('student_notes', { student_id: studentId, date, body, shared }))
  },
  async setNoteShared(id, shared) {
    check(await supabase.from('student_notes').update({ shared }).eq('id', id))
  },
  async setStudentShowBehaviour(studentId, show) {
    check(await supabase.from('students').update({ show_behaviour: show }).eq('id', studentId))
  },
  async getBehaviourOptions() {
    const r = check(await supabase.from('profiles').select('behaviour_options').eq('id', await uid()).maybeSingle()) as Row | null
    const opts = r?.behaviour_options
    return Array.isArray(opts) && opts.length ? opts : DEFAULT_BEHAVIOURS
  },
  async saveBehaviourOptions(options) {
    check(await supabase.from('profiles').update({ behaviour_options: options }).eq('id', await uid()))
  },
  async startClassSession(student) {
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    return toSession(await upsert('class_sessions', { student_id: student.id, class_id: student.classId, date: local, started_at: now.toISOString() }))
  },
  async getClassSession(id) {
    const r = check(await supabase.from('class_sessions').select('*').eq('id', id).maybeSingle()) as Row | null
    return r ? toSession(r) : null
  },
  async listClassSessions(studentId) {
    return check(await supabase.from('class_sessions').select('*').eq('student_id', studentId).order('date', { ascending: false }).order('started_at', { ascending: false })).map(toSession)
  },
  async updateClassSession(id, patch) {
    check(await supabase.from('class_sessions').update(fromSessionPatch(patch)).eq('id', id))
  },
  async deleteClassSession(id) { check(await supabase.from('class_sessions').delete().eq('id', id)) },
  async setStudentShareCode(studentId, code) {
    check(await supabase.from('students').update({ share_code: code }).eq('id', studentId))
  },
  async getStudentProgress(code) {
    const data = check(await supabase.rpc('student_progress', { p_code: code }))
    return (data as StudentProgress | null) ?? null
  },
  async deleteStudentNote(id) { check(await supabase.from('student_notes').delete().eq('id', id)) },

  async listAwardCategories(classId) {
    return check(await supabase.from('award_categories').select('*').eq('class_id', classId).order('position')).map(toCategory)
  },
  async saveAwardCategory({ id, classId, name, points, color, position }) {
    return toCategory(await upsert('award_categories', { class_id: classId, name, points, color, position }, id))
  },
  async deleteAwardCategory(id) { check(await supabase.from('award_categories').delete().eq('id', id)) },
  async listAwards(classId) {
    return check(await supabase.from('awards').select('*').eq('class_id', classId).order('created_at')).map(toAward)
  },
  async giveAward({ classId, studentId, categoryId, lessonId }) {
    return toAward(check(await supabase.rpc('give_award', { p_class_id: classId, p_student_id: studentId, p_category_id: categoryId, p_lesson_id: lessonId ?? null })))
  },
  async undoAward(id) { check(await supabase.from('awards').delete().eq('id', id)) },

  async listHomework(classId) {
    let q = supabase.from('homework').select('*').eq('owner_id', await uid()).order('due_date', { ascending: false })
    if (classId) q = q.eq('class_id', classId)
    return check(await q).map(toHomework)
  },
  async saveHomework({ id, classId, studentId, title, instructions, dueDate, lessonId }) {
    return toHomework(await upsert('homework', { class_id: classId, student_id: studentId, title, instructions, due_date: dueDate, lesson_id: lessonId }, id))
  },
  async deleteHomework(id) { check(await supabase.from('homework').delete().eq('id', id)) },
  async listHomeworkStatus(classId) {
    return check(await supabase.from('homework_status').select('*, homework!inner(class_id)').eq('homework.class_id', classId)).map(toStatus)
  },
  async setHomeworkStatus({ homeworkId, studentId, status, feedback }) {
    check(await supabase.from('homework_status').upsert({ homework_id: homeworkId, student_id: studentId, status, feedback }, { onConflict: 'homework_id,student_id' }))
  },

  async getSlideUrls(lesson) {
    if (!lesson.slideImages.length) return []
    const { data, error } = await supabase.storage.from('lesson-slides').createSignedUrls(lesson.slideImages, 60 * 60 * 3)
    if (error) throw new Error('Get this lesson first to teach it from the website.')
    if (data.some((d) => d.error)) throw new Error('Get this lesson first to teach it from the website.')
    return data.map((d) => d.signedUrl)
  },
  async uploadSlideImages(slug, files) {
    const stamp = Date.now()
    const paths: string[] = []
    for (const [i, f] of files.entries()) {
      const path = `${slug}/${stamp}-${String(i + 1).padStart(3, '0')}-${safeName(f.name)}`
      check(await supabase.storage.from('lesson-slides').upload(path, f))
      paths.push(path)
    }
    return paths
  },

  async listSlots(opts) {
    return check(await supabase.rpc('list_slots', { p_include_past: Boolean(opts?.includePast) })).map(toSlot)
  },
  async saveSlot({ id, startsAt, durationMinutes, kind, capacity, notes }) {
    const r = await upsert('booking_slots', { starts_at: startsAt, duration_minutes: durationMinutes, kind, capacity, notes }, id)
    return toSlot({ ...r, booked_count: 0 })
  },
  async deleteSlot(id) {
    const { error } = await supabase.from('booking_slots').delete().eq('id', id)
    if (error) throw new Error(error.code === '23503' ? 'Someone has booked this time. Cancel their booking first.' : error.message)
  },
  async bookSlot(slotId, message) {
    const bookingId = check(await supabase.rpc('book_slot', { p_slot_id: slotId, p_message: message }))
    notify('notify-booking', { id: bookingId })
  },
  async cancelBooking(id) {
    check(await supabase.rpc('cancel_booking', { p_booking_id: id }))
    notify('notify-booking', { id, cancelled: true })
  },
  async listMyBookings() {
    const [rows, slots] = await Promise.all([
      supabase.from('bookings').select('*, booking_slots(*)').eq('user_id', await uid()),
      this.listSlots({ includePast: true }),
    ])
    const map = new Map(slots.map((s) => [s.id, s]))
    return check(rows).map((r: Row) => toBooking(r, map)).sort((a: Booking, b: Booking) => (a.slot?.startsAt ?? '').localeCompare(b.slot?.startsAt ?? ''))
  },
  async listAllBookings() {
    const [rows, slots] = await Promise.all([
      supabase.from('bookings').select('*, booking_slots(*), profiles(email, full_name)'),
      this.listSlots({ includePast: true }),
    ])
    const map = new Map(slots.map((s) => [s.id, s]))
    return check(rows).map((r: Row) => toBooking(r, map)).sort((a: Booking, b: Booking) => (a.slot?.startsAt ?? '').localeCompare(b.slot?.startsAt ?? ''))
  },

  async listMyMessages() {
    return check(await supabase.from('messages').select('*').eq('thread_user_id', await uid()).order('created_at')).map(toMessage)
  },
  async sendMessage(body) {
    const r = check(await supabase.from('messages').insert({ thread_user_id: await uid(), from_admin: false, body }).select().single()) as Row
    notify('notify-message', { id: r.id })
  },
  async listThreads() {
    const rows = check(await supabase.from('messages').select('*, profiles!messages_thread_user_id_fkey(email, full_name)').order('created_at')) as Row[]
    const threads = new Map<string, { userEmail: string; userName: string; msgs: Message[] }>()
    for (const r of rows) {
      const t = threads.get(r.thread_user_id) ?? { userEmail: r.profiles?.email ?? '', userName: r.profiles?.full_name ?? '', msgs: [] as Message[] }
      t.msgs.push(toMessage(r))
      threads.set(r.thread_user_id, t)
    }
    return [...threads.entries()].map(([userId, t]) => ({
      userId, userEmail: t.userEmail, userName: t.userName, lastMessage: t.msgs[t.msgs.length - 1],
      unread: t.msgs.filter((m) => !m.fromAdmin && !m.read).length,
    })).sort((a, b) => b.lastMessage.createdAt.localeCompare(a.lastMessage.createdAt))
  },
  async listThreadMessages(userId) {
    return check(await supabase.from('messages').select('*').eq('thread_user_id', userId).order('created_at')).map(toMessage)
  },
  async sendAdminMessage(userId, body) {
    const r = check(await supabase.from('messages').insert({ thread_user_id: userId, from_admin: true, body }).select().single()) as Row
    notify('notify-message', { id: r.id })
  },
  async markThreadRead(userId) {
    check(await supabase.rpc('mark_thread_read', { p_thread_user_id: userId }))
  },
  async unreadCount() {
    return check(await supabase.rpc('unread_message_count')) as number
  },
}
