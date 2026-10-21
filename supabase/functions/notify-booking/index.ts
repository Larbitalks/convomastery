// Emails a booking confirmation (or cancellation) to the customer and to the site owner.
import { admin, cors, emailLayout, esc, json, sendEmail, SITE_URL } from '../_shared/util.ts'

// Times in emails use TIME_ZONE (for example Asia/Jakarta). Customers also see their own local time on the website.
const TZ = Deno.env.get('TIME_ZONE') || 'UTC'
const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: TZ }) + ` (${TZ.replace(/_/g, ' ')} time)`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const { id } = await req.json().catch(() => ({}))
  if (typeof id !== 'string') return json({ error: 'Missing id' }, 400)
  const db = admin()
  const { data: b } = await db.from('bookings').select('*, booking_slots(*), profiles(email, full_name)').eq('id', id).maybeSingle()
  // Send once per status change, which also stops this from being used to send spam.
  if (!b || b.notified_status === b.status) return json({ ok: true })
  await db.from('bookings').update({ notified_status: b.status }).eq('id', id)

  const s = b.booking_slots
  const name = b.profiles?.full_name || b.profiles?.email
  const cancelled = b.status === 'cancelled'
  const details = `<p><strong>${esc(s.kind)}</strong><br>${when(s.starts_at)}, ${s.duration_minutes} minutes</p>${s.notes ? `<p>${esc(s.notes)}</p>` : ''}`

  if (b.profiles?.email) {
    await sendEmail(b.profiles.email, cancelled ? `Cancelled: ${s.kind}` : `Booking confirmed: ${s.kind}`, emailLayout(
      cancelled ? 'Your booking is cancelled' : 'Your booking is confirmed',
      `${details}<p>${cancelled ? 'If this is a mistake, book a new time from your dashboard.' : 'You can see or cancel this booking from your dashboard.'}</p>
       <p><a href="${SITE_URL}/bookings">Open my bookings</a></p>`,
    ))
  }
  const owner = Deno.env.get('ADMIN_EMAIL')
  if (owner) {
    await sendEmail(owner, `${cancelled ? 'Booking cancelled' : 'New booking'}: ${s.kind}, ${name}`, emailLayout(
      cancelled ? 'A booking was cancelled' : 'New booking',
      `<p>${esc(name ?? '')} (${esc(b.profiles?.email ?? '')})</p>${details}${b.message ? `<p style="background:#EEF2F8;padding:12px;border-radius:10px">${esc(b.message)}</p>` : ''}
       <p><a href="${SITE_URL}/admin/bookings">See all bookings</a></p>`,
    ), b.profiles?.email)
  }
  return json({ ok: true })
})
