export type Level = 'A2' | 'B1' | 'B2' | 'C1'
export type AgeGroup = 'Teens' | 'Adults' | 'Young learners'
export type UserType = 'ESL teacher' | 'Online tutor' | 'Parent' | 'School or academy' | 'Other'

export const LEVELS: Level[] = ['A2', 'B1', 'B2', 'C1']
export const AGE_GROUPS: AgeGroup[] = ['Teens', 'Adults', 'Young learners']
export const USER_TYPES: UserType[] = ['ESL teacher', 'Online tutor', 'Parent', 'School or academy', 'Other']
export const ACTIVITY_TYPES = [
  'Discussion questions',
  'Debate',
  'Situations and dilemmas',
  'Role-play',
  'Vocabulary',
  'Project',
] as const

export interface Category {
  id: string
  name: string
  slug: string
  description: string
}

export interface Lesson {
  id: string
  slug: string
  title: string
  summary: string
  description: string
  level: Level
  ageGroup: AgeGroup
  categoryId: string | null
  topics: string[]
  activityTypes: string[]
  sampleQuestions: string[]
  priceCents: number
  currency: string
  slideCount: number
  durationMinutes: number
  coverColor: string
  coverImageUrl: string | null
  previewImages: string[]
  /** Slide images (storage paths) used to teach the lesson from the website, in order. */
  slideImages: string[]
  filePath: string | null
  fileName: string | null
  published: boolean
  featured: boolean
  createdAt: string
}

export interface Profile {
  id: string
  email: string
  fullName: string
  userType: UserType | null
  role: 'customer' | 'admin'
}

export interface Purchase {
  id: string
  userId: string
  lessonId: string
  amountCents: number
  currency: string
  provider: string
  createdAt: string
  userEmail?: string
  lessonTitle?: string
}

export interface Inquiry {
  id: string
  name: string
  email: string
  kind: 'Lesson materials' | 'Partnership or school' | 'Something else'
  userType: string | null
  message: string
  handled: boolean
  createdAt: string
}

export interface Session {
  userId: string
  email: string
  emailConfirmed: boolean
}

export type LessonInput = Omit<Lesson, 'id' | 'createdAt'> & { id?: string }

export interface CheckoutResult {
  /** Redirect the browser here to pay (live mode). */
  url?: string
  /** Purchase recorded immediately (free lesson or demo mode). */
  completed?: boolean
}

export interface CoreApi {
  mode: 'demo' | 'live'
  // catalogue
  listLessons(opts?: { includeUnpublished?: boolean }): Promise<Lesson[]>
  getLessonBySlug(slug: string): Promise<Lesson | null>
  listCategories(): Promise<Category[]>
  // auth
  getSession(): Promise<Session | null>
  onAuthChange(cb: (s: Session | null) => void): () => void
  signUp(input: { email: string; password: string; fullName: string; userType: UserType }): Promise<{ needsVerification: boolean }>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  sendPasswordReset(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
  getProfile(): Promise<Profile | null>
  updateProfile(input: { fullName: string; userType: UserType | null }): Promise<void>
  // purchases
  listMyPurchases(): Promise<Purchase[]>
  startCheckout(lesson: Lesson): Promise<CheckoutResult>
  getDownloadUrl(lesson: Lesson): Promise<string>
  // forms
  submitInquiry(input: Omit<Inquiry, 'id' | 'handled' | 'createdAt'>): Promise<void>
  // admin
  saveLesson(input: LessonInput): Promise<Lesson>
  deleteLesson(id: string): Promise<void>
  uploadLessonFile(lessonSlug: string, file: File): Promise<{ path: string; name: string }>
  uploadImage(file: File): Promise<string>
  saveCategory(input: Omit<Category, 'id'> & { id?: string }): Promise<Category>
  deleteCategory(id: string): Promise<void>
  listInquiries(): Promise<Inquiry[]>
  setInquiryHandled(id: string, handled: boolean): Promise<void>
  listOrders(): Promise<Purchase[]>
}

// ---------- Teaching tools, booking and messaging ----------

export interface ClassGroup { id: string; name: string; level: string; color: string; createdAt: string }
export interface Student {
  id: string; classId: string; name: string; notes: string; createdAt: string
  /** Record details, all optional */
  level: string; contact: string; goals: string
  /** Code that opens this student's read-only progress page; null when sharing is off */
  shareCode: string | null
  /** Whether the progress page shows attendance and behaviour */
  showBehaviour: boolean
}

export type BehaviourType = 'positive' | 'neutral' | 'negative'
export interface BehaviourOption { label: string; color: string; type?: BehaviourType }
export const DEFAULT_BEHAVIOURS: BehaviourOption[] = [
  { label: 'Active', color: '#46725D', type: 'positive' },
  { label: 'Participating well', color: '#2F7F7A', type: 'positive' },
  { label: 'Quiet', color: '#F2CC8F', type: 'neutral' },
  { label: 'Distracted', color: '#D99A3D', type: 'negative' },
  { label: 'Not paying attention', color: '#B42318', type: 'negative' },
  { label: 'Off-task / phone', color: '#8E1C20', type: 'negative' },
]
export type Review = 'yes' | 'partly' | 'no'
/** Dark or white text, whichever reads better on the colour */
export function textOn(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3 ? '#3D405B' : '#FFFFFF'
}

export type Attendance = 'present' | 'late' | 'absent'
export interface BehaviourMark { label: string; color: string; at: string; type?: BehaviourType }
export interface ClassSession {
  id: string; studentId: string; classId: string; date: string
  startedAt: string; endedAt: string | null
  attendance: Attendance; lessonId: string | null
  /** Did the student review the previous lesson? null = not checked */
  review: Review | null
  behaviour: BehaviourMark[]
  covered: string; newWords: string; corrections: string; notes: string
  noteId: string | null; createdAt: string
}
export type SessionPatch = Partial<Pick<ClassSession, 'date' | 'endedAt' | 'attendance' | 'review' | 'lessonId' | 'behaviour' | 'covered' | 'newWords' | 'corrections' | 'notes' | 'noteId'>>
export interface StudentNote { id: string; studentId: string; date: string; body: string; createdAt: string; shared: boolean }

/** What a student or parent sees on their progress page */
export interface StudentProgress {
  name: string
  className: string
  level: string
  totalPoints: number
  categories: { name: string; color: string; points: number }[]
  recentAwards: { date: string; category: string; color: string; points: number; lesson: string | null }[]
  homework: { title: string; instructions: string; dueDate: string; status: HomeworkState; feedback: string }[]
  notes: { date: string; body: string }[]
  /** Only when the teacher has switched behaviour sharing on */
  classes?: {
    date: string; attendance: Attendance; behaviour: { label: string; color: string; count: number }[]
    /** For the overall score (up to 16 classes are sent: 8 shown, 8 more for the trend) */
    review?: Review | null; points?: number; positive?: number; negative?: number
  }[] | null
}

/** 12 random letters and digits (no look-alikes such as O/0 or I/1), shown as ABCD-EFGH-JKLM */
export function newShareCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  const raw = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`
}
export interface AwardCategory { id: string; classId: string; name: string; points: number; color: string; position: number }
export interface Award { id: string; classId: string; studentId: string; categoryId: string; points: number; lessonId: string | null; createdAt: string }

export type HomeworkState = 'assigned' | 'done' | 'late' | 'missing'
export interface Homework { id: string; classId: string; /** The student this homework is for */ studentId: string | null; title: string; instructions: string; dueDate: string; lessonId: string | null; createdAt: string }
export interface HomeworkStatus { homeworkId: string; studentId: string; status: HomeworkState; feedback: string }

export const SLOT_KINDS = ['One-to-one lesson', 'Trial lesson', 'Teacher training'] as const
export type SlotKind = (typeof SLOT_KINDS)[number]
export interface BookingSlot { id: string; startsAt: string; durationMinutes: number; kind: SlotKind; capacity: number; notes: string; bookedCount: number }
export interface Booking {
  id: string; slotId: string; userId: string; status: 'confirmed' | 'cancelled'; message: string; createdAt: string
  slot?: BookingSlot; userEmail?: string; userName?: string
}

export interface Message { id: string; threadUserId: string; fromAdmin: boolean; body: string; createdAt: string; read: boolean }
export interface Thread { userId: string; userEmail: string; userName: string; lastMessage: Message; unread: number }

export const DEFAULT_AWARD_CATEGORIES: Pick<AwardCategory, 'name' | 'points' | 'color'>[] = [
  { name: 'Participation', points: 1, color: '#46725D' },
  { name: 'Great answer', points: 2, color: '#5B6C8F' },
  { name: 'New vocabulary', points: 1, color: '#7A5C8C' },
  { name: 'Teamwork', points: 1, color: '#9A6A1F' },
  { name: 'Homework', points: 2, color: '#3D405B' },
]

export interface TeachApi {
  // classes and students (each teacher sees only their own)
  listClasses(): Promise<ClassGroup[]>
  saveClass(input: Omit<ClassGroup, 'id' | 'createdAt'> & { id?: string }): Promise<ClassGroup>
  deleteClass(id: string): Promise<void>
  listStudents(classId?: string): Promise<Student[]>
  saveStudent(input: Pick<Student, 'classId' | 'name'> & Partial<Pick<Student, 'notes' | 'level' | 'contact' | 'goals'>> & { id?: string }): Promise<Student>
  deleteStudent(id: string): Promise<void>
  listAllAwards(): Promise<Award[]>
  listAllHomeworkStatus(): Promise<HomeworkStatus[]>
  listStudentNotes(studentId?: string): Promise<StudentNote[]>
  addStudentNote(input: { studentId: string; date: string; body: string; shared?: boolean }): Promise<StudentNote>
  deleteStudentNote(id: string): Promise<void>
  setNoteShared(id: string, shared: boolean): Promise<void>
  /** Turn a student's progress code on (new code) or off (null) */
  setStudentShareCode(studentId: string, code: string | null): Promise<void>
  /** Public: read-only progress for a code, or null if the code is wrong or turned off */
  getStudentProgress(code: string): Promise<StudentProgress | null>
  setStudentShowBehaviour(studentId: string, show: boolean): Promise<void>
  // class sessions
  getBehaviourOptions(): Promise<BehaviourOption[]>
  saveBehaviourOptions(options: BehaviourOption[]): Promise<void>
  startClassSession(student: Student): Promise<ClassSession>
  getClassSession(id: string): Promise<ClassSession | null>
  listClassSessions(studentId: string): Promise<ClassSession[]>
  listAllClassSessions(): Promise<ClassSession[]>
  updateClassSession(id: string, patch: SessionPatch): Promise<void>
  deleteClassSession(id: string): Promise<void>
  // awards
  listAwardCategories(classId: string): Promise<AwardCategory[]>
  saveAwardCategory(input: Omit<AwardCategory, 'id'> & { id?: string }): Promise<AwardCategory>
  deleteAwardCategory(id: string): Promise<void>
  listAwards(classId: string): Promise<Award[]>
  giveAward(input: { classId: string; studentId: string; categoryId: string; lessonId?: string | null }): Promise<Award>
  undoAward(id: string): Promise<void>
  // homework
  listHomework(classId?: string): Promise<Homework[]>
  saveHomework(input: Omit<Homework, 'id' | 'createdAt'> & { id?: string }): Promise<Homework>
  deleteHomework(id: string): Promise<void>
  listHomeworkStatus(classId: string): Promise<HomeworkStatus[]>
  setHomeworkStatus(input: HomeworkStatus): Promise<void>
  // teaching from the website
  getSlideUrls(lesson: Lesson): Promise<string[]>
  uploadSlideImages(lessonSlug: string, files: File[]): Promise<string[]>
  // booking
  listSlots(opts?: { includePast?: boolean }): Promise<BookingSlot[]>
  saveSlot(input: Omit<BookingSlot, 'id' | 'bookedCount'> & { id?: string }): Promise<BookingSlot>
  deleteSlot(id: string): Promise<void>
  bookSlot(slotId: string, message: string): Promise<void>
  cancelBooking(id: string): Promise<void>
  listMyBookings(): Promise<Booking[]>
  listAllBookings(): Promise<Booking[]>
  // messaging between customers and the site owner
  listMyMessages(): Promise<Message[]>
  sendMessage(body: string): Promise<void>
  listThreads(): Promise<Thread[]>
  listThreadMessages(userId: string): Promise<Message[]>
  sendAdminMessage(userId: string, body: string): Promise<void>
  markThreadRead(userId: string): Promise<void>
  unreadCount(): Promise<number>
}

export type Api = CoreApi & TeachApi
