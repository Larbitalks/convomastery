import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Spinner } from './ui'
import { errorMessage } from '../lib/format'
import { CAMP_MAPS, OVERVIEW, OVERVIEW_STOP, TIERS, campProgress, tierOf, trailPoint, type MapPerson, type Tier } from '../lib/discoveries'

const url = (src: string) => `${import.meta.env.BASE_URL}${src}`
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
type Person = MapPerson & { hidden?: boolean }
type Placed = Person & { x: number; y: number }
type View = 'overview' | Tier

/** Put a camp's people on its trail. Anyone too close to someone already placed moves a little along the trail,
 * so names stay readable; only very crowded camps fan out sideways. */
function placeInCamp(camp: Tier, people: Person[]): Placed[] {
  const placed: Placed[] = []
  const near = (x: number, y: number) => placed.some((q) => Math.hypot(q.x - x, q.y - y) < 70)
  const order = [...people].sort((a, b) => (a.me ? -1 : b.me ? 1 : b.findsInCamp - a.findsInCamp))
  for (const p of order) {
    const base = campProgress(p.findsInCamp)
    let spot: [number, number] | null = null
    for (let i = 0; i < 40 && !spot; i++) {
      const t = base + Math.ceil(i / 2) * 0.025 * (i % 2 ? 1 : -1)
      if (t < 0 || t > 1) continue
      const [x, y] = trailPoint(camp, t)
      if (!near(x, y)) spot = [x, y]
    }
    if (!spot) {
      const [bx, by] = trailPoint(camp, base)
      const k = placed.length
      spot = [bx + Math.cos(k * 2.4) * 60, by + Math.sin(k * 2.4) * 60]
    }
    placed.push({ ...p, x: spot[0], y: spot[1] })
  }
  return placed
}

/** Full-screen map: the whole mountain, and a close-up of each camp with its students on the trail. */
export function MountainMap({ load, onClose, teacher = false }: { load: () => Promise<Person[]>; onClose: () => void; teacher?: boolean }) {
  const [people, setPeople] = useState<Person[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [view, setView] = useState<View>('overview')
  const [selected, setSelected] = useState<string | null>(null)
  const [panel, setPanel] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const [t, setT] = useState({ s: 0.5, x: 0, y: 0, min: 0.5 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const moved = useRef(0)
  const pending = useRef<[number, number] | null>(null)

  useEffect(() => { load().then(setPeople).catch((e) => setErr(errorMessage(e))) }, [load])

  const pic = view === 'overview' ? OVERVIEW : CAMP_MAPS[view]
  const placed = useMemo(() => (view === 'overview' || !people ? [] : placeInCamp(view, people.filter((p) => p.camp === view))), [people, view])
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
      at = mine ? [mine.x, mine.y] : CAMP_MAPS[view].trail[0]
    } else if (me) at = OVERVIEW_STOP[me.camp]
    open(at)
    const onResize = () => open()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, open, people])

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    setT((cur) => {
      const el = box.current!
      const px = cx ?? el.clientWidth / 2, py = cy ?? el.clientHeight / 2
      const s = Math.max(cur.min, Math.min(Math.max(2.5, cur.min * 4), cur.s * factor))
      return clamp(s, px - (px - cur.x) * (s / cur.s), py - (py - cur.y) * (s / cur.s), cur.min)
    })
  }, [clamp])

  const enter = useCallback((camp: Tier, personKey?: string) => {
    setSelected(personKey ?? null)
    if (personKey && people) {
      const spot = placeInCamp(camp, people.filter((p) => p.camp === camp)).find((p) => p.key === personKey)
      if (spot) pending.current = [spot.x, spot.y]
    }
    setView(camp)
  }, [people])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const wheel = (e: WheelEvent) => { e.preventDefault(); const r = el.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top) }
    el.addEventListener('wheel', wheel, { passive: false })
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (view !== 'overview') setView('overview'); else onClose() }
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

  const byCamp = useMemo(() => [...TIERS].reverse().map((c) => ({ c, list: (people ?? []).filter((p) => p.camp === c.tier).sort((a, b) => b.findsInCamp - a.findsInCamp) })), [people])
  const sel = placed.find((p) => p.key === selected)
  const k = 1 / t.s
  const camp = view === 'overview' ? null : tierOf(view)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1F2233] text-white" role="dialog" aria-modal="true" aria-label="Mountain map">
      <style>{`@keyframes cm-dive { from { opacity: 0; transform: scale(1.12) } to { opacity: 1; transform: none } } .cm-dive { animation: cm-dive .45s ease-out } @media (prefers-reduced-motion: reduce) { .cm-dive { animation: none } }`}</style>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          {camp && <button className="shrink-0 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-ink" onClick={() => { setSelected(null); setView('overview') }}>← Whole mountain</button>}
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold">{camp ? camp.camp : 'The ConvoMastery Mountain'}</p>
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
          <div key={view} className="cm-dive absolute inset-0">
            <div className="absolute left-0 top-0 origin-top-left" style={{ width: pic.w, height: pic.h, transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})` }}>
              <img src={url(pic.src)} alt={camp ? `${camp.camp}: a trail from Start to the camp` : 'The mountain, with the trail from Explorers up through Trekkers, Climbers and Mountaineers to the Alpinists summit'}
                width={pic.w} height={pic.h} draggable={false} className="pointer-events-none block h-full w-full" />

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
                        {here.slice(0, 3).map((p) => <span key={p.key} className="grid h-7 w-7 place-items-center rounded-full border-2 border-white text-[10px] text-white" style={{ backgroundColor: c.color }}>{initials(p.name)}</span>)}
                        {here.length === 0 && <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-board text-[10px] text-inksoft">0</span>}
                      </span>
                      {here.length} <span className="font-bold text-inksoft">›</span>
                    </span>
                  </button>
                )
              })}

              {camp && placed.map((p) => {
                const isSel = p.key === selected
                return (
                  <button key={p.key} type="button" aria-label={`${p.name}${p.me ? ' (you)' : ''}, ${p.discoveries} discoveries`}
                    className="absolute left-0 top-0" style={{ transform: `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${k})`, zIndex: p.me ? 30 : isSel ? 20 : 10 }}
                    onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setSelected(p.key) }}>
                    <span className={`grid place-items-center rounded-full font-extrabold text-white shadow-lg ${p.me ? 'h-12 w-12 border-4 border-[#E07A5F] text-base' : 'h-10 w-10 border-[3px] border-white text-[13px]'} ${p.hidden ? 'opacity-50' : ''}`}
                      style={{ backgroundColor: camp.color, outline: isSel ? '3px solid #F2CC8F' : undefined }}>
                      {initials(p.name)}
                    </span>
                    <span className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-bold shadow ${p.me ? 'bg-[#E07A5F] text-white' : 'bg-white text-ink'}`}>
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
            <div className="absolute bottom-4 left-4 max-w-[calc(100%-6rem)] rounded-2xl bg-white p-4 text-ink shadow-xl">
              <p className="text-lg font-extrabold">{sel.me ? `${sel.name} (you)` : sel.name}</p>
              <p className="text-[15px]"><span className="font-bold" style={{ color: camp.color }}>{camp.camp}</span>, {sel.discoveries} {sel.discoveries === 1 ? 'discovery' : 'discoveries'}</p>
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
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-extrabold text-white" style={{ backgroundColor: c.color }}>{initials(p.name)}</span>
                          <span className={`min-w-0 flex-1 truncate ${p.me ? 'font-extrabold' : ''} ${p.hidden ? 'text-inksoft' : ''}`}>{p.name}{p.me ? ' (you)' : ''}{p.hidden ? ' (hidden)' : ''}</span>
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
