import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Spinner } from './ui'
import { Avatar } from './Avatar'
import { Crown } from './MonthStar'
import { DiscoveryArt } from './DiscoveryArt'
import { editionOf, RARITY_COLOR, type Found } from '../lib/discoveries'
import { errorMessage } from '../lib/format'
import { OVERVIEW, OVERVIEW_STOP, TIERS, tierOf, type MapPerson, type Tier } from '../lib/discoveries'
import { MILESTONES, MOUNTAINS, MOUNTAIN_SIZE, SUMMIT_POINTS, mountainSrc, seriesOf, trailSpot, type Mountain } from '../lib/expedition'

const url = (src: string) => `${import.meta.env.BASE_URL}${src}`
type Person = MapPerson & { hidden?: boolean }
/** x, y: where the avatar is drawn; ax, ay: the student's exact spot on the trail */
type Placed = Person & { x: number; y: number; ax: number; ay: number }
type View = 'overview' | Tier

const mountainOf = (p: Person) => MOUNTAINS.find((m) => m.id === p.mountainId && m.camp === p.camp) ?? seriesOf(p.camp)[0]

const exactSpot = (m: Mountain, p: Person) => trailSpot(m, p.steps ?? 0, SUMMIT_POINTS[m.camp])

/** Everyone stays pinned to their exact spot on the trail (a small dot). Their avatar sits on the dot when there is
 * room, otherwise it moves out to the nearest free place and a thin line joins it to the dot. Spacing is worked out
 * in screen pixels, so it stays tidy at every zoom. */
function placeOnMountain(m: Mountain, people: Person[], scale: number): Placed[] {
  const placed: Placed[] = []
  const W = 62 / scale, H = 66 / scale // room one avatar and its name need, in picture pixels
  // Keep the milestone names readable: their labels sit just right of each stop
  const labels = m.stops.map((i) => { const [sx, sy] = m.trail[i]; return { x1: sx - 14, x2: sx + 170, y1: sy - 18, y2: sy + 14 } })
  const free = (x: number, y: number) => placed.every((q) => Math.abs(q.x - x) >= W || Math.abs(q.y - y) >= H)
    && labels.every((r) => x + W / 2 < r.x1 || x - W / 2 > r.x2 || y + H / 2 < r.y1 || y - H / 2 > r.y2)
  const order = [...people].sort((a, b) => (a.me ? -1 : b.me ? 1 : (b.steps ?? 0) - (a.steps ?? 0)))
  for (const p of order) {
    const [ax, ay] = exactSpot(m, p)
    let spot: [number, number] | null = free(ax, ay) ? [ax, ay] : null
    for (let ring = 1; ring <= 10 && !spot; ring++) {
      const n = 8 + ring * 4
      for (let i = 0; i < n && !spot; i++) {
        // Start straight up, then alternate left and right, so callouts fan out above the trail first
        const step = Math.ceil(i / 2) * (i % 2 ? 1 : -1)
        const angle = -Math.PI / 2 + (step * 2 * Math.PI) / n
        const x = ax + Math.cos(angle) * ring * W * 0.95, y = ay + Math.sin(angle) * ring * H * 0.85
        if (x < W / 2 || x > MOUNTAIN_SIZE.w - W / 2 || y < H / 2 || y > MOUNTAIN_SIZE.h - H / 2) continue
        if (free(x, y)) spot = [x, y]
      }
    }
    const [x, y] = spot ?? [ax, ay]
    placed.push({ ...p, x, y, ax, ay })
  }
  return placed
}

/** Full-screen map: the whole mountain, and a close-up of each camp with its students on the trail. */
export function MountainMap({ load, onClose, teacher = false, camp: startCamp, mountainId }: { load: () => Promise<Person[]>; onClose: () => void; teacher?: boolean; camp: Tier; mountainId?: string }) {
  const [people, setPeople] = useState<Person[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [view, setView] = useState<View>(startCamp)
  const [selected, setSelected] = useState<string | null>(null)
  const [panel, setPanel] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const [t, setT] = useState({ s: 0.5, x: 0, y: 0, min: 0.5 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const moved = useRef(0)
  const pending = useRef<[number, number] | null>(null)

  useEffect(() => { load().then(setPeople).catch((e) => setErr(errorMessage(e))) }, [load])

  const [mtnId, setMtnId] = useState<string | null>(mountainId ?? null)
  const mountain = view === 'overview' ? null : (seriesOf(view).find((m) => m.id === mtnId) ?? seriesOf(view)[0])
  const pic = useMemo(() => (mountain ? { src: mountainSrc(mountain), ...MOUNTAIN_SIZE } : OVERVIEW), [mountain])
  const zoomKey = Math.round(t.s * 20) / 20
  const placed = useMemo(() => (!mountain || !people ? [] : placeOnMountain(mountain, people.filter((p) => p.camp === mountain.camp && mountainOf(p).id === mountain.id), zoomKey)), [people, mountain, zoomKey])
  const me = people?.find((p) => p.me)

  const clamp = useCallback((s: number, x: number, y: number, min: number) => {
    const el = box.current
    if (!el) return { s, x, y, min }
    const vw = el.clientWidth, vh = el.clientHeight
    s = Math.max(min, Math.min(Math.max(2.5, min * 4), s))
    const w = pic.w * s, h = pic.h * s
    x = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, x))
    y = h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, y))
    return { s, x, y, min }
  }, [pic])

  /** Whole picture visible ("All" button) */
  const fit = useCallback(() => {
    const el = box.current
    if (!el) return
    const min = Math.min(el.clientWidth / pic.w, el.clientHeight / pic.h)
    setT(clamp(min, 0, 0, min))
  }, [clamp, pic])
  /** Opening view: the picture fills the height, so a wide picture is big and you swipe along it. Centred on a spot if given. */
  const open = useCallback((at?: [number, number]) => {
    const el = box.current
    if (!el) return
    const min = Math.min(el.clientWidth / pic.w, el.clientHeight / pic.h)
    const s = Math.max(min, Math.min(el.clientHeight / pic.h, 1.4))
    const [cx, cy] = at ?? [pic.w / 2, pic.h / 2]
    setT(clamp(s, el.clientWidth / 2 - cx * s, el.clientHeight / 2 - cy * s, min))
  }, [clamp, pic])

  const focus = useCallback((mx: number, my: number, s?: number) => {
    setT((cur) => {
      const el = box.current!
      const zs = s ?? Math.max(cur.s, cur.min * 1.8)
      return clamp(zs, el.clientWidth / 2 - mx * zs, el.clientHeight / 2 - my * zs, cur.min)
    })
  }, [clamp])

  // Fit the picture whenever the view or the window changes; then fly to a student if one was picked
  useLayoutEffect(() => {
    let at: [number, number] | undefined
    if (pending.current) { at = pending.current; pending.current = null }
    else if (view !== 'overview') {
      const mine = placed.find((p) => p.me)
      at = mine ? [mine.ax, mine.ay] : mountain!.trail[0]
    } else if (me) at = OVERVIEW_STOP[me.camp]
    open(at)
    const onResize = () => open()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, mtnId, open, people])

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    setT((cur) => {
      const el = box.current!
      const px = cx ?? el.clientWidth / 2, py = cy ?? el.clientHeight / 2
      const s = Math.max(cur.min, Math.min(Math.max(2.5, cur.min * 4), cur.s * factor))
      return clamp(s, px - (px - cur.x) * (s / cur.s), py - (py - cur.y) * (s / cur.s), cur.min)
    })
  }, [clamp])

  /** Open a camp on a mountain: the picked person's, else your own, else the busiest one */
  const enter = useCallback((camp: Tier, personKey?: string, mountainId?: string) => {
    setSelected(personKey ?? null)
    const here = (people ?? []).filter((p) => p.camp === camp)
    const person = here.find((p) => p.key === personKey) ?? here.find((p) => p.me)
    const busiest = seriesOf(camp).map((m) => ({ m, n: here.filter((p) => mountainOf(p).id === m.id).length })).sort((a, b) => b.n - a.n)[0].m
    const m = seriesOf(camp).find((x) => x.id === mountainId) ?? (person ? mountainOf(person) : busiest)
    if (personKey && person) pending.current = exactSpot(m, person)
    setMtnId(m.id)
    setView(camp)
  }, [people])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const wheel = (e: WheelEvent) => { e.preventDefault(); const r = el.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top) }
    el.addEventListener('wheel', wheel, { passive: false })
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') zoomAt(1.25)
      if (e.key === '-') zoomAt(0.8)
    }
    window.addEventListener('keydown', key)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { el.removeEventListener('wheel', wheel); window.removeEventListener('keydown', key); document.body.style.overflow = prev }
  }, [zoomAt, onClose, view])

  const down = (e: React.PointerEvent) => { pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved.current = 0 }
  const move = (e: React.PointerEvent) => {
    const ps = pointers.current
    const prev = ps.get(e.pointerId)
    if (!prev) return
    const now = { x: e.clientX, y: e.clientY }
    if (ps.size === 1) {
      moved.current += Math.abs(now.x - prev.x) + Math.abs(now.y - prev.y)
      setT((cur) => clamp(cur.s, cur.x + now.x - prev.x, cur.y + now.y - prev.y, cur.min))
    } else if (ps.size === 2) {
      const other = [...ps.entries()].find(([id]) => id !== e.pointerId)![1]
      const before = Math.hypot(prev.x - other.x, prev.y - other.y), after = Math.hypot(now.x - other.x, now.y - other.y)
      const r = box.current!.getBoundingClientRect()
      if (before > 0) zoomAt(after / before, (now.x + other.x) / 2 - r.left, (now.y + other.y) / 2 - r.top)
      moved.current += 10
    }
    ps.set(e.pointerId, now)
  }
  const up = (e: React.PointerEvent) => { pointers.current.delete(e.pointerId) }

  const byCamp = useMemo(() => [...TIERS].reverse().map((c) => ({ c, list: (people ?? []).filter((p) => p.camp === c.tier).sort((a, b) => (b.summits ?? 0) - (a.summits ?? 0) || (b.steps ?? 0) - (a.steps ?? 0)) })), [people])
  const sel = placed.find((p) => p.key === selected)
  const k = 1 / t.s
  const camp = view === 'overview' ? null : tierOf(view)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1F2233] text-white" role="dialog" aria-modal="true" aria-label="Mountain map">
      <style>{`@keyframes cm-dive { from { opacity: 0; transform: scale(1.12) } to { opacity: 1; transform: none } } .cm-dive { animation: cm-dive .45s ease-out } @media (prefers-reduced-motion: reduce) { .cm-dive { animation: none } }`}</style>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold">{camp && mountain ? <>{mountain.name} <span className="text-sm font-bold text-white/70">{camp.camp}{mountain.height ? `, ${mountain.height}` : ''}</span></> : 'The ConvoMastery Mountain'}</p>
            <p className="truncate text-[13px] text-white/70">
              {!people ? 'Loading the climbers' : camp ? `${placed.length} ${placed.length === 1 ? 'climber' : 'climbers'} here. Zoom and drag to look around.` : 'Tap a camp to zoom in. Scroll or pinch to zoom, drag to look around.'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold hover:bg-white/25" onClick={() => setPanel(!panel)} aria-expanded={panel}>Who's where</button>
          <button className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-ink" onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div ref={box} className="relative min-w-0 flex-1 cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}
          onClick={() => { if (moved.current < 6) setSelected(null) }}>
          {camp && mountain && seriesOf(camp.tier).length > 1 && (
            <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 gap-1 rounded-full bg-ink/80 p-1 shadow-lg" role="tablist" aria-label={`${camp.camp} mountains`} onPointerDown={(e) => e.stopPropagation()}>
              {seriesOf(camp.tier).map((m) => {
                const n = (people ?? []).filter((p) => p.camp === camp.tier && mountainOf(p).id === m.id).length
                return (
                  <button key={m.id} role="tab" aria-selected={m.id === mountain.id} onClick={(e) => { e.stopPropagation(); setSelected(null); setMtnId(m.id) }}
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-bold ${m.id === mountain.id ? 'bg-white text-ink' : 'text-white hover:bg-white/15'}`}>{m.name} <span className="opacity-70">{n}</span></button>
                )
              })}
            </div>
          )}
          <div key={`${view}-${mountain?.id ?? ''}`} className="cm-dive absolute inset-0">
            <div className="absolute left-0 top-0 origin-top-left" style={{ width: pic.w, height: pic.h, transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})` }}>
              <img src={url(pic.src)} alt={mountain ? `${mountain.name}: the trail from Start past four camps to the summit` : 'The mountain, with the trail from Explorers up through Trekkers, Climbers and Mountaineers to the Alpinists summit'}
                width={pic.w} height={pic.h} draggable={false} className="pointer-events-none block h-full w-full" />
              {mountain && (
                <svg viewBox={`0 0 ${pic.w} ${pic.h}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                  {mountain.ropeFrom !== undefined && <polyline points={mountain.trail.slice(mountain.ropeFrom).map((q) => q.join(',')).join(' ')} fill="none" stroke="#fff" strokeWidth="5" strokeDasharray="4 12" strokeLinecap="round" />}
                  {mountain.stops.map((i, n) => {
                    const [sx, sy] = mountain.trail[i]
                    return (
                      <g key={n}>
                        <circle cx={sx} cy={sy} r="11" fill={n === 4 ? '#E9B949' : '#fff'} stroke="#3D405B" strokeWidth="4" />
                        <text x={sx + 18} y={sy + 6} fontSize="20" fontWeight="800" fill="#fff" stroke="#3D405B" strokeWidth="5" paintOrder="stroke">{MILESTONES[n]}</text>
                      </g>
                    )
                  })}
                </svg>
              )}

              {view === 'overview' && people && TIERS.map((c) => {
                const here = people.filter((p) => p.camp === c.tier)
                const [x, y] = OVERVIEW_STOP[c.tier]
                const mine = me?.camp === c.tier
                return (
                  <button key={c.tier} type="button" aria-label={`${c.camp}: ${here.length} ${here.length === 1 ? 'climber' : 'climbers'}. Zoom in`}
                    className="absolute left-0 top-0" style={{ transform: `translate(${x + 22}px, ${y}px) scale(${k}) translate(0, -50%)`, transformOrigin: '0 0', zIndex: mine ? 20 : 10 }}
                    onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); enter(c.tier) }}>
                    {mine && <span className="absolute bottom-full left-0 mb-1 whitespace-nowrap rounded-full bg-[#E07A5F] px-2.5 py-0.5 text-[12px] font-bold text-white shadow">You are here</span>}
                    <span className={`flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white py-1 pl-1 pr-3 text-[13px] font-extrabold text-ink shadow-lg transition-transform hover:scale-110 ${mine ? 'ring-4 ring-[#E07A5F]' : 'ring-2 ring-white/70'}`}>
                      <span className="flex -space-x-2">
                        {here.slice(0, 3).map((p) => <Avatar key={p.key} avatar={p.avatar} name={p.name} size={28} color={c.color} className="border-2 border-white text-[10px]" />)}
                        {here.length === 0 && <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-board text-[10px] text-inksoft">0</span>}
                      </span>
                      {here.length} <span className="font-bold text-inksoft">›</span>
                    </span>
                  </button>
                )
              })}

              {camp && placed.length > 0 && (
                <svg viewBox={`0 0 ${pic.w} ${pic.h}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                  {placed.map((p) => (
                    <g key={p.key}>
                      {(p.x !== p.ax || p.y !== p.ay) && <line x1={p.ax} y1={p.ay} x2={p.x} y2={p.y} stroke="#fff" strokeWidth={2.5 * k} opacity="0.9" />}
                      <circle cx={p.ax} cy={p.ay} r={5 * k} fill={p.me ? '#E07A5F' : camp.color} stroke="#fff" strokeWidth={2 * k} />
                    </g>
                  ))}
                </svg>
              )}
              {camp && placed.map((p) => {
                const isSel = p.key === selected
                return (
                  <button key={p.key} type="button" aria-label={`${p.name}${p.me ? ' (you)' : ''}${p.crown ? ', student of the month' : ''}, ${p.discoveries} discoveries`}
                    className="absolute left-0 top-0" style={{ transform: `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${k})`, zIndex: p.me ? 30 : isSel ? 20 : 10 }}
                    onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setSelected(p.key) }}>
                    <span className={`block rounded-full shadow-lg ${p.me ? 'border-[3px] border-[#E07A5F]' : 'border-2 border-white'} ${p.hidden ? 'opacity-50' : ''}`}
                      style={{ outline: isSel ? '3px solid #F2CC8F' : undefined }}>
                      <Avatar avatar={p.avatar} name={p.name} size={p.me ? 46 : 36} color={camp.color} />
                    </span>
                    {p.crown && <Crown className="absolute -top-6 left-1/2 h-7 w-9 -translate-x-1/2 -rotate-6 drop-shadow-md" />}
                    <span className={`absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-px text-[11px] font-bold shadow ${p.me ? 'bg-[#E07A5F] text-white' : 'bg-white text-ink'}`}>
                      {p.me ? `${p.name} (you)` : p.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {!people && !err && <div className="absolute inset-0 grid place-items-center"><Spinner label="Loading the map" /></div>}
          {err && <div className="absolute inset-x-4 top-4 rounded-xl bg-white p-3 text-ink">{err}</div>}
          {camp && people && placed.length === 0 && <div className="absolute inset-x-0 top-4 mx-auto w-fit rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow">Nobody is at this camp yet.</div>}

          <div className="absolute bottom-4 right-4 flex flex-col overflow-hidden rounded-xl bg-white text-ink shadow-lg">
            <button className="h-10 w-10 text-xl font-bold hover:bg-board" onClick={() => zoomAt(1.3)} aria-label="Zoom in">+</button>
            <button className="h-10 w-10 border-y border-line text-xl font-bold hover:bg-board" onClick={() => zoomAt(1 / 1.3)} aria-label="Zoom out">−</button>
            <button className="h-10 w-10 text-[11px] font-bold hover:bg-board" onClick={fit} aria-label="Show the whole picture">All</button>
          </div>

          {sel && camp && (
            <div className="absolute bottom-4 left-4 flex max-h-[calc(100%-2rem)] w-[26rem] max-w-[calc(100%-5rem)] flex-col rounded-2xl bg-white p-4 text-ink shadow-xl" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <Avatar avatar={sel.avatar} name={sel.name} size={48} color={camp.color} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-lg font-extrabold"><span className="truncate">{sel.me ? `${sel.name} (you)` : sel.name}</span>{sel.crown && <Crown className="h-5 w-6 shrink-0" title="Student of the month" />}</p>
                  {sel.crown && <p className="text-[13px] font-bold text-[#9A6A1F]">Student of the month</p>}
                  <p className="text-[14px]"><span className="font-bold" style={{ color: camp.color }}>{mountain?.name}</span>{typeof sel.steps === 'number' && sel.cost ? `, ${sel.steps < sel.cost / 5 ? 'on the way to Base Camp' : `past ${MILESTONES[Math.min(3, Math.floor(sel.steps / (sel.cost / 5)) - 1)]}`}` : ''}</p>
                  <p className="text-[13px] text-inksoft">{sel.summits ?? 0} {sel.summits === 1 ? 'summit' : 'summits'}, {sel.discoveries} {sel.discoveries === 1 ? 'discovery' : 'discoveries'}</p>
                </div>
                <button className="shrink-0 text-sm font-bold underline" onClick={() => setSelected(null)}>Close</button>
              </div>
              {sel.finds && <Collection finds={sel.finds} name={sel.me ? 'You' : sel.name} />}
              {sel.hidden && <p className="mt-1 text-[13px] text-inksoft">Hidden from students. Only you can see this marker.</p>}
            </div>
          )}
        </div>

        {panel && (
          <aside className="absolute inset-y-0 right-0 z-40 w-72 max-w-[85vw] overflow-y-auto bg-white p-4 text-ink shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Who's where</h2>
              <button className="text-sm font-bold underline" onClick={() => setPanel(false)}>Close</button>
            </div>
            {byCamp.map(({ c, list }) => (
              <div key={c.tier} className="mt-4">
                <button className="flex w-full items-baseline justify-between gap-2 border-b-2 pb-1 text-left hover:underline" style={{ borderColor: c.color }} onClick={() => enter(c.tier)}>
                  <span className="font-extrabold">{c.camp}</span><span className="text-sm text-inksoft">{list.length}</span>
                </button>
                {list.length === 0 ? <p className="mt-1 text-[13px] text-inksoft">Nobody here yet.</p> : (
                  <ul className="mt-1.5 grid gap-1">
                    {list.map((p) => (
                      <li key={p.key}>
                        <button className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-[15px] hover:bg-board ${p.key === selected ? 'bg-board' : ''}`}
                          onClick={() => { enter(c.tier, p.key); if (window.innerWidth < 640) setPanel(false) }}>
                          <Avatar avatar={p.avatar} name={p.name} size={24} color={c.color} />
                          <span className={`min-w-0 flex-1 truncate ${p.me ? 'font-extrabold' : ''} ${p.hidden ? 'text-inksoft' : ''}`}>{p.name}{p.me ? ' (you)' : ''}{p.hidden ? ' (hidden)' : ''}</span>{p.crown && <Crown className="h-4 w-5 shrink-0" title="Student of the month" />}
                          <span className="text-[12px] text-inksoft">{p.discoveries}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {teacher && <p className="mt-6 text-[13px] text-inksoft">Students see this map from their progress page. Hide someone with the "Show on the mountain map" switch on their profile.</p>}
          </aside>
        )}
      </div>
    </div>
  )
}

/** Someone's collection: each item once, with how many times it was found and the best edition */
function Collection({ finds, name }: { finds: Found[]; name: string }) {
  if (!finds.length) return <p className="mt-3 text-[14px] text-inksoft">{name === 'You' ? 'You have' : `${name} has`} not found anything yet. The first discovery comes after 5 points!</p>
  const items = [...new Map(finds.map((f) => [f.discovery.id, f])).values()].reverse()
  return (
    <ul className="mt-3 grid min-h-0 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4" aria-label={`${name}'s discoveries`}>
      {items.map((f) => {
        const all = finds.filter((x) => x.discovery.id === f.discovery.id)
        const best = all.reduce((a, b) => (b.round > a.round ? b : a))
        const ed = editionOf(best.round)
        return (
          <li key={f.discovery.id} className="relative flex flex-col items-center rounded-xl border-2 p-1.5 text-center" style={{ borderColor: ed.ring || '#E6E1CB' }} title={f.discovery.story}>
            {all.length > 1 && <span className="absolute right-1 top-1 rounded-full bg-ink px-1.5 text-[10px] font-bold text-white">x{all.length}</span>}
            <DiscoveryArt id={f.discovery.id} className="h-14 w-14" />
            <span className="mt-0.5 text-[11px] font-bold leading-tight">{f.discovery.name.replace(/^The /, '')}</span>
            <span className="mt-0.5 rounded-full px-1.5 text-[9px] font-bold text-white" style={{ backgroundColor: RARITY_COLOR[f.discovery.rarity] }}>{ed.label || f.discovery.rarity}</span>
          </li>
        )
      })}
    </ul>
  )
}
