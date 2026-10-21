// Emails the site owner when someone sends a message through the contact form.
import { admin, cors, emailLayout, esc, json, sendEmail, SITE_URL } from '../_shared/util.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const { id } = await req.json().catch(() => ({}))
  if (typeof id !== 'string') return json({ error: 'Missing id' }, 400)
  const db = admin()
  // Only notify once per message, which also stops this from being used to send spam.
  const { data: q } = await db.from('inquiries').update({ notified: true }).eq('id', id).eq('notified', false).select().maybeSingle()
  if (!q) return json({ ok: true })
  const to = Deno.env.get('ADMIN_EMAIL')
  if (!to) return json({ ok: true })
  await sendEmail(to, `New message: ${q.kind} from ${q.name}`, emailLayout('New message from the website', `
    <p><strong>${esc(q.name)}</strong> (${esc(q.email)})${q.user_type ? `, ${esc(q.user_type)}` : ''}</p>
    <p><strong>About:</strong> ${esc(q.kind)}</p>
    <p style="white-space:pre-line;background:#EEF2F8;padding:16px;border-radius:12px">${esc(q.message)}</p>
    <p>Reply to this email to answer, or see all messages in the <a href="${SITE_URL}/admin/inquiries">admin area</a>.</p>`), q.email)
  return json({ ok: true })
})
