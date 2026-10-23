// Emails the teacher when a student or parent sends a message from the progress page.
import { admin, cors, emailLayout, esc, json, sendEmail, SITE_URL } from '../_shared/util.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const { id } = await req.json().catch(() => ({}))
  if (typeof id !== 'string') return json({ error: 'Missing id' }, 400)
  const db = admin()
  // Only messages from students that have not been emailed yet, so this can't be used to send repeat emails
  const { data: m } = await db.from('student_messages').update({ notified: true }).eq('id', id).eq('notified', false).eq('from_teacher', false)
    .select('body, student_id, owner_id').maybeSingle()
  if (!m) return json({ ok: true })
  const [{ data: student }, { data: teacher }] = await Promise.all([
    db.from('students').select('name').eq('id', m.student_id).maybeSingle(),
    db.from('profiles').select('email').eq('id', m.owner_id).maybeSingle(),
  ])
  if (teacher?.email) {
    const name = student?.name || 'A student'
    await sendEmail(teacher.email, `New message from ${name}`, emailLayout(
      `Message from ${esc(name)}`,
      `<p style="white-space:pre-line;background:#EEF2F8;padding:16px;border-radius:12px">${esc(m.body)}</p><p><a href="${SITE_URL}/students/${m.student_id}">Reply on ${esc(name)}'s profile</a></p>`,
    ))
  }
  return json({ ok: true })
})
