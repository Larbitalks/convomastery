import { useState, type FormEvent } from 'react'
import { Field, Input, Notice, Select, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { errorMessage, formatDay, formatTime, timeZoneName } from '../../lib/format'
import { useLoad } from '../../lib/hooks'
import { SLOT_KINDS, type SlotKind } from '../../lib/types'

export default function AdminBookings() {
  const { data, loading, error, reload } = useLoad(async () => {
    const [slots, bookings] = await Promise.all([api.listSlots(), api.listAllBookings()])
    return { slots, bookings }
  })
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10)
  const [form, setForm] = useState({ date: tomorrow, time: '10:00', durationMinutes: 60, kind: 'One-to-one lesson' as SlotKind, capacity: 1, notes: '', weeks: 1 })
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const add = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null); setBusy(true)
    try {
      const first = new Date(`${form.date}T${form.time}`)
      if (first.getTime() < Date.now()) throw new Error('Choose a time in the future.')
      for (let w = 0; w < form.weeks; w++) {
        const start = new Date(first.getTime() + w * 7 * 864e5)
        await api.saveSlot({ startsAt: start.toISOString(), durationMinutes: form.durationMinutes, kind: form.kind, capacity: form.capacity, notes: form.notes })
      }
      setMsg({ tone: 'success', text: form.weeks > 1 ? `Added ${form.weeks} weekly times.` : 'Time added. Customers can book it now.' })
      reload()
    } catch (e2) { setMsg({ tone: 'error', text: errorMessage(e2) }) } finally { setBusy(false) }
  }
  const remove = async (id: string) => { setMsg(null); try { await api.deleteSlot(id); reload() } catch (e) { setMsg({ tone: 'error', text: errorMessage(e) }) } }
  const cancel = async (id: string) => { try { await api.cancelBooking(id); reload() } catch (e) { setMsg({ tone: 'error', text: errorMessage(e) }) } }

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      <form onSubmit={add} className="panel grid content-start gap-4 p-5 self-start">
        <h2 className="text-xl font-bold">Add a bookable time</h2>
        <p className="hint !mt-0">Times use your time zone ({timeZoneName()}). Customers see them in theirs.</p>
        <Field label="Type" htmlFor="slotKind">
          <Select id="slotKind" value={form.kind} onChange={(e) => {
            const kind = e.target.value as SlotKind
            setForm({ ...form, kind, capacity: kind === 'Teacher training' ? 8 : 1, durationMinutes: kind === 'Trial lesson' ? 30 : 60 })
          }}>{SLOT_KINDS.map((k) => <option key={k}>{k}</option>)}</Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" htmlFor="slotDate"><Input id="slotDate" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Start" htmlFor="slotTime"><Input id="slotTime" type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Minutes" htmlFor="slotDur"><Input id="slotDur" type="number" min={15} step={15} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} /></Field>
          <Field label="Places" htmlFor="slotCap"><Input id="slotCap" type="number" min={1} max={100} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></Field>
          <Field label="Repeat" htmlFor="slotWeeks">
            <Select id="slotWeeks" value={form.weeks} onChange={(e) => setForm({ ...form, weeks: Number(e.target.value) })}>
              {[1, 2, 4, 8, 12].map((w) => <option key={w} value={w}>{w === 1 ? 'Once' : `${w} weeks`}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Note for customers (optional)" htmlFor="slotNotes"><Input id="slotNotes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Workshop topic, meeting link info" /></Field>
        <button className="btn-primary" disabled={busy}>{busy ? 'Adding' : 'Add time'}</button>
      </form>

      <div>
        {msg && <div className="mb-4"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
        {error && <Notice tone="error">{error}</Notice>}
        <h2 className="text-xl font-bold">Upcoming times</h2>
        {loading && !data ? <Spinner /> : !data?.slots.length ? <p className="mt-2 text-inksoft">No upcoming times. Add one to open bookings.</p> : (
          <ul className="mt-3 grid gap-3">
            {data.slots.map((s) => {
              const bs = data.bookings.filter((b) => b.slotId === s.id && b.status === 'confirmed')
              return (
                <li key={s.id} className={`panel p-4 ${bs.length ? 'border-teal/40' : ''}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{formatDay(s.startsAt)}, {formatTime(s.startsAt)}</p>
                      <p className="text-[15px] text-inksoft">{s.kind}, {s.durationMinutes} min, {bs.length} of {s.capacity} booked</p>
                    </div>
                    {bs.length === 0 && <button className="btn-ghost !py-1.5" onClick={() => remove(s.id)}>Remove time</button>}
                  </div>
                  {bs.length > 0 && (
                    <ul className="mt-3 grid gap-2 border-t-2 border-line pt-3">
                      {bs.map((b) => (
                        <li key={b.id} className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p><strong>{b.userName || b.userEmail}</strong> <span className="text-inksoft">{b.userEmail}</span></p>
                            {b.message && <p className="text-[15px] text-inksoft">"{b.message}"</p>}
                          </div>
                          <button className="text-sm font-bold text-coral underline" onClick={() => cancel(b.id)}>Cancel booking</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
