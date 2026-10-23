// Demo backend: keeps everything in the browser so the site can be explored
// before Supabase and payments are set up. Nothing here is sent anywhere.
import { seedCategories, seedLessons } from '../seed'
import type { ClassMove, StudentMessage, Exam, ExamTotals, Award, AwardCategory, Booking, BookingSlot, Category, ClassGroup, ClassSession, CoreApi, StudentNote, BehaviourOption, Homework, HomeworkStatus, Inquiry, Lesson, Message, Profile, Purchase, Session, Student } from '../types'
import { seedTeaching } from './demo-seed'

interface DemoUser extends Profile { password: string; behaviourOptions?: BehaviourOption[]; examTotals?: ExamTotals }
type Owned<T> = T & { ownerId: string }
export interface DemoDb {
  classes: Owned<ClassGroup>[]
  students: Owned<Student>[]
  studentNotes: Owned<StudentNote>[]
  sessions: Owned<ClassSession>[]
  exams: Owned<Exam>[]
  studentMessages: Owned<StudentMessage>[]
  classMoves: Owned<ClassMove>[]
  awardCategories: Owned<AwardCategory>[]
  awards: Owned<Award>[]
  homework: Owned<Homework>[]
  homeworkStatus: Owned<HomeworkStatus>[]
  slots: BookingSlot[]
  bookings: Booking[]
  messages: Message[]
  lessons: Lesson[]
  categories: Category[]
  users: DemoUser[]
  purchases: Purchase[]
  inquiries: Inquiry[]
  sessionUserId: string | null
}

export const DEMO_ADMIN = { email: 'admin@demo.com', password: 'demo1234' }
export const DEMO_TEACHER = { email: 'teacher@demo.com', password: 'demo1234' }

const KEY = 'convomastery-demo-v13'
const memory: { db: DemoDb | null } = { db: null }

function fresh(): DemoDb {
  return {
    ...seedTeaching(),
    lessons: structuredClone(seedLessons),
    categories: structuredClone(seedCategories),
    users: [
      { id: 'u-admin', email: DEMO_ADMIN.email, password: DEMO_ADMIN.password, fullName: 'Larbi (admin)', userType: 'ESL teacher', role: 'admin' },
      { id: 'u-teacher', email: DEMO_TEACHER.email, password: DEMO_TEACHER.password, fullName: 'Demo Teacher', userType: 'Online tutor', role: 'customer' },
    ],
    purchases: [
      { id: 'p-1', userId: 'u-teacher', lessonId: 'les-lucky-breaks', amountCents: 0, currency: 'USD', provider: 'free', createdAt: new Date(Date.UTC(2026, 9, 2)).toISOString() },
    ],
    inquiries: [
      { id: 'i-1', name: 'Maria Lopez', email: 'maria@example.com', kind: 'Lesson materials', userType: 'Online tutor', message: 'Do you have lessons for complete beginners? Most of my students are A1.', handled: false, createdAt: new Date(Date.UTC(2026, 9, 12)).toISOString() },
    ],
    sessionUserId: null,
  }
}

export function load(): DemoDb {
  if (memory.db) return memory.db
  try {
    const raw = localStorage.getItem(KEY)
    memory.db = raw ? (JSON.parse(raw) as DemoDb) : fresh()
  } catch {
    memory.db = fresh()
  }
  return memory.db
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(memory.db)) } catch { /* storage unavailable: keep in memory */ }
  listeners.forEach((cb) => cb(currentSession()))
}

export function resetDemo() {
  memory.db = fresh()
  save()
}

const listeners = new Set<(s: Session | null) => void>()
export const uid = () => Math.random().toString(36).slice(2, 10)
export const wait = (ms = 150) => new Promise((r) => setTimeout(r, ms))

export function currentUser(): DemoUser | null {
  const db = load()
  return db.users.find((u) => u.id === db.sessionUserId) ?? null
}
function currentSession(): Session | null {
  const u = currentUser()
  return u ? { userId: u.id, email: u.email, emailConfirmed: true } : null
}
export function requireUser() {
  const u = currentUser()
  if (!u) throw new Error('Sign in to continue.')
  return u
}
export function requireAdmin() {
  const u = requireUser()
  if (u.role !== 'admin') throw new Error('Only admins can do this.')
  return u
}
function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Could not read that file.'))
    r.readAsDataURL(file)
  })
}

export const demoCore: CoreApi = {
  mode: 'demo',

  async listLessons(opts) {
    await wait(80)
    const all = load().lessons
    return opts?.includeUnpublished ? all : all.filter((l) => l.published)
  },
  async getLessonBySlug(slug) {
    await wait(80)
    const l = load().lessons.find((x) => x.slug === slug)
    if (!l) return null
    if (!l.published && currentUser()?.role !== 'admin') return null
    return l
  },
  async listCategories() {
    return load().categories
  },

  async getSession() { return currentSession() },
  onAuthChange(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },
  async signUp({ email, password, fullName, userType }) {
    await wait()
    const db = load()
    const e = email.trim().toLowerCase()
    if (db.users.some((u) => u.email === e)) throw new Error('An account with this email already exists. Sign in instead.')
    if (password.length < 8) throw new Error('Use at least 8 characters for your password.')
    const user: DemoUser = { id: 'u-' + uid(), email: e, password, fullName, userType, role: 'customer' }
    db.users.push(user)
    db.sessionUserId = user.id
    save()
    return { needsVerification: false }
  },
  async signIn(email, password) {
    await wait()
    const db = load()
    const u = db.users.find((x) => x.email === email.trim().toLowerCase())
    if (!u || u.password !== password) throw new Error('That email and password do not match.')
    db.sessionUserId = u.id
    save()
  },
  async signOut() {
    load().sessionUserId = null
    save()
  },
  async sendPasswordReset() { await wait() },
  async updatePassword(password) {
    const u = requireUser()
    if (password.length < 8) throw new Error('Use at least 8 characters for your password.')
    u.password = password
    save()
  },
  async getProfile() {
    const u = currentUser()
    if (!u) return null
    const { password: _pw, ...profile } = u
    return profile
  },
  async updateProfile({ fullName, userType }) {
    const u = requireUser()
    u.fullName = fullName
    u.userType = userType
    save()
  },

  async listMyPurchases() {
    const u = currentUser()
    if (!u) return []
    return load().purchases.filter((p) => p.userId === u.id)
  },
  async startCheckout(lesson) {
    await wait(400)
    const u = requireUser()
    const db = load()
    if (!db.purchases.some((p) => p.userId === u.id && p.lessonId === lesson.id)) {
      db.purchases.push({
        id: 'p-' + uid(), userId: u.id, lessonId: lesson.id, amountCents: lesson.priceCents,
        currency: lesson.currency, provider: lesson.priceCents === 0 ? 'free' : 'demo', createdAt: new Date().toISOString(),
      })
      save()
    }
    return { completed: true }
  },
  async getDownloadUrl(lesson) {
    const u = requireUser()
    const owns = load().purchases.some((p) => p.userId === u.id && p.lessonId === lesson.id)
    if (!owns && u.role !== 'admin') throw new Error('Buy this lesson to download it.')
    const text = `${lesson.title}\n\nThis is a demo download. On the live site this is the real lesson file (${lesson.fileName ?? 'lesson.pptx'}).`
    return URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  },

  async submitInquiry(input) {
    await wait()
    load().inquiries.unshift({ ...input, id: 'i-' + uid(), handled: false, createdAt: new Date().toISOString() })
    save()
  },

  async saveLesson(input) {
    requireAdmin()
    const db = load()
    if (db.lessons.some((l) => l.slug === input.slug && l.id !== input.id)) throw new Error('Another lesson already uses this web address. Change the slug.')
    if (input.id) {
      const i = db.lessons.findIndex((l) => l.id === input.id)
      db.lessons[i] = { ...db.lessons[i], ...input, id: input.id }
      save()
      return db.lessons[i]
    }
    const lesson: Lesson = { ...input, id: 'les-' + uid(), createdAt: new Date().toISOString() }
    db.lessons.unshift(lesson)
    save()
    return lesson
  },
  async deleteLesson(id) {
    requireAdmin()
    const db = load()
    db.lessons = db.lessons.filter((l) => l.id !== id)
    save()
  },
  async uploadLessonFile(slug, file) {
    requireAdmin()
    await wait(300)
    return { path: `${slug}/${file.name}`, name: file.name }
  },
  async uploadImage(file) {
    requireAdmin()
    if (file.size > 2_000_000) throw new Error('In demo mode, images must be under 2 MB.')
    return readAsDataUrl(file)
  },
  async saveCategory(input) {
    requireAdmin()
    const db = load()
    if (input.id) {
      const i = db.categories.findIndex((c) => c.id === input.id)
      db.categories[i] = { ...input, id: input.id }
      save()
      return db.categories[i]
    }
    const c: Category = { ...input, id: 'cat-' + uid() }
    db.categories.push(c)
    save()
    return c
  },
  async deleteCategory(id) {
    requireAdmin()
    const db = load()
    db.categories = db.categories.filter((c) => c.id !== id)
    db.lessons.forEach((l) => { if (l.categoryId === id) l.categoryId = null })
    save()
  },
  async listInquiries() {
    requireAdmin()
    return load().inquiries
  },
  async setInquiryHandled(id, handled) {
    requireAdmin()
    const q = load().inquiries.find((x) => x.id === id)
    if (q) q.handled = handled
    save()
  },
  async listOrders() {
    requireAdmin()
    const db = load()
    return db.purchases
      .map((p) => ({
        ...p,
        userEmail: db.users.find((u) => u.id === p.userId)?.email,
        lessonTitle: db.lessons.find((l) => l.id === p.lessonId)?.title,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
}
