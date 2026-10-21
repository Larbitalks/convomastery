// Emails the other side of a conversation when a new message arrives.
import { admin, cors, emailLayout, esc, json, sendEmail, SITE_URL } from '../_shared/util.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const { id } = await req.json().catch(() => ({}))
  if (typeof id !== 'string') return json({ error: 'Missing id' }, 400)
  const db = admin()
  const { data: m } = await db.from('messages').update({ notified: true }).eq('id', id).eq('notified', false)
    .select('*, profiles!messages_thread_user_id_fkey(email, full_name)').maybeSingle()
  if (!m) return json({ ok: true })
  const customer = m.profiles
  const body = `<p style="white-space:pre-line;background:#EEF2F8;padding:16px;border-radius:12px">${esc(m.body)}</p>`
  if (m.from_admin) {
    if (customer?.email) {
      await sendEmail(customer.email, 'New message from Larbi', emailLayout('You have a new message', `${body}<p><a href="${SITE_URL}/messages">Reply on the website</a></p>`))
    }
  } else {
    const owner = Deno.env.get('ADMIN_EMAIL')
    if (owner) {
      await sendEmail(owner, `New message from ${customer?.full_name || customer?.email}`, emailLayout(
        `Message from ${esc(customer?.full_name || customer?.email || 'a customer')}`,
        `${body}<p><a href="${SITE_URL}/admin/messages">Reply in the admin area</a></p>`,
      ))
    }
  }
  return json({ ok: true })
})
