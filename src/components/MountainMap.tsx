import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Spinner } from './ui'
import { errorMessage } from '../lib/format'
import { CAMP_SIGN, MAP_SIZE, TIERS, campProgress, tierOf, trailPoint, type MapPerson, type Tier } from '../lib/discoveries'

const MAP_URL = `${import.meta.env.BASE_URL}mountain-map.webp`
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')

interface Placed extends MapPerson { x: number; y: number }

/** Put people on their camp's trail. Anyone too close to someone already placed moves a little further along
 * the trail (or back, near the top), so names stay readable; only very crowded camps fan out sideways. */
function place(people: MapPerson[]): Placed[] {
  const placed: Placed[] = []
  const near = (x: number, y: number) => placed.some((q) => Math.hypot(q.x - x, q.y - y) < 46)
  const order = [...people].sort((a, b) => (a.me ? -1 : b.me ? 1 : b.findsInCamp - a.findsInCamp))
  for (const p of order) {
    const base = campProgress(p.findsInCamp)
    let spot: [number, number] | null = null
    for (let i = 0; i < 24 && !spot; i++) {
      const step = Math.ceil(i / 2) * 0.045 * (i % 2 ? 1 : -1)
      const t = base + step
      if (t < 0 || t > 1) continue
      const [x, y] = trailPoint(p.camp, t)
      if (!near(x, y)) spot = [x, y]
    }
    if (!spot) {
      const [bx, by] = trailPoint(p.camp, base)
      const k = placed.length, angle = k * 2.4
      spot = [bx + Math.cos(angle) * 40, by + Math.sin(angle) * 40]
    }
    placed.push({ ...p, x: spot[0], y: spot[1] })
  }
  return placed
}

/** Full-screen map of the mountain with every student on their camp's trail. Zoom with the wheel, buttons or pinch; drag to move. */
export function MountainMap({ load, onClose, teacher = false }: { load: () => Promise<(MapPerson & { hidden?: boolean })[]>; onClose: () => void; teacher?: boolean }) {
  const [people, setPeople] = useState<(Placed & { hidden?: boolean })[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [panel, setPanel] = useState(false)
  const view = useRef<HTMLDivElement>(null)
  const [t, setT] = useState({ s: 0.5, x: 0, y: 0, min: 0.5 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const moved = useRef(0)

  useEffect(() => { load().then((p) => setPeople(place(p))).catch((e) => setErr(errorMessage(e))) }, [load])

  const clamp = useCallback((s: number, x: number, y: number, min: number) => {
    const el = view.current
    if (!el) return { s, x, y, min }
    const vw = el.clientWidth, vh = el.clientHeight
    s = Math.max(min, Math.min(Math.max(2.5, min * 4), s))
    const w = MAP_SIZE.w * s, h = MAP_SIZE.h * s
    x = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, x))
    y = h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, y))
    return { s, x, y, min }
  }, [])

  const fit = useCallback(() => {
    const el = view.current
    if (!el) return
    const min = Math.min(el.clientWidth / MAP_SIZE.w, el.clientHeight / MAP_SIZE.h)
    setT(clamp(min, 0, 0, min))
  }, [clamp])
  useLayoutEffect(() => { fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit) }, [fit])

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    setT((cur) => {
      const el = view.current!
      const px = cx ?? el.clientWidth / 2, py = cy ?? el.clientHeight / 2
      const s = Math.max(cur.min, Math.min(Math.max(2.5, cur.min * 4), cur.s * factor))
      return clamp(s, px - (px - cur.x) * (s / cur.s), py - (py - cur.y) * (s / cur.s), cur.min)
    })
  }, [clamp])

  const focus = useCallback((mx: number, my: number, s?: number) => {
    setT((cur) => {
      const el = view.current!
      const zs = Math.max(cur.s, s ?? Math.max(1.2, cur.min * 2.2))
      return clamp(zs, el.clientWidth / 2 - mx * zs, el.clientHeight / 2 - my * zs, cur.min)
    })
  }, [clamp])

  // Show the student where they are as soon as the map opens
  useEffect(() => {
    const me = people?.find((p) => p.me)
    if (me) { setSelected(me.key); setTimeout(() => focus(me.x, me.y), 50) }
  }, [people, focus])

  useEffect(() => {
    const el = view.current
    if (!el) return
    const wheel = (e: WheelEvent) => { e.preventDefault(); const r = el.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top) }
    el.addEventListener('wheel', wheel, { passive: false })
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === '+' || e.key === '=') zoomAt(1.25); if (e.key === '-') zoomAt(0.8) }
    window.addEventListener('keydown', key)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { el.removeEventListener('wheel', wheel); window.removeEventListener('keydown', key); document.body.style.overflow = prev }
  }, [zoomAt, onClose])

  const down = (e: React.PointerEvent) => { (e.target as Element).setPointerCapture?.(e.pointerId); pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved.current = 0 }
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
      const r = view.current!.getBoundingClientRect()
      if (before > 0) zoomAt(after / before, (now.x + other.x) / 2 - r.left, (now.y + other.y) / 2 - r.top)
      moved.current += 10
    }
    ps.set(e.pointerId, now)
  }
  const up = (e: React.PointerEvent) => { pointers.current.delete(e.pointerId) }

  const byCamp = useMemo(() => [...TIERS].reverse().map((c) => ({ c, list: (people ?? []).filter((p) => p.camp === c.tier).sort((a, b) => b.findsInCamp - a.findsInCamp) })), [people])
  const sel = people?.find((p) => p.key === selected)
  const showNames = t.s >= 0.95
  const markerScale = 1 / t.s

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1F2233] text-white" role="dialog" aria-modal="true" aria-label="Mountain map">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold">The ConvoMastery Mountain</p>
          <p className="truncate text-[13px] text-white/70">{people ? `${people.length} ${people.length === 1 ? 'climber' : 'climbers'} on the trail. Scroll or pinch to zoom, drag to look around.` : 'Loading the climbers'}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold hover:bg-white/25" onClick={() => setPanel(!panel)} aria-expanded={panel}>Who's where</button>
          <button className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-ink" onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div ref={view} className="relative min-w-0 flex-1 cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}
          onClick={() => { if (moved.current < 6) setSelected(null) }}>
          <div className="absolute left-0 top-0 origin-top-left" style={{ width: MAP_SIZE.w, height: MAP_SIZE.h, transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})` }}>
            <img src={MAP_URL} alt="A mountain trail from Start through Explorers, Trekkers, Climbers and Mountaineers camps to the Alpinists summit" width={MAP_SIZE.w} height={MAP_SIZE.h} draggable={false} className="pointer-events-none block h-full w-full" />
            {people?.map((p) => {
              const camp = tierOf(p.camp)
              const isSel = p.key === selected
              return (
                <button key={p.key} type="button" aria-label={`${p.name}${p.me ? ' (you)' : ''}, ${camp.camp}, ${p.discoveries} discoveries`}
                  className="absolute left-0 top-0" style={{ transform: `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${markerScale})`, zIndex: p.me ? 30 : isSel ? 20 : 10 }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setSelected(p.key) }}>
                  <span className={`grid place-items-center rounded-full font-extrabold shadow-lg ${p.me ? 'h-12 w-12 border-4 border-[#E07A5F] text-base' : 'h-9 w-9 border-[3px] border-white text-[13px]'} ${p.hidden ? 'opacity-50' : ''}`}
                    style={{ backgroundColor: camp.color, color: '#fff', outline: isSel ? '3px solid #F2CC8F' : undefined }}>
                    {initials(p.name)}
                  </span>
                  {(p.me || isSel || showNames) && (
                    <span className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-bold shadow ${p.me ? 'bg-[#E07A5F] text-white' : 'bg-white text-ink'}`}>
                      {p.me ? 'You are here' : p.name}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {!people && !err && <div className="absolute inset-0 grid place-items-center"><Spinner label="Loading the map" /></div>}
          {err && <div className="absolute inset-x-4 top-4 rounded-xl bg-white p-3 text-ink">{err}</div>}

          <div className="absolute bottom-4 right-4 flex flex-col overflow-hidden rounded-xl bg-white text-ink shadow-lg">
            <button className="h-10 w-10 text-xl font-bold hover:bg-board" onClick={() => zoomAt(1.3)} aria-label="Zoom in">+</button>
            <button className="h-10 w-10 border-y border-line text-xl font-bold hover:bg-board" onClick={() => zoomAt(1 / 1.3)} aria-label="Zoom out">−</button>
            <button className="h-10 w-10 text-[11px] font-bold hover:bg-board" onClick={fit} aria-label="Show the whole map">All</button>
          </div>

          {sel && (
            <div className="absolute bottom-4 left-4 max-w-[calc(100%-6rem)] rounded-2xl bg-white p-4 text-ink shadow-xl">
              <p className="text-lg font-extrabold">{sel.me ? `${sel.name} (you)` : sel.name}</p>
              <p className="text-[15px]"><span className="font-bold" style={{ color: tierOf(sel.camp).color }}>{tierOf(sel.camp).camp}</span>, {sel.discoveries} {sel.discoveries === 1 ? 'discovery' : 'discoveries'}</p>
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
                <button className="flex w-full items-baseline justify-between gap-2 border-b-2 pb-1 text-left" style={{ borderColor: c.color }}
                  onClick={() => { const [x, y] = CAMP_SIGN[c.tier as Tier]; focus(x, y, 1) }}>
                  <span className="font-extrabold">{c.camp}</span><span className="text-sm text-inksoft">{list.length}</span>
                </button>
                {list.length === 0 ? <p className="mt-1 text-[13px] text-inksoft">Nobody here yet.</p> : (
                  <ul className="mt-1.5 grid gap-1">
                    {list.map((p) => (
                      <li key={p.key}>
                        <button className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-[15px] hover:bg-board ${p.key === selected ? 'bg-board' : ''}`}
                          onClick={() => { setSelected(p.key); focus(p.x, p.y); if (window.innerWidth < 640) setPanel(false) }}>
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
