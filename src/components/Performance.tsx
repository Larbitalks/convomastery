import { useState } from 'react'
import { bandOf, POINTS_FOR_FULL, WINDOW, type Performance } from '../lib/performance'

const textOnBand = (color: string) => (color === '#F2CC8F' ? '#3D405B' : '#FFFFFF')

function Trend({ trend }: { trend: number | null }) {
  if (trend === null) return null
  const up = trend >= 3
  const down = trend <= -3
  const text = up ? `Up ${trend}` : down ? `Down ${-trend}` : 'Steady'
  const cls = up ? 'bg-sage-light text-sage-dark' : down ? 'bg-[#FDECEC] text-[#8E1C20]' : 'bg-board text-ink'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-bold ${cls}`} title={`Compared with the ${WINDOW} classes before`}>
      <span aria-hidden="true">{up ? '▲' : down ? '▼' : '▶'}</span>{text}
    </span>
  )
}

/** Big card on the student's profile: score, band, trend and one bar per part */
export function PerformanceCard({ perf, name, title = 'Overall performance' }: { perf: Performance; name: string; title?: string }) {
  const [how, setHow] = useState(false)
  const { score, band } = perf
  return (
    <section className="rounded-2xl border-2 border-line bg-white p-5" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold">{title}</h2>
        {score !== null && <p className="text-sm text-inksoft">Last {perf.classesCounted === 1 ? 'class' : `${perf.classesCounted} classes`}</p>}
      </div>
      {score === null || !band ? (
        <p className="mt-2 text-inksoft">Not enough information yet. The score appears after {name}'s first class started from this profile.</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="font-display text-5xl font-extrabold tabular-nums leading-none" data-testid="perf-score">{score}</span>
            <span className="text-inksoft">/ 100</span>
            <span className="rounded-full px-3 py-1 font-bold" style={{ backgroundColor: band.color, color: textOnBand(band.color) }}>{band.label}</span>
            <Trend trend={perf.trend} />
          </div>
          <div className="relative mt-3 h-4 overflow-hidden rounded-full bg-board" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-label={`Overall score ${score} out of 100, ${band.label}`}>
            <div className="h-full rounded-full transition-[width]" style={{ width: `${score}%`, backgroundColor: band.color }} />
            {[40, 60, 80].map((t) => <span key={t} className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${t}%` }} aria-hidden="true" />)}
          </div>
          <div className="relative mt-1 h-4 text-[12px] text-inksoft" aria-hidden="true">
            {([['At risk', 20], ['Needs support', 50], ['Good', 70], ['Excellent', 90]] as const).map(([t, x]) => (
              <span key={t} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${x}%` }}>{t}</span>
            ))}
          </div>
          <ul className="mt-5 grid gap-3">
            {perf.parts.map((p) => (
              <li key={p.key}>
                <div className="flex items-baseline justify-between gap-3 text-[15px]">
                  <span><strong>{p.label}</strong> <span className="text-sm text-inksoft">{p.weight}%</span></span>
                  <span className="font-bold tabular-nums">{p.value === null ? <span className="font-normal text-inksoft">Not counted</span> : p.value}</span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-board" aria-hidden="true">
                  {p.value !== null && <div className="h-full rounded-full" style={{ width: `${Math.max(p.value, 2)}%`, backgroundColor: bandOf(p.value).color }} />}
                </div>
                <p className="mt-0.5 text-[13px] text-inksoft">{p.detail}</p>
              </li>
            ))}
          </ul>
        </>
      )}
      <button className="mt-4 text-sm font-bold underline" onClick={() => setHow(!how)} aria-expanded={how}>How is this worked out?</button>
      {how && (
        <div className="mt-2 grid gap-1.5 text-[14px] text-inksoft">
          <p>The score uses the last {WINDOW} classes and the homework and exams in that time.</p>
          <p><strong className="text-ink">Behaviour:</strong> positive clicks out of all positive and negative clicks. Neutral clicks don't count. Set each button's type under Edit buttons in a class.</p>
          <p><strong className="text-ink">Homework:</strong> done 100, late 50, missing 0. Homework not marked yet isn't counted.</p>
          <p><strong className="text-ink">Attendance:</strong> present 100, late 50, absent 0.</p>
          <p><strong className="text-ink">Awards:</strong> points given during classes. {POINTS_FOR_FULL} points a class is full marks.</p>
          <p><strong className="text-ink">Review:</strong> reviewed last lesson 100, partly 50, no 0.</p>
          <p><strong className="text-ink">Exams:</strong> the percentage of each exam. A mid-term counts twice as much as a unit exam, and a final three times as much.</p>
          <p>Parts with nothing recorded yet are left out, and the others count for more. The arrow compares with the {WINDOW} classes before.</p>
        </div>
      )}
    </section>
  )
}

/** Small bar for tables */
export function PerformanceMini({ perf }: { perf: Performance }) {
  if (perf.score === null || !perf.band) return <span className="text-sm text-inksoft">No classes yet</span>
  const arrow = perf.trend === null ? '' : perf.trend >= 3 ? '▲' : perf.trend <= -3 ? '▼' : ''
  return (
    <span className="flex items-center gap-2" title={`${perf.band.label}${perf.trend !== null ? `, ${perf.trend >= 0 ? '+' : ''}${perf.trend} vs previous classes` : ''}`}>
      <span className="h-2.5 w-20 overflow-hidden rounded-full bg-board" aria-hidden="true">
        <span className="block h-full rounded-full" style={{ width: `${perf.score}%`, backgroundColor: perf.band.color }} />
      </span>
      <span className="font-bold tabular-nums">{perf.score}</span>
      {arrow && <span className={`text-[12px] ${arrow === '▲' ? 'text-sage-dark' : 'text-[#8E1C20]'}`} aria-label={arrow === '▲' ? 'going up' : 'going down'}>{arrow}</span>}
      <span className="sr-only">{perf.band.label}</span>
    </span>
  )
}
