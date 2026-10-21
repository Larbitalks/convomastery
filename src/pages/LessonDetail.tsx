import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LessonCard } from '../components/LessonCard'
import { LessonCover } from '../components/LessonCover'
import { ShareButtons } from '../components/ShareButtons'
import { Notice, Spinner } from '../components/ui'
import { trackEvent } from '../lib/analytics'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { config } from '../lib/config'
import { errorMessage, formatPrice } from '../lib/format'
import { useLoad } from '../lib/hooks'
import { Seo } from '../lib/seo'
import type { Lesson } from '../lib/types'
import NotFound from './NotFound'

export function Description({ text }: { text: string }) {
  // Blank lines separate blocks. A block with several lines becomes a list.
  return (
    <div className="prose-lesson">
      {text.split(/\n\s*\n/).map((block, i) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
        if (lines.length > 1) {
          const [first, ...rest] = lines
          const intro = first.endsWith(':')
          return (
            <div key={i} className="mb-4">
              {intro && <p className="mb-2">{first}</p>}
              <ul className="grid gap-1.5">
                {(intro ? rest : lines).map((l) => (
                  <li key={l} className="flex gap-3"><span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-teal" />{l}</li>
                ))}
              </ul>
            </div>
          )
        }
        return <p key={i}>{lines[0]}</p>
      })}
    </div>
  )
}

export async function downloadLesson(lesson: Lesson) {
  const url = await api.getDownloadUrl(lesson)
  const a = document.createElement('a')
  a.href = url
  a.download = api.mode === 'demo' ? `${lesson.title} (demo).txt` : lesson.fileName ?? ''
  document.body.appendChild(a)
  a.click()
  a.remove()
  trackEvent('lesson_download', { lesson: lesson.slug })
}

export default function LessonDetail() {
  const { slug = '' } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justBought, setJustBought] = useState(false)

  const { data, loading, reload } = useLoad(async () => {
    const lesson = await api.getLessonBySlug(slug)
    if (!lesson) return null
    const [purchases, all] = await Promise.all([api.listMyPurchases(), api.listLessons()])
    const related = all.filter((l) => l.id !== lesson.id && (l.categoryId === lesson.categoryId || l.ageGroup === lesson.ageGroup)).slice(0, 3)
    return { lesson, owned: purchases.some((p) => p.lessonId === lesson.id), related }
  }, [slug, session?.userId])

  if (loading && !data) return <Spinner />
  if (!data) return <NotFound />
  const { lesson, owned, related } = data
  const isFree = lesson.priceCents === 0

  const buy = async () => {
    setError(null)
    if (!session) {
      navigate(`/signup?next=${encodeURIComponent(`/lessons/${lesson.slug}`)}`)
      return
    }
    setBusy(true)
    try {
      trackEvent('begin_checkout', { lesson: lesson.slug, value: lesson.priceCents / 100, currency: lesson.currency })
      const res = await api.startCheckout(lesson)
      if (res.url) { window.location.href = res.url; return }
      setJustBought(true)
      trackEvent('purchase', { lesson: lesson.slug, value: lesson.priceCents / 100, currency: lesson.currency })
      await reload()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const download = async () => {
    setError(null)
    setBusy(true)
    try { await downloadLesson(lesson) } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }

  const price = formatPrice(lesson.priceCents, lesson.currency)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: lesson.title,
    description: lesson.summary,
    image: lesson.coverImageUrl ?? undefined,
    brand: config.siteName,
    offers: { '@type': 'Offer', price: (lesson.priceCents / 100).toFixed(2), priceCurrency: lesson.currency, availability: 'https://schema.org/InStock' },
  }

  return (
    <div className="wrap py-10">
      <Seo title={`${lesson.title}: ${lesson.level} ESL speaking lesson for ${lesson.ageGroup.toLowerCase()}`} description={`${lesson.summary} A ready-to-teach conversational English lesson with discussion questions, vocabulary, dilemmas and a debate.`} image={lesson.coverImageUrl} jsonLd={jsonLd} />

      <nav className="text-[15px] text-inksoft" aria-label="Breadcrumb">
        <Link to="/lessons" className="underline underline-offset-2 hover:text-ink">Lessons</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span>{lesson.title}</span>
      </nav>

      {!lesson.published && <div className="mt-4"><Notice>This lesson is a draft. Only admins can see it.</Notice></div>}

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <LessonCover lesson={lesson} size="lg" />
          {lesson.previewImages.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {lesson.previewImages.map((src) => (
                <a key={src} href={src} target="_blank" rel="noopener noreferrer"><img src={src} alt={`Slide preview from ${lesson.title}`} className="aspect-[4/3] w-full rounded-xl border-2 border-line object-cover" loading="lazy" /></a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold">{lesson.title}</h1>
          <p className="mt-3 text-[19px] text-inksoft">{lesson.summary}</p>

          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border-2 border-line bg-line sm:grid-cols-4">
            {[
              ['Level', lesson.level],
              ['Students', lesson.ageGroup],
              ['Length', `${lesson.durationMinutes} min`],
              ['Slides', String(lesson.slideCount)],
            ].map(([k, v]) => (
              <div key={k} className="bg-white px-4 py-3">
                <dt className="text-sm text-inksoft">{k}</dt>
                <dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 panel p-5">
            {justBought && <div className="mb-4"><Notice tone="success">{isFree ? 'Added to your library.' : 'Payment complete. The lesson is in your library.'} Download it below.</Notice></div>}
            {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
            {owned ? (
              <div className="flex flex-wrap items-center gap-3">
                <button className="btn-primary !px-6 !py-3" onClick={download} disabled={busy}>{busy ? 'Preparing download' : 'Download lesson'}</button>
                <Link to={`/teach/${lesson.slug}`} className="btn-sun !px-6 !py-3">Teach from the website</Link>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="font-display text-3xl font-extrabold">{price}</p>
                <button className="btn-primary !px-6 !py-3" onClick={buy} disabled={busy}>
                  {busy ? 'One moment' : isFree ? (session ? 'Add to my library' : 'Sign up to download free') : session ? `Buy for ${price}` : 'Sign up to buy'}
                </button>
              </div>
            )}
            <p className="mt-3 text-sm text-inksoft">PowerPoint file ({lesson.fileName ?? '.pptx'}). One-time purchase: download it any time, or teach it straight from the website with a timer, name picker and class awards.</p>
          </div>

          {lesson.activityTypes.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-bold">Activities in this lesson</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {lesson.activityTypes.map((a) => <li key={a}><Link to={`/lessons?activity=${encodeURIComponent(a)}`} className="chip border-line hover:border-teal">{a}</Link></li>)}
              </ul>
            </div>
          )}
          <div className="mt-6"><ShareButtons title={lesson.title} imageUrl={lesson.coverImageUrl} /></div>
        </div>
      </div>

      <div className="mt-16 grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        <section>
          <h2 className="text-2xl font-extrabold">About this lesson</h2>
          <div className="mt-4 max-w-[68ch]"><Description text={lesson.description} /></div>
        </section>
        {lesson.sampleQuestions.length > 0 && (
          <section>
            <h2 className="text-2xl font-extrabold">Questions your students will discuss</h2>
            <ul className="mt-5 grid gap-4">
              {lesson.sampleQuestions.map((q) => (
                <li key={q} className="rounded-2xl rounded-bl-sm border-2 border-ink bg-sun-light px-5 py-4 font-display text-xl font-bold">{q}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="text-2xl font-extrabold">You might also like</h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((l) => <LessonCard key={l.id} lesson={l} />)}
          </div>
        </section>
      )}
    </div>
  )
}
