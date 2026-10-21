import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AwardBoard } from '../components/AwardBoard'
import { Logo } from '../components/Logo'
import { Notice, Select, Spinner } from '../components/ui'
import { trackEvent } from '../lib/analytics'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { errorMessage } from '../lib/format'
import { useLoad } from '../lib/hooks'
import { Seo } from '../lib/seo'
import type { Lesson, Student } from '../lib/types'

type Slide = { kind: 'image'; src: string } | { kind: 'built'; render: () => ReactNode }

/** When a lesson has no slide images yet, build simple discussion slides from its details. */
function builtSlides(lesson: Lesson): Slide[] {
  const slides: Slide[] = [{
    kind: 'built', render: () => (
      <div className="flex h-full flex-col justify-end p-[6%] text-white" style={{ backgroundColor: lesson.coverColor }}>
        <p className="text-[2.2vmin] font-bold opacity-80">{lesson.level}, {lesson.ageGroup}</p>
        <h1 className="mt-2 font-display text-[9vmin] font-extrabold leading-none text-white">{lesson.title}</h1>
        <p className="mt-4 max-w-[70%] text-[3vmin] opacity-90">{lesson.summary}</p>
      </div>
    ),
  }]
  lesson.sampleQuestions.forEach((q, i) => slides.push({
    kind: 'built', render: () => (
      <div className="flex h-full flex-col justify-center bg-board p-[8%]">
        <p className="text-[2.4vmin] font-bold text-inksoft">Discuss, question {i + 1} of {lesson.sampleQuestions.length}</p>
        <div className="mt-4 rounded-[3vmin] border-[0.5vmin] border-ink bg-sun p-[5%] shadow-[1.2vmin_1.2vmin_0_#1B2A4A]">
          <p className="font-display text-[6vmin] font-bold leading-tight">{q}</p>
        </div>
      </div>
    ),
  }))
  slides.push({
    kind: 'built', render: () => (
      <div className="flex h-full flex-col items-center justify-center bg-ink p-[8%] text-center text-white">
        <p className="font-display text-[8vmin] font-extrabold text-white">Thank you!</p>
        <p className="mt-3 text-[3.4vmin] opacity-80">Do you have any questions?</p>
      </div>
    ),
  })
  return slides
}

function useTimer() {
  const [total, setTotal] = useState(0)
  const [left, setLeft] = useState(0)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setLeft((l) => {
      if (l <= 1) { setRunning(false); return 0 }
      return l - 1
    }), 1000)
    return () => clearInterval(t)
  }, [running])
  return {
    total, left, running,
    start: (s: number) => { setTotal(s); setLeft(s); setRunning(true) },
    toggle: () => setRunning((r) => !r && left > 0),
    reset: () => { setRunning(false); setLeft(0); setTotal(0) },
  }
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function Teach() {
  const { slug = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const classId = params.get('class') ?? ''

  const { data, loading, error } = useLoad(async () => {
    const lesson = await api.getLessonBySlug(slug)
    if (!lesson) throw new Error('This lesson does not exist.')
    const purchases = await api.listMyPurchases()
    if (!isAdmin && !purchases.some((p) => p.lessonId === lesson.id)) throw new Error('Get this lesson first to teach it from the website.')
    const urls = await api.getSlideUrls(lesson)
    const classes = await api.listClasses()
    return { lesson, classes, slides: urls.length ? urls.map((src): Slide => ({ kind: 'image', src })) : builtSlides(lesson), auto: urls.length === 0 }
  }, [slug, isAdmin])

  const [i, setI] = useState(0)
  const [panel, setPanel] = useState<'none' | 'awards' | 'timer' | 'pick'>('none')
  const [strip, setStrip] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const timer = useTimer()
  const count = data?.slides.length ?? 0
  const go = useCallback((d: number) => setI((x) => Math.min(Math.max(0, x + d), Math.max(0, count - 1))), [count])

  useEffect(() => { if (data) trackEvent('teach_start', { lesson: data.lesson.slug }) }, [data])

  const fullscreen = useCallback(() => {
    const el = document.documentElement
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else el.requestFullscreen?.().catch(() => {})
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(1) }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1) }
      else if (e.key === 'Home') setI(0)
      else if (e.key === 'End') setI(count - 1)
      else if (e.key.toLowerCase() === 'f') fullscreen()
      else if (e.key.toLowerCase() === 't') setPanel((p) => (p === 'timer' ? 'none' : 'timer'))
      else if (e.key.toLowerCase() === 'p') setPanel((p) => (p === 'pick' ? 'none' : 'pick'))
      else if (e.key.toLowerCase() === 'a') setPanel((p) => (p === 'awards' ? 'none' : 'awards'))
      else if (e.key === 'Escape') setPanel('none')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, count, fullscreen])

  // Preload the next slide image so moving forward is instant
  useEffect(() => {
    const next = data?.slides[i + 1]
    if (next?.kind === 'image') { const img = new Image(); img.src = next.src }
  }, [i, data])

  if (loading) return <div className="min-h-screen bg-ink"><Spinner label="Opening lesson" /></div>
  if (error || !data) {
    return (
      <div className="wrap py-20">
        <Seo title="Teach" noindex />
        <Notice tone="error">{error}</Notice>
        <div className="mt-6 flex gap-3"><Link to={`/lessons/${slug}`} className="btn-primary">Go to the lesson page</Link><Link to="/library" className="btn-ghost">My library</Link></div>
      </div>
    )
  }

  const { lesson, slides, classes, auto } = data
  const slide = slides[i]
  const cls = classes.find((c) => c.id === classId)
  const btn = (active: boolean) => `rounded-full px-3.5 py-2 text-[14px] font-bold ${active ? 'bg-sun text-ink' : 'bg-white/10 text-white hover:bg-white/20'}`

  return (
    <div className="flex h-screen flex-col bg-[#0F1A30] text-white">
      <Seo title={`Teaching ${lesson.title}`} noindex />
      <header className="flex flex-wrap items-center gap-2 px-4 py-2.5">
        <Link to="/" aria-label="ConvoMastery home" className="hidden sm:block [&_span]:!text-white [&_path]:stroke-white"><Logo className="!text-[18px]" /></Link>
        <p className="min-w-0 flex-1 truncate font-bold sm:ml-4">{lesson.title}</p>
        {timer.total > 0 && (
          <button onClick={() => setPanel('timer')} className={`rounded-full px-3.5 py-2 font-display text-lg font-extrabold tabular-nums ${timer.left === 0 ? 'animate-pulse bg-coral' : 'bg-white/10'}`} aria-label="Timer">
            {timer.left === 0 ? "Time's up" : mmss(timer.left)}
          </button>
        )}
        <button className={btn(panel === 'timer')} onClick={() => setPanel(panel === 'timer' ? 'none' : 'timer')}>Timer</button>
        <button className={btn(panel === 'pick')} onClick={() => setPanel(panel === 'pick' ? 'none' : 'pick')}>Pick a student</button>
        <button className={btn(panel === 'awards')} onClick={() => setPanel(panel === 'awards' ? 'none' : 'awards')}>Awards</button>
        <button className={btn(false)} onClick={fullscreen}>Full screen</button>
        <button className={btn(false)} onClick={() => navigate(cls ? `/classes/${cls.id}` : '/library')}>End lesson</button>
      </header>

      {auto && i === 0 && (
        <p className="mx-4 mb-2 rounded-lg bg-white/10 px-3 py-2 text-[14px]">
          {isAdmin ? 'This lesson has no slide images yet, so simple discussion slides are shown. Upload the slides in the admin area to teach the full lesson here.' : 'Showing the discussion questions for this lesson. The full slides will appear here once they are added.'}
        </p>
      )}

      <div className="flex min-h-0 flex-1 gap-3 px-3 pb-3">
        <div ref={stageRef} className="relative flex min-w-0 flex-1 items-center justify-center">
          <div className="relative aspect-video max-h-full w-full max-w-full overflow-hidden rounded-xl bg-white text-ink shadow-2xl" style={{ maxWidth: 'calc((100vh - 170px) * 16 / 9)' }}>
            {slide.kind === 'image'
              ? <img src={slide.src} alt={`Slide ${i + 1} of ${count}`} className="h-full w-full object-contain" />
              : slide.render()}
          </div>
          <button onClick={() => go(-1)} disabled={i === 0} aria-label="Previous slide" className="absolute left-0 top-0 h-full w-[12%] cursor-w-resize opacity-0" />
          <button onClick={() => go(1)} disabled={i === count - 1} aria-label="Next slide" className="absolute right-0 top-0 h-full w-[12%] cursor-e-resize opacity-0" />
        </div>

        {panel !== 'none' && (
          <aside className="w-full max-w-[340px] shrink-0 overflow-y-auto rounded-xl bg-white p-4 text-ink" aria-label="Teaching tools">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">{{ awards: 'Awards', timer: 'Timer', pick: 'Pick a student' }[panel]}</h2>
              <button className="text-sm font-bold underline" onClick={() => setPanel('none')}>Close</button>
            </div>
            {panel === 'timer' && <TimerPanel timer={timer} />}
            {(panel === 'awards' || panel === 'pick') && (
              <ClassChooser classes={classes} classId={classId} onChange={(id) => setParams(id ? { class: id } : {}, { replace: true })} />
            )}
            {panel === 'awards' && cls && <div className="mt-4"><AwardBoard classId={cls.id} lessonId={lesson.id} compact /></div>}
            {panel === 'pick' && cls && <Picker classId={cls.id} />}
          </aside>
        )}
      </div>

      <footer className="flex items-center gap-3 border-t border-white/10 px-4 py-2">
        <button className={btn(false)} onClick={() => go(-1)} disabled={i === 0}>Previous</button>
        <p className="tabular-nums text-[15px]" aria-live="polite">Slide {i + 1} of {count}</p>
        <button className="rounded-full bg-sun px-5 py-2 text-[14px] font-bold text-ink disabled:opacity-50" onClick={() => go(1)} disabled={i === count - 1}>Next</button>
        <button className={`${btn(strip)} ml-auto`} onClick={() => setStrip(!strip)} aria-expanded={strip}>All slides</button>
        <p className="hidden text-[13px] text-white/60 lg:block">Keys: arrows to move, F full screen, T timer, P pick, A awards</p>
      </footer>
      {strip && (
        <nav className="flex gap-2 overflow-x-auto border-t border-white/10 px-4 py-3" aria-label="All slides">
          {slides.map((s, n) => (
            <button key={n} onClick={() => setI(n)} aria-current={n === i ? 'true' : undefined} aria-label={`Go to slide ${n + 1}`}
              className={`relative aspect-video w-32 shrink-0 overflow-hidden rounded-md border-2 bg-white ${n === i ? 'border-sun' : 'border-transparent opacity-70 hover:opacity-100'}`}>
              {s.kind === 'image' ? <img src={s.src} alt="" className="h-full w-full object-cover" loading="lazy" /> : <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-ink">{n + 1}</span>}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}

function ClassChooser({ classes, classId, onChange }: { classes: { id: string; name: string }[]; classId: string; onChange: (id: string) => void }) {
  if (!classes.length) return <p className="text-[15px] text-inksoft">Create a class with your students to give awards and pick names. <Link to="/classes" className="font-bold underline">Go to classes</Link></p>
  return (
    <div>
      <label htmlFor="teachClass" className="label">Class</label>
      <Select id="teachClass" value={classId} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose the class you are teaching</option>
        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
    </div>
  )
}

function TimerPanel({ timer }: { timer: ReturnType<typeof useTimer> }) {
  return (
    <div className="grid gap-4">
      <p className="text-center font-display text-6xl font-extrabold tabular-nums">{mmss(timer.left)}</p>
      {timer.total > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-board" aria-hidden="true">
          <div className="h-full bg-teal transition-[width] duration-1000 ease-linear" style={{ width: `${(timer.left / timer.total) * 100}%` }} />
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {[30, 60, 120, 180, 300, 600].map((s) => (
          <button key={s} className="btn-ghost !px-2" onClick={() => timer.start(s)}>{s < 60 ? `${s} sec` : `${s / 60} min`}</button>
        ))}
      </div>
      {timer.total > 0 && (
        <div className="flex gap-2">
          <button className="btn-primary flex-1" onClick={timer.toggle} disabled={timer.left === 0}>{timer.running ? 'Pause' : 'Resume'}</button>
          <button className="btn-ghost flex-1" onClick={timer.reset}>Clear</button>
        </div>
      )}
    </div>
  )
}

function Picker({ classId }: { classId: string }) {
  const { data, loading } = useLoad(() => api.listStudents(classId), [classId])
  const [picked, setPicked] = useState<Student | null>(null)
  const [used, setUsed] = useState<string[]>([])
  const [spinning, setSpinning] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const pool = useMemo(() => (data ?? []).filter((s) => !used.includes(s.id)), [data, used])

  const pick = () => {
    setErr(null)
    const list = pool.length ? pool : data ?? []
    if (!list.length) { setErr('Add students to this class first.'); return }
    if (!pool.length) setUsed([])
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const final = list[Math.floor(Math.random() * list.length)]
    if (reduce) { setPicked(final); setUsed((u) => [...u, final.id]); return }
    setSpinning(true)
    let n = 0
    const t = setInterval(() => {
      setPicked(list[Math.floor(Math.random() * list.length)])
      if (++n > 10) { clearInterval(t); setPicked(final); setUsed((u) => [...u, final.id]); setSpinning(false) }
    }, 70)
  }

  if (loading) return <Spinner />
  return (
    <div className="mt-4 grid gap-4">
      {err && <Notice tone="error">{err}</Notice>}
      <div className={`flex min-h-[110px] items-center justify-center rounded-2xl border-[3px] border-ink p-4 text-center ${spinning ? 'bg-board' : 'bg-sun'}`} aria-live="polite">
        <p className="font-display text-4xl font-extrabold">{picked?.name ?? 'Who is next?'}</p>
      </div>
      <button className="btn-primary !py-3" onClick={pick} disabled={spinning}>{picked ? 'Pick another student' : 'Pick a student'}</button>
      <p className="text-[14px] text-inksoft">Everyone gets a turn before anyone is picked twice. {pool.length} of {data?.length ?? 0} left this round.</p>
      {used.length > 0 && <button className="justify-self-start text-sm font-bold underline" onClick={() => { setUsed([]); setPicked(null) }}>Start a new round</button>}
    </div>
  )
}
