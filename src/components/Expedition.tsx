import { useEffect, useRef } from 'react'
import { formatDate } from '../lib/format'
import { tierOf } from '../lib/discoveries'
import { MILESTONES, MOUNTAIN_SIZE, mountainSrc, mountainThumb, seriesOf, trailSpot, type Expedition, type Lucky, type Mountain } from '../lib/expedition'

const url = (src: string) => `${import.meta.env.BASE_URL}${src}`
const pct = (x: number, total: number) => `${(x / total) * 100}%`

/** The mountain picture with the trail, milestones and the student's spot */
export function MountainView({ mountain, steps, cost, className = '', label }: { mountain: Mountain; steps: number; cost: number; className?: string; label?: string }) {
  const [x, y] = trailSpot(mountain, steps, cost)
  const { w, h } = MOUNTAIN_SIZE
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: `${w} / ${h}` }}>
      <img src={url(mountainSrc(mountain))} alt={`${mountain.name}: the trail from Start to the summit`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
        {mountain.ropeFrom !== undefined && (
          <polyline points={mountain.trail.slice(mountain.ropeFrom).map((p) => p.join(',')).join(' ')} fill="none" stroke="#fff" strokeWidth="6" strokeDasharray="4 14" strokeLinecap="round" />
        )}
        {mountain.stops.map((i, k) => {
          const [sx, sy] = mountain.trail[i]
          return <circle key={k} cx={sx} cy={sy} r="13" fill={k === 4 ? '#E9B949' : '#fff'} stroke="#3D405B" strokeWidth="4" />
        })}
      </svg>
      <span className="absolute -translate-x-1/2 -translate-y-full" style={{ left: pct(x, w), top: pct(y, h) }}>
        <span className="block whitespace-nowrap rounded-full bg-[#E07A5F] px-2 py-0.5 text-[11px] font-extrabold text-white shadow-lg ring-2 ring-white">{label ?? 'You'}</span>
        <span className="mx-auto block h-2 w-0.5 bg-white" />
      </span>
    </div>
  )
}

/** Expedition card: current mountain, progress past the milestones, summits and lucky finds */
export function ExpeditionCard({ exp, name, own = false, onOpenMap }: { exp: Expedition; name: string; own?: boolean; onOpenMap?: () => void }) {
  const camp = tierOf(exp.camp)
  const series = seriesOf(exp.camp)
  const nextStop = Math.min(4, Math.floor(exp.steps / (exp.cost / 5)))
  const toNext = Math.ceil((nextStop + 1) * (exp.cost / 5) - exp.steps)
  return (
    <section aria-labelledby="exp-h" className="overflow-hidden rounded-2xl border-2 border-line bg-white">
      <MountainView mountain={exp.mountain} steps={exp.steps} cost={exp.cost} label={own ? 'You' : name} />
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold" style={{ color: camp.color }}>{own ? 'Your expedition' : `${name}'s expedition`}, {camp.camp}</p>
            <h2 id="exp-h" className="text-2xl font-extrabold">{exp.mountain.name}{exp.ascent > 1 ? <span className="text-base font-bold text-inksoft"> (ascent {exp.ascent})</span> : null}</h2>
            <p className="text-[14px] text-inksoft">{exp.mountain.where}{exp.mountain.height ? `, ${exp.mountain.height}` : ''}</p>
          </div>
          {onOpenMap && <button className="btn-ghost !py-1.5" onClick={onOpenMap}>See everyone on the map</button>}
        </div>

        <div className="mt-4">
          <div className="relative h-4 rounded-full bg-board" role="progressbar" aria-valuemin={0} aria-valuemax={exp.cost} aria-valuenow={exp.steps} aria-label={`${exp.steps} of ${exp.cost} steps to the summit`}>
            <div className="h-full rounded-full" style={{ width: pct(Math.max(exp.steps, exp.cost * 0.02), exp.cost), background: 'linear-gradient(90deg,#81B29A,#46725D)' }} />
            {MILESTONES.map((m, k) => (
              <span key={m} className={`absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] ${k < exp.reached ? 'border-ink bg-sage-dark' : k === 4 ? 'border-ink bg-[#E9B949]' : 'border-ink bg-white'}`}
                style={{ left: pct((k + 1) * (exp.cost / 5), exp.cost) }} title={m} />
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-5 text-center text-[11px] font-bold text-inksoft">
            {MILESTONES.map((m, k) => <span key={m} className={k < exp.reached ? 'text-sage-dark' : ''}>{m}</span>)}
          </div>
          <p className="mt-2 text-[15px]"><strong className="tabular-nums">{toNext} {toNext === 1 ? 'step' : 'steps'}</strong> to {MILESTONES[nextStop]}. Every award point is a step.</p>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-inksoft">Summits</h3>
            {exp.summits.length === 0 ? <p className="mt-1 text-[14px] text-inksoft">No summits yet. The first one is waiting at the top of {exp.mountain.name}!</p> : (
              <ul className="mt-2 grid grid-cols-2 gap-2">
                {[...exp.summits].reverse().map((s, i) => (
                  <li key={i} className="overflow-hidden rounded-xl border-2 border-[#E9B949] bg-[#FFF8E6]">
                    <img src={url(mountainThumb(s.mountain))} alt="" className="h-14 w-full object-cover" loading="lazy" />
                    <p className="px-2 pt-1 text-[13px] font-extrabold leading-tight">⛳ {s.mountain.name}{s.ascent > 1 ? ` (${s.ascent})` : ''}</p>
                    <p className="px-2 pb-1.5 text-[11px] text-inksoft">{formatDate(s.date)}</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[12px] text-inksoft">{camp.camp} series: {series.map((m) => m.name).join(', then ')}. More mountains are coming.</p>
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-inksoft">Lucky finds</h3>
            {exp.lucky.length === 0 ? <p className="mt-1 text-[14px] text-inksoft">Keep climbing: lucky finds appear on the trail by surprise and give extra steps.</p> : (
              <ul className="mt-2 grid gap-1.5">
                {[...exp.lucky].reverse().slice(0, 5).map((l, i) => (
                  <li key={i} className="flex items-center gap-2 text-[14px]">
                    <LuckyIcon lucky={l.lucky} className="h-8 w-8 shrink-0" />
                    <span className="flex-1"><strong>{l.lucky.name}</strong> +{l.lucky.steps} steps</span>
                    <span className="text-[12px] text-inksoft">{formatDate(l.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export function LuckyIcon({ lucky, className = '' }: { lucky: Lucky; className?: string }) {
  const art: Record<string, JSX.Element> = {
    'lucky-charm': <><path d="M50 20 C40 6 20 14 26 32 C32 46 50 54 50 54 C50 54 68 46 74 32 C80 14 60 6 50 20Z" fill="#81B29A" /><path d="M50 54 Q46 70 52 84" fill="none" /></>,
    'golden-compass': <><circle cx="50" cy="50" r="34" fill="#E9B949" /><circle cx="50" cy="50" r="24" fill="#F4F1DE" /><path d="M50 30 L57 50 L50 70 L43 50Z" fill="#E07A5F" /></>,
    'secret-shortcut': <><path d="M14 80 Q30 40 50 50 Q70 60 86 20" fill="none" strokeDasharray="6 8" /><path d="M76 16 L88 18 L84 30" fill="none" /><circle cx="14" cy="80" r="6" fill="#E07A5F" /></>,
    'weather-window': <><circle cx="40" cy="42" r="16" fill="#F2CC8F" /><path d="M34 68 Q22 68 24 56 Q26 46 38 50 Q44 38 58 44 Q72 42 72 56 Q80 58 78 66 Q76 72 66 70Z" fill="#fff" /></>,
  }
  return <svg viewBox="0 0 100 100" className={className} aria-hidden="true"><g stroke="#3D405B" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">{art[lucky.id]}</g></svg>
}

export type ExpeditionEvent =
  | { kind: 'summit'; mountain: Mountain; ascent: number }
  | { kind: 'milestone'; mountain: Mountain; stop: number }
  | { kind: 'lucky'; lucky: Lucky }

/** A short celebration for a milestone, a summit or a lucky find */
export function ExpeditionReveal({ event, name, more = 0, onClose }: { event: ExpeditionEvent; name: string; more?: number; onClose: () => void }) {
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    btn.current?.focus()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  const title = event.kind === 'summit' ? 'Summit!' : event.kind === 'milestone' ? `${MILESTONES[event.stop]} reached!` : 'Lucky find!'
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4" role="dialog" aria-modal="true" aria-labelledby="exp-reveal" onClick={onClose}>
      <style>{`@keyframes cm-up { from { opacity: 0; transform: translateY(20px) scale(.95) } to { opacity: 1; transform: none } } .cm-up { animation: cm-up .5s ease-out } @keyframes cm-flag { 0%,100% { transform: rotate(-4deg) } 50% { transform: rotate(6deg) } } .cm-flag { transform-origin: 0 100%; animation: cm-flag 1.2s ease-in-out infinite } @media (prefers-reduced-motion: reduce) { .cm-up, .cm-flag { animation: none } }`}</style>
      <div className="cm-up w-full max-w-md overflow-hidden rounded-3xl bg-white text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {event.kind === 'lucky' ? (
          <div className="grid h-40 place-items-center bg-[#FFF8E6]"><LuckyIcon lucky={event.lucky} className="h-28 w-28" /></div>
        ) : (
          <div className="relative">
            <img src={url(mountainThumb(event.mountain))} alt="" className="h-40 w-full object-cover" />
            {event.kind === 'summit' && <span className="cm-flag absolute left-1/2 top-4 text-5xl" aria-hidden="true">🚩</span>}
          </div>
        )}
        <div className="p-6">
          <p className="text-sm font-extrabold uppercase tracking-wider text-[#9A6A1F]">{title}</p>
          {event.kind === 'summit' && <>
            <h2 id="exp-reveal" className="mt-1 text-2xl font-extrabold">{name} reached the top of {event.mountain.name}!</h2>
            <p className="mt-2 text-[15px] text-inksoft">{event.mountain.height ? `${event.mountain.height}, ` : ''}{event.mountain.where}. It is now in the expedition history. The next mountain is waiting!</p>
          </>}
          {event.kind === 'milestone' && <>
            <h2 id="exp-reveal" className="mt-1 text-2xl font-extrabold">{event.mountain.name}: {MILESTONES[event.stop]}</h2>
            <p className="mt-2 text-[15px] text-inksoft">{event.stop < 3 ? 'Great climbing! Rest, then keep going.' : 'Only the summit is left. Almost there!'}</p>
          </>}
          {event.kind === 'lucky' && <>
            <h2 id="exp-reveal" className="mt-1 text-2xl font-extrabold">{event.lucky.name}</h2>
            <p className="mt-2 text-[15px] text-inksoft">{event.lucky.story}</p>
          </>}
          <button ref={btn} className="btn-primary mt-5 w-full !py-3" onClick={onClose}>{more > 0 ? `Next (${more} more)` : 'Keep climbing'}</button>
        </div>
      </div>
    </div>
  )
}

/** Everything that happened, in order, so new events can be celebrated */
export function eventsOf(exp: Expedition): (ExpeditionEvent & { date: string })[] {
  return [
    ...exp.milestones.map((m) => ({ kind: 'milestone' as const, mountain: m.mountain, stop: m.stop, date: m.date })),
    ...exp.summits.map((s) => ({ kind: 'summit' as const, mountain: s.mountain, ascent: s.ascent, date: s.date })),
    ...exp.lucky.map((l) => ({ kind: 'lucky' as const, lucky: l.lucky, date: l.date })),
  ]
}
