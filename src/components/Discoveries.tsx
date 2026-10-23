import { useEffect, useRef, useState } from 'react'
import { DiscoveryArt } from './DiscoveryArt'
import { MountainMap } from './MountainMap'
import { formatDate } from '../lib/format'
import { CAMP_ITEMS, RARITY_COLOR, TIERS, editionOf, tierOf, type Discovery, type Found, type Journey, type MapPerson } from '../lib/discoveries'

const tint = (hex: string) => `${hex}22`

/** The adventure journal: progress to the next discovery, the current camp's set, and a shelf for earlier camps */
export function DiscoveryJournal({ journey, name, own = false, loadMap }: { journey: Journey; name: string; own?: boolean; loadMap?: () => Promise<(MapPerson & { hidden?: boolean })[]> }) {
  const [map, setMap] = useState(false)
  const { unlocked, current, needed, next, lifetime, camp } = journey
  const pct = Math.min(100, Math.round((current / needed) * 100))
  const tier = tierOf(camp)
  const [open, setOpen] = useState(false)
  const set = CAMP_ITEMS[camp]
  const inCamp = unlocked.filter((u) => u.discovery.tier === camp)
  const earlier = TIERS.filter((t) => t.tier !== camp).map((t) => ({ t, finds: unlocked.filter((u) => u.discovery.tier === t.tier) })).filter((x) => x.finds.length)
  const nextLabel = `${next.discovery.name}${next.edition ? ` (${next.edition})` : ''}`

  return (
    <section aria-labelledby="disc-h">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="disc-camps"
        className="group flex w-full items-center gap-4 rounded-2xl text-left">
        <DiscoveriesLogo className="h-16 w-16 shrink-0 drop-shadow-sm transition-transform group-hover:-rotate-6 group-hover:scale-105" />
        <span className="min-w-0 flex-1">
          <span id="disc-h" className="block text-2xl font-extrabold group-hover:underline group-hover:underline-offset-4">{own ? 'My Discoveries' : 'Discoveries'}</span>
          <span className="block text-[15px] text-inksoft">{own ? `You are exploring ${tier.camp}. Every award point brings a new find!` : `${name} is collecting at ${tier.camp}. Every find is kept forever.`}</span>
        </span>
        <span className="hidden shrink-0 items-center gap-1 rounded-full border-2 border-line px-3 py-1.5 text-sm font-bold sm:flex">
          {open ? 'Hide collection' : 'See collection'}
          <svg viewBox="0 0 20 20" className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true"><path d="M5 8 L10 13 L15 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </button>

      <div className="mt-4 overflow-hidden rounded-2xl border-2 border-line bg-white">
        <div className="flex flex-wrap items-center gap-5 p-5" style={{ background: `linear-gradient(135deg, ${tint(tier.color)}, #FFFFFF 60%)` }}>
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-white ring-2 ring-line">
            <DiscoveryArt id={next.discovery.id} locked className="h-14 w-14" />
          </div>
          <div className="min-w-[12rem] flex-1">
            <p className="text-sm font-bold text-inksoft">Next discovery at {tier.camp}</p>
            <p className="text-lg font-extrabold">{nextLabel}</p>
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

      {loadMap && (
        <button type="button" onClick={() => setMap(true)}
          className="group relative mt-3 flex w-full items-center gap-4 overflow-hidden rounded-2xl border-2 border-ink text-left text-white shadow-[4px_4px_0_#3D405B] transition-transform hover:-translate-y-0.5">
          <img src={`${import.meta.env.BASE_URL}mountain-map-thumb.webp`} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <span className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/50 to-transparent" aria-hidden="true" />
          <span className="relative px-5 py-5">
            <span className="block text-xl font-extrabold">See the mountain map</span>
            <span className="block text-[14px] text-white/85">{own ? 'Find yourself on the trail and see where everyone else is.' : 'Every student on the trail, camp by camp.'}</span>
          </span>
        </button>
      )}
      {map && loadMap && <MountainMap load={loadMap} teacher={!own} onClose={() => setMap(false)} />}

      {!open && (
        <button type="button" className="mt-3 w-full rounded-xl border-2 border-dashed border-line py-2.5 text-[15px] font-bold hover:border-ink/40" onClick={() => setOpen(true)} aria-controls="disc-camps" aria-expanded={false}>
          See the {tier.camp} collection ({inCamp.length} {inCamp.length === 1 ? 'find' : 'finds'})
        </button>
      )}

      {open && <div id="disc-camps" className="mt-6 grid gap-6">
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 pb-1" style={{ borderColor: tier.color }}>
            <h3 className="font-extrabold">{tier.camp} <span className="text-sm font-normal text-inksoft">{tier.level}</span></h3>
            <span className="text-sm text-inksoft">{new Set(inCamp.map((u) => u.discovery.id)).size} of {set.length} found</span>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {set.map((d) => <Card key={d.id} d={d} finds={inCamp.filter((u) => u.discovery.id === d.id)} isNext={d.id === next.discovery.id} nextEdition={next.edition} toGo={needed - current} />)}
          </ul>
          <p className="mt-2 text-[13px] text-inksoft">After all {set.length}, the set starts again in Silver, then Gold, then Diamond.</p>
        </div>

        {earlier.length > 0 && (
          <div>
            <h3 className="border-b-2 border-line pb-1 font-extrabold">Earlier camps</h3>
            <div className="mt-3 grid gap-3">
              {earlier.map(({ t, finds }) => (
                <div key={t.tier} className="rounded-2xl border-2 border-line p-3">
                  <p className="text-sm font-bold">{t.camp} <span className="font-normal text-inksoft">{finds.length} {finds.length === 1 ? 'find' : 'finds'}</span></p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {[...new Map(finds.map((f) => [f.discovery.id, f])).values()].map((f) => {
                      const n = finds.filter((x) => x.discovery.id === f.discovery.id).length
                      return (
                        <li key={f.discovery.id} className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3" style={{ backgroundColor: tint(t.color) }} title={f.discovery.name}>
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-white"><DiscoveryArt id={f.discovery.id} className="h-6 w-6" /></span>
                          <span className="text-[13px] font-bold">{f.discovery.name.replace(/^The /, '')}{n > 1 ? ` x${n}` : ''}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
        <button type="button" className="justify-self-start text-sm font-bold underline" onClick={() => setOpen(false)}>Hide collection</button>
      </div>}
    </section>
  )
}

function Card({ d, finds, isNext, nextEdition, toGo }: { d: Discovery; finds: Found[]; isNext: boolean; nextEdition: string; toGo: number }) {
  const t = tierOf(d.tier)
  if (!finds.length) {
    return (
      <li className={`flex flex-col items-center rounded-2xl border-2 border-dashed p-3 text-center ${isNext ? 'border-[#E9B949] bg-[#FFF8E6]' : 'border-line bg-board/40'}`}>
        <div className="grid h-20 w-20 place-items-center rounded-full bg-white/70"><DiscoveryArt id={d.id} locked className="h-14 w-14" /></div>
        <p className="mt-2 font-bold text-inksoft">{isNext ? d.name : '???'}</p>
        <p className="text-[12px] text-inksoft">{isNext ? `${toGo} ${toGo === 1 ? 'point' : 'points'} to go` : 'Keep climbing'}</p>
      </li>
    )
  }
  const best = finds.reduce((a, b) => (b.round > a.round ? b : a))
  const ed = editionOf(best.round)
  const last = finds[finds.length - 1]
  return (
    <li className={`relative flex flex-col items-center rounded-2xl border-2 bg-white p-3 text-center shadow-sm ${isNext ? 'ring-2 ring-[#E9B949] ring-offset-2' : ''}`} style={{ borderColor: ed.ring || t.color }}>
      {finds.length > 1 && <span className="absolute right-2 top-2 rounded-full bg-ink px-2 text-[12px] font-bold text-white">x{finds.length}</span>}
      <div className="grid h-20 w-20 place-items-center rounded-full" style={{ backgroundColor: tint(t.color), boxShadow: ed.ring ? `0 0 0 4px ${ed.ring}` : undefined }}><DiscoveryArt id={d.id} className="h-16 w-16" /></div>
      <p className="mt-2 font-extrabold leading-tight">{d.name}</p>
      <span className="mt-1 flex flex-wrap justify-center gap-1">
        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ backgroundColor: RARITY_COLOR[d.rarity] }}>{d.rarity}</span>
        {ed.label && <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: ed.ring, color: '#3D405B' }}>{ed.label}</span>}
      </span>
      <p className="mt-1.5 text-[13px] leading-snug text-inksoft">{d.story}</p>
      <p className="mt-auto pt-1.5 text-[12px] font-bold text-inksoft">{isNext ? `Next: ${nextEdition} edition, ${toGo} to go` : `Found ${formatDate(last.date)}`}</p>
    </li>
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

/** The unlock moment: a chest opens and the new discovery rises out of it */
export function DiscoveryReveal({ found, name, more = 0, onClose }: { found: { discovery: Discovery; round: number; edition: string }; name: string; more?: number; onClose: () => void }) {
  const d = found.discovery
  const t = tierOf(d.tier)
  const ed = editionOf(found.round)
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
          <div className="cm-rise absolute inset-x-0 top-2 mx-auto grid h-28 w-28 place-items-center rounded-full bg-white shadow-lg" style={{ boxShadow: `0 0 0 6px ${ed.ring || tint(t.color)}` }}>
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
          {ed.label && <p className="font-extrabold" style={{ color: ed.ring === '#E9B949' ? '#9A6A1F' : '#5B6C8F' }}>{ed.label} edition</p>}
          <span className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[12px] font-bold text-white" style={{ backgroundColor: RARITY_COLOR[d.rarity] }}>{d.rarity}, {t.camp}</span>
          <p className="mt-3 text-[15px] text-inksoft">{d.story}</p>
          <p className="mt-3 font-bold">Well done, {name}! Keep climbing.</p>
          <button ref={btn} className="btn-primary mt-5 w-full !py-3" onClick={onClose}>{more > 0 ? `Next discovery (${more} more)` : 'Add to my collection'}</button>
        </div>
      </div>
    </div>
  )
}
