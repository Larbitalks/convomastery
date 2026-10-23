import { useEffect, useRef, useState } from 'react'
import { DiscoveryArt } from './DiscoveryArt'
import { formatDate } from '../lib/format'
import { DISCOVERIES, RARITY_COLOR, TIERS, discoveryAt, tierOf, type Discovery, type Journey } from '../lib/discoveries'

const tint = (hex: string) => `${hex}22`

/** The adventure journal: progress to the next discovery, then every camp with collected and locked items */
export function DiscoveryJournal({ journey, name, own = false }: { journey: Journey; name: string; own?: boolean }) {
  const { unlocked, current, needed, next, lifetime } = journey
  const got = new Map(unlocked.map((u) => [u.discovery.number, u]))
  const stars = unlocked.filter((u) => u.discovery.number > DISCOVERIES.length)
  const pct = Math.min(100, Math.round((current / needed) * 100))
  const nextTier = tierOf(next.tier)
  const [open, setOpen] = useState(false)

  return (
    <section aria-labelledby="disc-h">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="disc-camps"
        className="group flex w-full items-center gap-4 rounded-2xl text-left">
        <DiscoveriesLogo className="h-16 w-16 shrink-0 drop-shadow-sm transition-transform group-hover:-rotate-6 group-hover:scale-105" />
        <span className="min-w-0 flex-1">
          <span id="disc-h" className="block text-2xl font-extrabold group-hover:underline group-hover:underline-offset-4">{own ? 'My Discoveries' : 'Discoveries'}</span>
          <span className="block text-[15px] text-inksoft">{own ? 'Every award point moves you up the mountain. Collect them all!' : `Award points unlock collectibles for ${name}. Every one is kept forever.`}</span>
        </span>
        <span className="hidden shrink-0 items-center gap-1 rounded-full border-2 border-line px-3 py-1.5 text-sm font-bold sm:flex">
          {open ? 'Hide collection' : 'See collection'}
          <svg viewBox="0 0 20 20" className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true"><path d="M5 8 L10 13 L15 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </button>

      <div className="mt-4 overflow-hidden rounded-2xl border-2 border-line bg-white">
        <div className="flex flex-wrap items-center gap-5 p-5" style={{ background: `linear-gradient(135deg, ${tint(nextTier.color)}, #FFFFFF 60%)` }}>
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-white ring-2 ring-line">
            <DiscoveryArt id={next.id} locked className="h-14 w-14" />
          </div>
          <div className="min-w-[12rem] flex-1">
            <p className="text-sm font-bold text-inksoft">Next discovery</p>
            <p className="text-lg font-extrabold">{next.name}</p>
            <div className="mt-2 h-4 overflow-hidden rounded-full bg-board" role="progressbar" aria-valuemin={0} aria-valuemax={needed} aria-valuenow={current}
              aria-label={`${current} of ${needed} points to the next discovery`}>
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(pct, 3)}%`, background: `linear-gradient(90deg, #F2CC8F, #E9B949)` }} />
            </div>
            <p className="mt-1 text-[15px]"><strong className="tabular-nums">{current} / {needed}</strong> points. {needed - current} more to go!</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-px border-t-2 border-line bg-line">
          <div className="bg-white px-5 py-3"><dt className="text-sm text-inksoft">Discoveries collected</dt><dd className="font-display text-2xl font-extrabold tabular-nums">{unlocked.length}</dd></div>
          <div className="bg-white px-5 py-3"><dt className="text-sm text-inksoft">Lifetime points</dt><dd className="font-display text-2xl font-extrabold tabular-nums">{lifetime}</dd></div>
        </dl>
      </div>

      {!open && (
        <button type="button" className="mt-3 w-full rounded-xl border-2 border-dashed border-line py-2.5 text-[15px] font-bold hover:border-ink/40" onClick={() => setOpen(true)} aria-controls="disc-camps" aria-expanded={false}>
          See all {DISCOVERIES.length} discoveries ({unlocked.length} collected)
        </button>
      )}

      {open && <div id="disc-camps" className="mt-6 grid gap-6">
        {TIERS.map((t) => {
          const items = DISCOVERIES.map((d, i) => ({ d, n: i + 1 })).filter((x) => x.d.tier === t.tier)
          const have = items.filter((x) => got.has(x.n)).length
          return (
            <div key={t.tier}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 pb-1" style={{ borderColor: t.color }}>
                <h3 className="font-extrabold">{t.camp} <span className="text-sm font-normal text-inksoft">{t.level}</span></h3>
                <span className="text-sm text-inksoft">{have} of {items.length}</span>
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {items.map(({ d, n }) => <Card key={d.id} d={d} n={n} unlockedAt={got.get(n)?.date} isNext={n === next.number} needed={needed - current} />)}
              </ul>
            </div>
          )
        })}
        {stars.length > 0 && (
          <div className="flex items-center gap-4 rounded-2xl border-2 border-[#E9B949] bg-[#FFF8E6] p-4">
            <DiscoveryArt id="summit-star" className="h-14 w-14 shrink-0" />
            <div><p className="font-extrabold">Summit Stars x {stars.length}</p><p className="text-[14px] text-inksoft">Extra stars for climbing past the whole journey. Latest {formatDate(stars[stars.length - 1].date)}.</p></div>
          </div>
        )}
        <button type="button" className="justify-self-start text-sm font-bold underline" onClick={() => setOpen(false)}>Hide collection</button>
      </div>}
    </section>
  )
}

/** The Discoveries badge: a summit with a flag on a sunny disc */
export function DiscoveriesLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#F2CC8F" stroke="#3D405B" strokeWidth="3" />
      <circle cx="32" cy="32" r="23" fill="#FFF8E6" />
      <path d="M10 46 L25 26 L32 34 L40 22 L54 46 Z" fill="#81B29A" stroke="#3D405B" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M36 28 L40 22 L44 28 L41 27 L40 29 L38 27 Z" fill="#FFFFFF" stroke="#3D405B" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M40 22 L40 9" stroke="#3D405B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 10 L50 13.5 L40 17 Z" fill="#E07A5F" stroke="#3D405B" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 50 L48 50" stroke="#3D405B" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="18" cy="17" r="2" fill="#E9B949" />
      <circle cx="25" cy="12" r="1.5" fill="#E9B949" />
    </svg>
  )
}

function Card({ d, n, unlockedAt, isNext, needed }: { d: Discovery; n: number; unlockedAt?: string; isNext: boolean; needed: number }) {
  const t = tierOf(d.tier)
  if (!unlockedAt) {
    return (
      <li className={`flex flex-col items-center rounded-2xl border-2 border-dashed p-3 text-center ${isNext ? 'border-[#E9B949] bg-[#FFF8E6]' : 'border-line bg-board/40'}`}>
        <div className="grid h-20 w-20 place-items-center rounded-full bg-white/70"><DiscoveryArt id={d.id} locked className="h-14 w-14" /></div>
        <p className="mt-2 font-bold text-inksoft">{isNext ? d.name : '???'}</p>
        <p className="text-[12px] text-inksoft">{isNext ? `${needed} ${needed === 1 ? 'point' : 'points'} to go` : `Discovery ${n}`}</p>
      </li>
    )
  }
  return (
    <li className="flex flex-col items-center rounded-2xl border-2 bg-white p-3 text-center shadow-sm" style={{ borderColor: t.color }}>
      <div className="grid h-20 w-20 place-items-center rounded-full" style={{ backgroundColor: tint(t.color) }}><DiscoveryArt id={d.id} className="h-16 w-16" /></div>
      <p className="mt-2 font-extrabold leading-tight">{d.name}</p>
      <span className="mt-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ backgroundColor: RARITY_COLOR[d.rarity] }}>{d.rarity}</span>
      <p className="mt-1.5 text-[13px] leading-snug text-inksoft">{d.story}</p>
      <p className="mt-auto pt-1.5 text-[12px] font-bold text-inksoft">Found {formatDate(unlockedAt)}</p>
    </li>
  )
}

/** The unlock moment: a chest opens and the new discovery rises out of it */
export function DiscoveryReveal({ number, name, more = 0, onClose }: { number: number; name: string; more?: number; onClose: () => void }) {
  const d = discoveryAt(number - 1)
  const t = tierOf(d.tier)
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    btn.current?.focus()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4" role="dialog" aria-modal="true" aria-labelledby="reveal-title" onClick={onClose}>
      <style>{`
        @keyframes cm-rays { to { transform: rotate(360deg) } }
        @keyframes cm-lid { 0% { transform: none } 25% { transform: rotate(-4deg) } 40% { transform: rotate(3deg) } 100% { transform: translate(-4px, -30px) rotate(-22deg) } }
        @keyframes cm-rise { 0%, 45% { transform: translateY(40px) scale(.2); opacity: 0 } 75% { transform: translateY(-8px) scale(1.08); opacity: 1 } 100% { transform: none; opacity: 1 } }
        @keyframes cm-pop { 0%, 60% { opacity: 0; transform: translateY(10px) } 100% { opacity: 1; transform: none } }
        @keyframes cm-spark { 0% { opacity: 0; transform: scale(.2) } 50% { opacity: 1 } 100% { opacity: 0; transform: scale(1.4) translateY(-20px) } }
        .cm-rays { animation: cm-rays 14s linear infinite }
        .cm-lid { transform-origin: 18px 62px; animation: cm-lid 1.1s ease-in-out .2s forwards }
        .cm-rise { animation: cm-rise 1.6s cubic-bezier(.2,.8,.3,1.2) forwards }
        .cm-pop { animation: cm-pop 1.8s ease-out forwards }
        .cm-spark { animation: cm-spark 1.4s ease-out .9s both }
        @media (prefers-reduced-motion: reduce) { .cm-rays, .cm-lid, .cm-rise, .cm-pop, .cm-spark { animation: none !important; opacity: 1 } .cm-lid { transform: translate(-4px, -30px) rotate(-22deg) } }
      `}</style>
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="cm-pop text-sm font-extrabold uppercase tracking-wider" style={{ color: t.color }}>New discovery!</p>
        <div className="relative mx-auto mt-2 h-52 w-52">
          <svg viewBox="0 0 200 200" className="cm-rays absolute inset-0" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => <path key={i} d="M100 100 L92 0 L108 0 Z" fill="#F2CC8F" opacity=".45" transform={`rotate(${i * 30} 100 100)`} />)}
          </svg>
          <div className="cm-rise absolute inset-x-0 top-2 mx-auto grid h-28 w-28 place-items-center rounded-full bg-white shadow-lg" style={{ boxShadow: `0 0 0 6px ${tint(t.color)}` }}>
            <DiscoveryArt id={d.id} className="h-24 w-24" />
          </div>
          <svg viewBox="0 0 120 90" className="absolute bottom-0 left-1/2 w-32 -translate-x-1/2" aria-hidden="true">
            <rect x="18" y="58" width="84" height="30" rx="4" fill="#9A6A3F" stroke="#3D405B" strokeWidth="3" />
            <rect x="18" y="66" width="84" height="6" fill="#E9B949" stroke="#3D405B" strokeWidth="2" />
            <g className="cm-lid"><path d="M18 62 L18 48 Q18 34 60 34 Q102 34 102 48 L102 62 Z" fill="#B47A48" stroke="#3D405B" strokeWidth="3" /></g>
            <rect x="54" y="60" width="12" height="14" rx="2" fill="#E9B949" stroke="#3D405B" strokeWidth="2" />
          </svg>
          {[[20, 40], [170, 60], [40, 120], [160, 130]].map(([x, y], i) => (
            <span key={i} className="cm-spark absolute text-2xl" style={{ left: x, top: y, animationDelay: `${0.9 + i * 0.15}s`, color: '#E9B949' }} aria-hidden="true">✦</span>
          ))}
        </div>
        <div className="cm-pop">
          <h2 id="reveal-title" className="mt-3 text-2xl font-extrabold">{d.name}</h2>
          <span className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[12px] font-bold text-white" style={{ backgroundColor: RARITY_COLOR[d.rarity] }}>{d.rarity}, {t.camp}</span>
          <p className="mt-3 text-[15px] text-inksoft">{d.story}</p>
          <p className="mt-3 font-bold">Well done, {name}! Keep climbing.</p>
          <button ref={btn} className="btn-primary mt-5 w-full !py-3" onClick={onClose}>{more > 0 ? `Next discovery (${more} more)` : 'Add to my collection'}</button>
        </div>
      </div>
    </div>
  )
}
