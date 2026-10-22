// Demo versions of the teaching, booking and messaging functions.
import { DEFAULT_AWARD_CATEGORIES, type Api, type TeachApi } from '../types'
import { getBlob, putBlob } from '../idb'
import { currentUser, demoCore, load, requireAdmin, requireUser, save, uid, wait } from './demo'

const strip = <T extends { ownerId: string }>(x: T) => {
  const { ownerId: _o, ...rest } = x
  return rest as Omit<T, 'ownerId'>
}
const mine = <T extends { ownerId: string }>(list: T[]) => {
  const u = requireUser()
  return list.filter((x) => x.ownerId === u.id)
}
function own<T extends { ownerId: string }>(list: T[], id: string, what: string) {
  const item = mine(list).find((x) => (x as unknown as { id: string }).id === id)
  if (!item) throw new Error(`That ${what} no longer exists.`)
  return item
}
const slotWithCount = (slotId: string) => {
  const db = load()
  const s = db.slots.find((x) => x.id === slotId)!
  return { ...s, bookedCount: db.bookings.filter((b) => b.slotId === slotId && b.status === 'confirmed').length }
}

const demoTeach: TeachApi = {
  async listClasses() {
    return mine(load().classes).map(strip).sort((a, b) => a.name.localeCompare(b.name))
  },
  async saveClass(input) {
    const u = requireUser()
    const db = load()
    if (input.id) {
      const c = own(db.classes, input.id, 'class')
      Object.assign(c, input)
      save()
      return strip(c)
    }
    const c = { ...input, id: 'c-' + uid(), ownerId: u.id, createdAt: new Date().toISOString() }
    db.classes.push(c)
    DEFAULT_AWARD_CATEGORIES.forEach((a, i) => db.awardCategories.push({ ...a, id: 'ac-' + uid(), ownerId: u.id, classId: c.id, position: i }))
    save()
    return strip(c)
  },
  async deleteClass(id) {
    own(load().classes, id, 'class')
    const db = load()
    const hw = db.homework.filter((h) => h.classId === id).map((h) => h.id)
    db.classes = db.classes.filter((c) => c.id !== id)
    db.students = db.students.filter((s) => s.classId !== id)
    db.awardCategories = db.awardCategories.filter((a) => a.classId !== id)
    db.awards = db.awards.filter((a) => a.classId !== id)
    db.homework = db.homework.filter((h) => h.classId !== id)
    db.homeworkStatus = db.homeworkStatus.filter((s) => !hw.includes(s.homeworkId))
    save()
  },
  async listStudents(classId) {
    return mine(load().students).filter((s) => !classId || s.classId === classId).map(strip).sort((a, b) => a.name.localeCompare(b.name))
  },
  async saveStudent(input) {
    const u = requireUser()
    const db = load()
    own(db.classes, input.classId, 'class')
    if (input.id) {
      const s = own(db.students, input.id, 'student')
      Object.assign(s, input)
      save()
      return strip(s)
    }
    const s = { notes: '', level: '', contact: '', goals: '', shareCode: null, ...input, id: 's-' + uid(), ownerId: u.id, createdAt: new Date().toISOString() }
    db.students.push(s)
    save()
    return strip(s)
  },
  async deleteStudent(id) {
    own(load().students, id, 'student')
    const db = load()
    db.students = db.students.filter((s) => s.id !== id)
    db.awards = db.awards.filter((a) => a.studentId !== id)
    db.homeworkStatus = db.homeworkStatus.filter((s) => s.studentId !== id)
    db.studentNotes = db.studentNotes.filter((n) => n.studentId !== id)
    save()
  },
  async listAllAwards() { return mine(load().awards).map(strip) },
  async listAllHomeworkStatus() { return mine(load().homeworkStatus).map(strip) },
  async listStudentNotes(studentId) {
    return mine(load().studentNotes).filter((n) => !studentId || n.studentId === studentId).map(strip)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  },
  async addStudentNote({ studentId, date, body, shared = false }) {
    const u = requireUser()
    own(load().students, studentId, 'student')
    const n = { id: 'n-' + uid(), ownerId: u.id, studentId, date, body, shared, createdAt: new Date().toISOString() }
    load().studentNotes.push(n)
    save()
    return strip(n)
  },
  async setNoteShared(id, shared) {
    own(load().studentNotes, id, 'note').shared = shared
    save()
  },
  async setStudentShareCode(studentId, code) {
    own(load().students, studentId, 'student').shareCode = code
    save()
  },
  async getStudentProgress(code) {
    await wait(200)
    const norm = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const key = norm(code)
    if (key.length < 10) return null
    const db = load()
    const s = db.students.find((x) => x.shareCode && norm(x.shareCode) === key)
    if (!s) return null
    const cls = db.classes.find((c) => c.id === s.classId)
    const cats = db.awardCategories.filter((c) => c.classId === s.classId).sort((a, b) => a.position - b.position)
    const awards = db.awards.filter((a) => a.studentId === s.id)
    const st = (hid: string) => db.homeworkStatus.find((x) => x.homeworkId === hid && x.studentId === s.id)
    return {
      name: s.name,
      className: cls?.name ?? '',
      level: s.level || cls?.level || '',
      totalPoints: awards.reduce((t, a) => t + a.points, 0),
      categories: cats.map((c) => ({ name: c.name, color: c.color, points: awards.filter((a) => a.categoryId === c.id).reduce((t, a) => t + a.points, 0) })),
      recentAwards: [...awards].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10).map((a) => {
        const c = db.awardCategories.find((x) => x.id === a.categoryId)
        return { date: a.createdAt, category: c?.name ?? 'Award', color: c?.color ?? '#3D405B', points: a.points, lesson: db.lessons.find((l) => l.id === a.lessonId)?.title ?? null }
      }),
      homework: db.homework.filter((h) => h.studentId === s.id).sort((a, b) => b.dueDate.localeCompare(a.dueDate))
        .map((h) => ({ title: h.title, instructions: h.instructions, dueDate: h.dueDate, status: st(h.id)?.status ?? 'assigned', feedback: st(h.id)?.feedback ?? '' })),
      notes: db.studentNotes.filter((n) => n.studentId === s.id && n.shared).sort((a, b) => b.date.localeCompare(a.date)).map((n) => ({ date: n.date, body: n.body })),
    }
  },
  async deleteStudentNote(id) {
    own(load().studentNotes, id, 'note')
    const db = load()
    db.studentNotes = db.studentNotes.filter((n) => n.id !== id)
    save()
  },

  async listAwardCategories(classId) {
    return mine(load().awardCategories).filter((a) => a.classId === classId).sort((a, b) => a.position - b.position).map(strip)
  },
  async saveAwardCategory(input) {
    const u = requireUser()
    const db = load()
    own(db.classes, input.classId, 'class')
    if (input.id) {
      const a = own(db.awardCategories, input.id, 'award')
      Object.assign(a, input)
      save()
      return strip(a)
    }
    const a = { ...input, id: 'ac-' + uid(), ownerId: u.id }
    db.awardCategories.push(a)
    save()
    return strip(a)
  },
  async deleteAwardCategory(id) {
    own(load().awardCategories, id, 'award')
    const db = load()
    db.awardCategories = db.awardCategories.filter((a) => a.id !== id)
    db.awards = db.awards.filter((a) => a.categoryId !== id)
    save()
  },
  async listAwards(classId) {
    return mine(load().awards).filter((a) => a.classId === classId).map(strip)
  },
  async giveAward({ classId, studentId, categoryId, lessonId }) {
    const u = requireUser()
    const db = load()
    const cat = own(db.awardCategories, categoryId, 'award')
    own(db.students, studentId, 'student')
    const a = { id: 'aw-' + uid(), ownerId: u.id, classId, studentId, categoryId, points: cat.points, lessonId: lessonId ?? null, createdAt: new Date().toISOString() }
    db.awards.push(a)
    save()
    return strip(a)
  },
  async undoAward(id) {
    own(load().awards, id, 'award')
    const db = load()
    db.awards = db.awards.filter((a) => a.id !== id)
    save()
  },

  async listHomework(classId) {
    return mine(load().homework).filter((h) => !classId || h.classId === classId).map(strip).sort((a, b) => b.dueDate.localeCompare(a.dueDate))
  },
  async saveHomework(input) {
    const u = requireUser()
    const db = load()
    own(db.classes, input.classId, 'class')
    if (input.id) {
      const h = own(db.homework, input.id, 'homework')
      Object.assign(h, input)
      save()
      return strip(h)
    }
    const h = { ...input, id: 'hw-' + uid(), ownerId: u.id, createdAt: new Date().toISOString() }
    db.homework.push(h)
    save()
    return strip(h)
  },
  async deleteHomework(id) {
    own(load().homework, id, 'homework')
    const db = load()
    db.homework = db.homework.filter((h) => h.id !== id)
    db.homeworkStatus = db.homeworkStatus.filter((s) => s.homeworkId !== id)
    save()
  },
  async listHomeworkStatus(classId) {
    const ids = mine(load().homework).filter((h) => h.classId === classId).map((h) => h.id)
    return mine(load().homeworkStatus).filter((s) => ids.includes(s.homeworkId)).map(strip)
  },
  async setHomeworkStatus(input) {
    const u = requireUser()
    const db = load()
    own(db.homework, input.homeworkId, 'homework')
    const existing = db.homeworkStatus.find((s) => s.homeworkId === input.homeworkId && s.studentId === input.studentId)
    if (existing) Object.assign(existing, input)
    else db.homeworkStatus.push({ ...input, ownerId: u.id })
    save()
  },

  async getSlideUrls(lesson) {
    const u = requireUser()
    const owns = load().purchases.some((p) => p.userId === u.id && p.lessonId === lesson.id)
    if (!owns && u.role !== 'admin') throw new Error('Get this lesson first to teach it from the website.')
    // Slides uploaded in demo mode live in this browser's IndexedDB ("idb:" keys)
    return Promise.all(lesson.slideImages.map(async (ref) => {
      if (!ref.startsWith('idb:')) return ref
      const blob = await getBlob(ref.slice(4)).catch(() => null)
      if (!blob) throw new Error('These slides were uploaded in a different browser. Upload them again here to teach this lesson.')
      return URL.createObjectURL(blob)
    }))
  },
  async uploadSlideImages(slug, files) {
    requireAdmin()
    const stamp = Date.now()
    const keys: string[] = []
    for (const [i, f] of files.entries()) {
      const key = `slides/${slug}/${stamp}-${i}`
      try { await putBlob(key, f) } catch { throw new Error('This browser could not store the slides. Try a different browser, or switch off private browsing.') }
      keys.push('idb:' + key)
    }
    return keys
  },

  async listSlots(opts) {
    const now = new Date().toISOString()
    return load().slots
      .filter((s) => opts?.includePast || s.startsAt > now)
      .map((s) => slotWithCount(s.id))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  },
  async saveSlot(input) {
    requireAdmin()
    const db = load()
    if (input.id) {
      const s = db.slots.find((x) => x.id === input.id)!
      Object.assign(s, input)
      save()
      return slotWithCount(s.id)
    }
    const s = { ...input, id: 'sl-' + uid(), bookedCount: 0 }
    db.slots.push(s)
    save()
    return s
  },
  async deleteSlot(id) {
    requireAdmin()
    const db = load()
    if (db.bookings.some((b) => b.slotId === id && b.status === 'confirmed')) throw new Error('Someone has booked this time. Cancel their booking first.')
    db.slots = db.slots.filter((s) => s.id !== id)
    save()
  },
  async bookSlot(slotId, message) {
    await wait(300)
    const u = requireUser()
    const db = load()
    const slot = slotWithCount(slotId)
    if (slot.startsAt < new Date().toISOString()) throw new Error('This time has already passed.')
    if (db.bookings.some((b) => b.slotId === slotId && b.userId === u.id && b.status === 'confirmed')) throw new Error('You have already booked this time.')
    if (slot.bookedCount >= slot.capacity) throw new Error('This time was just taken. Choose another one.')
    db.bookings.push({ id: 'b-' + uid(), slotId, userId: u.id, status: 'confirmed', message, createdAt: new Date().toISOString() })
    save()
  },
  async cancelBooking(id) {
    const u = requireUser()
    const b = load().bookings.find((x) => x.id === id)
    if (!b || (b.userId !== u.id && u.role !== 'admin')) throw new Error('That booking no longer exists.')
    b.status = 'cancelled'
    save()
  },
  async listMyBookings() {
    const u = currentUser()
    if (!u) return []
    return load().bookings.filter((b) => b.userId === u.id).map((b) => ({ ...b, slot: slotWithCount(b.slotId) }))
      .sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))
  },
  async listAllBookings() {
    requireAdmin()
    const db = load()
    return db.bookings.map((b) => {
      const user = db.users.find((x) => x.id === b.userId)
      return { ...b, slot: slotWithCount(b.slotId), userEmail: user?.email, userName: user?.fullName }
    }).sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))
  },

  async listMyMessages() {
    const u = currentUser()
    if (!u) return []
    return load().messages.filter((m) => m.threadUserId === u.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },
  async sendMessage(body) {
    const u = requireUser()
    load().messages.push({ id: 'm-' + uid(), threadUserId: u.id, fromAdmin: false, body, createdAt: new Date().toISOString(), read: false })
    save()
  },
  async listThreads() {
    requireAdmin()
    const db = load()
    const ids = [...new Set(db.messages.map((m) => m.threadUserId))]
    return ids.map((id) => {
      const msgs = db.messages.filter((m) => m.threadUserId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      const user = db.users.find((x) => x.id === id)
      return { userId: id, userEmail: user?.email ?? '', userName: user?.fullName ?? '', lastMessage: msgs[msgs.length - 1], unread: msgs.filter((m) => !m.fromAdmin && !m.read).length }
    }).sort((a, b) => b.lastMessage.createdAt.localeCompare(a.lastMessage.createdAt))
  },
  async listThreadMessages(userId) {
    requireAdmin()
    return load().messages.filter((m) => m.threadUserId === userId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },
  async sendAdminMessage(userId, body) {
    requireAdmin()
    load().messages.push({ id: 'm-' + uid(), threadUserId: userId, fromAdmin: true, body, createdAt: new Date().toISOString(), read: false })
    save()
  },
  async markThreadRead(userId) {
    const u = requireUser()
    const isAdmin = u.role === 'admin' && userId !== u.id
    load().messages.forEach((m) => {
      if (m.threadUserId === userId && m.fromAdmin !== isAdmin) m.read = true
    })
    save()
  },
  async unreadCount() {
    const u = currentUser()
    if (!u) return 0
    const msgs = load().messages
    if (u.role === 'admin') return msgs.filter((m) => !m.fromAdmin && !m.read).length
    return msgs.filter((m) => m.threadUserId === u.id && m.fromAdmin && !m.read).length
  },
}

export const demoApi: Api = { ...demoCore, ...demoTeach }
