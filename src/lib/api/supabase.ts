// Live backend: Supabase for accounts, database and file storage.
import { createClient, type User } from '@supabase/supabase-js'
import { config } from '../config'
import type { CoreApi, Category, Inquiry, Lesson, Profile, Purchase, Session } from '../types'

export const supabase = createClient(config.supabaseUrl || 'http://localhost', config.supabaseAnonKey || 'missing')

type Row = Record<string, any>

const toLesson = (r: Row): Lesson => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  summary: r.summary ?? '',
  description: r.description ?? '',
  level: r.level,
  ageGroup: r.age_group,
  categoryId: r.category_id,
  topics: r.topics ?? [],
  activityTypes: r.activity_types ?? [],
  sampleQuestions: r.sample_questions ?? [],
  priceCents: r.price_cents,
  currency: r.currency,
  slideCount: r.slide_count ?? 0,
  durationMinutes: r.duration_minutes ?? 60,
  coverColor: r.cover_color ?? '#0E7C7B',
  coverImageUrl: r.cover_image_url,
  previewImages: r.preview_images ?? [],
  slideImages: r.slide_images ?? [],
  filePath: r.file_path,
  fileName: r.file_name,
  published: r.published,
  featured: r.featured,
  createdAt: r.created_at,
})

const fromLesson = (l: Partial<Lesson>): Row => ({
  slug: l.slug,
  title: l.title,
  summary: l.summary,
  description: l.description,
  level: l.level,
  age_group: l.ageGroup,
  category_id: l.categoryId,
  topics: l.topics,
  activity_types: l.activityTypes,
  sample_questions: l.sampleQuestions,
  price_cents: l.priceCents,
  currency: l.currency,
  slide_count: l.slideCount,
  duration_minutes: l.durationMinutes,
  cover_color: l.coverColor,
  cover_image_url: l.coverImageUrl,
  preview_images: l.previewImages,
  slide_images: l.slideImages,
  file_path: l.filePath,
  file_name: l.fileName,
  published: l.published,
  featured: l.featured,
})

const toPurchase = (r: Row): Purchase => ({
  id: r.id,
  userId: r.user_id,
  lessonId: r.lesson_id,
  amountCents: r.amount_cents,
  currency: r.currency,
  provider: r.provider,
  createdAt: r.created_at,
  userEmail: r.profiles?.email,
  lessonTitle: r.lessons?.title,
})

const toInquiry = (r: Row): Inquiry => ({
  id: r.id, name: r.name, email: r.email, kind: r.kind, userType: r.user_type,
  message: r.message, handled: r.handled, createdAt: r.created_at,
})

const toSession = (u: User | null | undefined): Session | null =>
  u ? { userId: u.id, email: u.email ?? '', emailConfirmed: Boolean(u.email_confirmed_at) } : null

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

const origin = () => window.location.origin

export const supabaseCore: CoreApi = {
  mode: 'live',

  async listLessons(opts) {
    let q = supabase.from('lessons').select('*').order('created_at', { ascending: false })
    if (!opts?.includeUnpublished) q = q.eq('published', true)
    return check(await q).map(toLesson)
  },
  async getLessonBySlug(slug) {
    const row = check(await supabase.from('lessons').select('*').eq('slug', slug).maybeSingle())
    return row ? toLesson(row) : null
  },
  async listCategories() {
    return check(await supabase.from('categories').select('*').order('name')) as Category[]
  },

  async getSession() {
    const { data } = await supabase.auth.getSession()
    return toSession(data.session?.user)
  },
  onAuthChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => cb(toSession(s?.user)))
    return () => data.subscription.unsubscribe()
  },
  async signUp({ email, password, fullName, userType }) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, user_type: userType }, emailRedirectTo: `${origin()}/library` },
    })
    if (error) throw new Error(error.message)
    return { needsVerification: !data.session }
  },
  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'That email and password do not match.' : error.message)
  },
  async signOut() { await supabase.auth.signOut() },
  async sendPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin()}/reset-password` })
    if (error) throw new Error(error.message)
  },
  async updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw new Error(error.message)
  },
  async getProfile() {
    const { data: u } = await supabase.auth.getUser()
    if (!u.user) return null
    const r = check(await supabase.from('profiles').select('*').eq('id', u.user.id).maybeSingle()) as Row | null
    if (!r) return null
    return { id: r.id, email: r.email, fullName: r.full_name ?? '', userType: r.user_type, role: r.role } as Profile
  },
  async updateProfile({ fullName, userType }) {
    const { data: u } = await supabase.auth.getUser()
    if (!u.user) throw new Error('Sign in to continue.')
    check(await supabase.from('profiles').update({ full_name: fullName, user_type: userType }).eq('id', u.user.id))
  },

  async listMyPurchases() {
    const { data: u } = await supabase.auth.getUser()
    if (!u.user) return []
    return check(await supabase.from('purchases').select('*').eq('user_id', u.user.id)).map(toPurchase)
  },
  async startCheckout(lesson) {
    if (lesson.priceCents === 0) {
      check(await supabase.rpc('claim_free_lesson', { p_lesson_id: lesson.id }))
      return { completed: true }
    }
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        lessonId: lesson.id,
        successUrl: `${origin()}/checkout/success?lesson=${encodeURIComponent(lesson.slug)}`,
        cancelUrl: `${origin()}/lessons/${lesson.slug}`,
      },
    })
    if (error) throw new Error('Payment could not start. Try again in a moment.')
    return { url: data.url as string }
  },
  async getDownloadUrl(lesson) {
    if (!lesson.filePath) throw new Error('This lesson has no file yet.')
    const { data, error } = await supabase.storage.from('lesson-files').createSignedUrl(lesson.filePath, 120, {
      download: lesson.fileName ?? true,
    })
    if (error) throw new Error('Buy this lesson to download it.')
    return data.signedUrl
  },

  async submitInquiry(input) {
    const id = crypto.randomUUID()
    check(await supabase.from('inquiries').insert({
      id, name: input.name, email: input.email, kind: input.kind, user_type: input.userType, message: input.message,
    }))
    // Email notification to the site owner. The message is already saved, so a failure here is not shown.
    supabase.functions.invoke('notify-inquiry', { body: { id } }).catch(() => {})
  },

  async saveLesson(input) {
    const row = fromLesson(input)
    const res = input.id
      ? await supabase.from('lessons').update(row).eq('id', input.id).select().single()
      : await supabase.from('lessons').insert(row).select().single()
    if (res.error?.code === '23505') throw new Error('Another lesson already uses this web address. Change the slug.')
    return toLesson(check(res))
  },
  async deleteLesson(id) {
    check(await supabase.from('lessons').delete().eq('id', id))
  },
  async uploadLessonFile(slug, file) {
    const path = `${slug}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`
    check(await supabase.storage.from('lesson-files').upload(path, file, { upsert: false }))
    return { path, name: file.name }
  },
  async uploadImage(file) {
    const path = `${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`
    check(await supabase.storage.from('public-images').upload(path, file, { cacheControl: '31536000' }))
    return supabase.storage.from('public-images').getPublicUrl(path).data.publicUrl
  },
  async saveCategory(input) {
    const row = { name: input.name, slug: input.slug, description: input.description }
    const res = input.id
      ? await supabase.from('categories').update(row).eq('id', input.id).select().single()
      : await supabase.from('categories').insert(row).select().single()
    return check(res) as Category
  },
  async deleteCategory(id) {
    check(await supabase.from('categories').delete().eq('id', id))
  },
  async listInquiries() {
    return check(await supabase.from('inquiries').select('*').order('created_at', { ascending: false })).map(toInquiry)
  },
  async setInquiryHandled(id, handled) {
    check(await supabase.from('inquiries').update({ handled }).eq('id', id))
  },
  async listOrders() {
    return check(
      await supabase.from('purchases').select('*, profiles(email), lessons(title)').order('created_at', { ascending: false }),
    ).map(toPurchase)
  },
}
