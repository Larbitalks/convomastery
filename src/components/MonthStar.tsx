import { useEffect, useRef, useState } from 'react'
import { monthName } from '../lib/monthStar'

/** A small gold crown */
export function Crown({ className = 'h-5 w-5', title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 26" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path d="M3 8 L9.5 14 L16 3 L22.5 14 L29 8 L26.5 22 H5.5 Z" fill="#F2C14E" stroke="#3D405B" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="5.5" y="20" width="21" height="4" rx="1.2" fill="#E9A23B" stroke="#3D405B" strokeWidth="2.2" />
      <circle cx="16" cy="3" r="2.2" fill="#E07A5F" stroke="#3D405B" strokeWidth="1.5" />
      <circle cx="3" cy="8" r="1.8" fill="#81B29A" stroke="#3D405B" strokeWidth="1.5" />
      <circle cx="29" cy="8" r="1.8" fill="#81B29A" stroke="#3D405B" strokeWidth="1.5" />
    </svg>
  )
}

/** A gold trophy cup */
export function Trophy({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M14 8 H34 V20 A10 10 0 0 1 14 20 Z" fill="#F2C14E" stroke="#3D405B" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M14 11 H8 V14 A7 7 0 0 0 15 21" fill="none" stroke="#3D405B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M34 11 H40 V14 A7 7 0 0 1 33 21" fill="none" stroke="#3D405B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M21 30 H27 L28 36 H20 Z" fill="#E9A23B" stroke="#3D405B" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="15" y="36" width="18" height="6" rx="1.5" fill="#9A6A3F" stroke="#3D405B" strokeWidth="2.5" />
      <path d="M24 12.5 L25.6 15.8 L29.2 16.2 L26.5 18.6 L27.3 22.1 L24 20.3 L20.7 22.1 L21.5 18.6 L18.8 16.2 L22.4 15.8 Z" fill="#FFF8E6" />
    </svg>
  )
}

export interface StarWin { month: string; reason: string; className?: string; bonus?: number }

/** Every month a student won, as a shelf of trophies with the teacher's reason */
export function TrophyShelf({ wins, name, you = false }: { wins: StarWin[]; name: string; you?: boolean }) {
  if (!wins.length) return null
  return (
    <section className="rounded-2xl border-2 border-[#E9B949] bg-gradient-to-br from-[#FFF8E6] to-white p-5">
      <div className="flex items-center gap-3">
        <Trophy className="h-11 w-11 shrink-0" />
        <div>
          <h2 className="text-xl font-extrabold">Student of the month</h2>
          <p className="text-[14px] text-inksoft">{you ? 'You have' : `${name} has`} won {wins.length === 1 ? 'once' : `${wins.length} times`}. Every trophy is kept forever.</p>
        </div>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {wins.map((w) => (
          <li key={w.month} className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-sm">
            <Trophy className="h-9 w-9 shrink-0" />
            <div className="min-w-0">
              <p className="font-extrabold">{monthName(w.month)}</p>
              {w.className && <p className="text-[13px] text-inksoft">{w.className}{w.bonus ? `, +${w.bonus} bonus points` : ''}</p>}
              {w.reason && <p className="mt-1 text-[14px]">"{w.reason}"</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Full-screen celebration the first time a winner opens their page */
export function MonthStarReveal({ win, name, onClose }: { win: StarWin; name: string; onClose: () => void }) {
  const btn = useRef<HTMLButtonElement>(null)
  const [pieces] = useState(() => Array.from({ length: 36 }, (_, i) => ({ left: (i * 37) % 100, delay: (i % 9) * 0.12, dur: 2.4 + (i % 5) * 0.35, c: ['#F2C14E', '#E07A5F', '#81B29A', '#3D405B', '#F2CC8F'][i % 5], w: 6 + (i % 3) * 3 })))
  useEffect(() => {
    btn.current?.focus()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-ink/70 p-4" role="dialog" aria-modal="true" aria-labelledby="som-title" onClick={onClose}>
      <style>{`
        @keyframes som-fall { from { transform: translateY(-10vh) rotate(0) } to { transform: translateY(110vh) rotate(540deg) } }
        @keyframes som-rise { 0% { transform: translateY(30px) scale(.6); opacity: 0 } 60% { transform: translateY(-6px) scale(1.08); opacity: 1 } 100% { transform: none } }
        @keyframes som-glow { 0%, 100% { transform: scale(1); opacity: .55 } 50% { transform: scale(1.12); opacity: .85 } }
        .som-fall { animation: som-fall linear infinite } .som-rise { animation: som-rise .9s cubic-bezier(.2,.8,.3,1.2) both } .som-glow { animation: som-glow 2.2s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) { .som-fall { display: none } .som-rise, .som-glow { animation: none } }
      `}</style>
      {pieces.map((p, i) => <span key={i} className="som-fall pointer-events-none absolute top-0 rounded-sm" aria-hidden="true" style={{ left: `${p.left}%`, width: p.w, height: p.w * 1.6, backgroundColor: p.c, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }} />)}
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-extrabold uppercase tracking-wider text-[#9A6A1F]">Congratulations!</p>
        <div className="relative mx-auto mt-2 grid h-40 w-40 place-items-center">
          <span className="som-glow absolute inset-0 rounded-full bg-[#F2CC8F]" aria-hidden="true" />
          <span className="som-rise relative"><Trophy className="h-28 w-28" /></span>
        </div>
        <h2 id="som-title" className="mt-2 text-2xl font-extrabold">{name}, you are student of the month!</h2>
        <p className="mt-1 font-bold text-inksoft">{monthName(win.month)}{win.className ? `, ${win.className}` : ''}</p>
        {win.reason && <p className="mt-3 rounded-xl bg-[#FFF8E6] px-3 py-2 text-[15px]">"{win.reason}"</p>}
        {!!win.bonus && <p className="mt-3 text-[15px]"><strong>+{win.bonus} bonus points</strong> for your discoveries and your climb.</p>}
        <p className="mt-2 text-[14px] text-inksoft">You wear the crown on the mountain map this month.</p>
        <button ref={btn} className="btn-primary mt-5 w-full" onClick={onClose}>Yay!</button>
      </div>
    </div>
  )
}
