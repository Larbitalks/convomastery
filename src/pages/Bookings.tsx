import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Field, Notice, Spinner, Textarea } from '../components/ui'
import { trackEvent } from '../lib/analytics'
import { api } from '../lib/api'
import { errorMessage, formatDateTime, formatDay, formatTime, timeZoneName } from '../lib/format'
import { useLoad } from '../lib/hooks'
import { Seo } from '../lib/seo'
import { SLOT_KINDS, type BookingSlot } from '../lib/types'

const KIND_TEXT: Record<string, string> = {
  'One-to-one lesson': 'A private conversation lesson with Larbi, online.',
  'Trial lesson': 'A short first lesson to meet, check your level and plan.',
  'Teacher training': 'A group workshop for teachers on running speaking lessons.',
}

export default function Bookings() {
  const { data, loading, error, reload } = useLoad(async () => {
    const [slots, mine] = await Promise.all([api.listSlots(), api.listMyBookings()])
    return { slots, mine }
  })
  const [kind, setKind] = useState('')
  const [chosen, setChosen] = useState<BookingSlot | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const nowIso = new Date().toISOString()
  const mineConfirmed = (data?.mine ?? []).filter((b) => b.status === 'confirmed')
  const bookedSlotIds = new Set(mineConfirmed.map((b) => b.slotId))
  const upcomingMine = mineConfirmed.filter((b) => (b.slot?.startsAt ?? '') > nowIso)
  const pastMine = (data?.mine ?? []).filter((b) => (b.slot?.startsAt ?? '') <= nowIso || b.status === 'cancelled').reverse()

  const days = useMemo(() => {
    const open = (data?.slots ?? []).filter((s) => (!kind || s.kind === kind))
    const map = new Map<string, BookingSlot[]>()
    for (const s of open) {
      const key = new Date(s.startsAt).toDateString()
      map.set(key, [...(map.get(key) ?? []), s])
    }
    return [...map.values()]
  }, [data, kind])

  const book = async () => {
    if (!chosen) return
    setBusy(true); setMsg(null)
    try {
      await api.bookSlot(chosen.id, note.trim())
      trackEvent('booking', { kind: chosen.kind })
      setMsg({ tone: 'success', text: `Booked: ${chosen.kind}, ${formatDay(chosen.startsAt)} at ${formatTime(chosen.startsAt)}. A confirmation email is on its way.` })
      setChosen(null); setNote(''); reload()
    } catch (e) { setMsg({ tone: 'error', text: errorMessage(e) }) } finally { setBusy(false) }
  }
  const cancel = async (id: string) => {
    try { await api.cancelBooking(id); setCancelling(null); setMsg({ tone: 'success', text: 'Booking cancelled.' }); reload() } catch (e) { setMsg({ tone: 'error', text: errorMessage(e) }) }
  }

  if (loading && !data) return <Spinner />
  return (
    <div>
      <Seo title="Bookings" noindex />
      <h1 className="text-3xl font-extrabold">Bookings</h1>
      {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
      {msg && <div className="mt-4 max-w-3xl"><Notice tone={msg.tone}>{msg.text}</Notice></div>}

      {upcomingMine.length > 0 && (
        <section className="mt-6 max-w-3xl">
          <h2 className="text-xl font-bold">Your upcoming bookings</h2>
          <ul className="mt-3 grid gap-3">
            {upcomingMine.map((b) => (
              <li key={b.id} className="panel flex flex-wrap items-center justify-between gap-3 border-brand/40 p-4">
                <div>
                  <p className="font-bold">{b.slot?.kind}</p>
                  <p className="text-[15px] text-inksoft">{b.slot && `${formatDay(b.slot.startsAt)}, ${formatTime(b.slot.startsAt)}, ${b.slot.durationMinutes} min`}</p>
                </div>
                {cancelling === b.id ? (
                  <div className="flex items-center gap-2">
                    <button className="btn-danger !py-1.5" onClick={() => cancel(b.id)}>Cancel booking</button>
                    <button className="btn-ghost !py-1.5" onClick={() => setCancelling(null)}>Keep it</button>
                  </div>
                ) : <button className="btn-ghost !py-1.5" onClick={() => setCancelling(b.id)}>Cancel</button>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-bold">Book a session</h2>
        <p className="mt-1 text-[15px] text-inksoft">Times are shown in your time zone ({timeZoneName()}).</p>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Session type">
          {['', ...SLOT_KINDS].map((k) => (
            <button key={k || 'all'} aria-pressed={kind === k} onClick={() => setKind(k)}
              className={`chip ${kind === k ? 'border-brand bg-brand text-white' : 'border-line hover:border-ink/40'}`}>{k || 'All sessions'}</button>
          ))}
        </div>
        {kind && <p className="mt-3 text-inksoft">{KIND_TEXT[kind]}</p>}

        {days.length === 0 ? (
          <div className="panel mt-6 max-w-3xl p-6">
            <p className="font-bold">No open times right now</p>
            <p className="mt-1 text-inksoft">New times are added every week. <Link to="/messages" className="font-bold underline">Send a message</Link> to ask for a time that suits you.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="grid content-start gap-6">
              {days.map((slots) => (
                <div key={slots[0].startsAt}>
                  <h3 className="font-bold">{formatDay(slots[0].startsAt)}</h3>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {slots.map((s) => {
                      const left = s.capacity - s.bookedCount
                      const mineAlready = bookedSlotIds.has(s.id)
                      const full = left <= 0
                      const selected = chosen?.id === s.id
                      return (
                        <li key={s.id}>
                          <button disabled={full || mineAlready} onClick={() => { setChosen(s); setMsg(null) }} aria-pressed={selected}
                            className={`rounded-xl border-2 px-4 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'border-brand bg-brand-light' : 'border-line bg-white hover:border-ink/40'}`}>
                            <span className="block font-display text-lg font-extrabold tabular-nums">{formatTime(s.startsAt)}</span>
                            <span className="block text-[13px] text-inksoft">{s.kind}, {s.durationMinutes} min</span>
                            <span className="block text-[13px] font-bold">{mineAlready ? 'Booked by you' : full ? 'Full' : s.capacity > 1 ? `${left} places left` : 'Available'}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
            <aside className="panel self-start p-5 lg:sticky lg:top-6">
              {chosen ? (
                <div className="grid gap-4">
                  <div>
                    <p className="text-lg font-bold">{chosen.kind}</p>
                    <p className="text-inksoft">{formatDay(chosen.startsAt)}, {formatTime(chosen.startsAt)}, {chosen.durationMinutes} minutes</p>
                    {chosen.notes && <p className="mt-2 text-[15px]">{chosen.notes}</p>}
                  </div>
                  <Field label="Anything Larbi should know? (optional)" htmlFor="bookNote">
                    <Textarea id="bookNote" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Your level, goals, or what you want to practise" />
                  </Field>
                  <button className="btn-primary !py-3" onClick={book} disabled={busy}>{busy ? 'Booking' : 'Confirm booking'}</button>
                  <button className="text-sm font-bold underline" onClick={() => setChosen(null)}>Choose a different time</button>
                </div>
              ) : <p className="text-inksoft">Choose a time to book it.</p>}
            </aside>
          </div>
        )}
      </section>

      {pastMine.length > 0 && (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-xl font-bold">Past and cancelled</h2>
          <ul className="mt-3 grid gap-1 text-[15px] text-inksoft">
            {pastMine.map((b) => <li key={b.id}>{b.slot && formatDateTime(b.slot.startsAt)}: {b.slot?.kind}{b.status === 'cancelled' ? ' (cancelled)' : ''}</li>)}
          </ul>
        </section>
      )}
    </div>
  )
}
