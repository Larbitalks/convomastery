// Receives Stripe's "payment completed" event, records the purchase and emails a receipt.
// Deploy with --no-verify-jwt, because Stripe calls it without a Supabase login.
import { admin, emailLayout, esc, sendEmail, SITE_URL } from '../_shared/util.ts'

async function verifyStripeSignature(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]))
  const t = parts['t']
  const signatures = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3))
  if (!t || !signatures.length) return false
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false // older than 5 minutes
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${payload}`))
  const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return signatures.some((s) => s.length === expected.length && s === expected)
}

Deno.serve(async (req) => {
  const payload = await req.text()
  const ok = await verifyStripeSignature(payload, req.headers.get('stripe-signature') ?? '', Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '')
  if (!ok) return new Response('Invalid signature', { status: 400 })

  const event = JSON.parse(payload)
  if (event.type !== 'checkout.session.completed') return new Response('ignored')
  const s = event.data.object
  if (s.payment_status !== 'paid') return new Response('not paid')

  const db = admin()
  const userId = s.metadata?.user_id
  const lessonId = s.metadata?.lesson_id
  const { error, data: inserted } = await db.from('purchases').upsert(
    { user_id: userId, lesson_id: lessonId, amount_cents: s.amount_total, currency: String(s.currency).toUpperCase(), provider: 'stripe', provider_ref: s.id },
    { onConflict: 'provider_ref', ignoreDuplicates: true },
  ).select()
  if (error) {
    console.error('Could not record purchase', error)
    return new Response('error', { status: 500 }) // Stripe will retry
  }
  if (!inserted?.length) return new Response('already recorded')

  const { data: lesson } = await db.from('lessons').select('title, slug').eq('id', lessonId).single()
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: String(s.currency).toUpperCase() }).format(s.amount_total / 100)
  const to = s.customer_details?.email ?? s.customer_email
  if (to && lesson) {
    await sendEmail(to, `Your lesson: ${lesson.title}`, emailLayout('Thank you for your purchase', `
      <p>You bought <strong>${esc(lesson.title)}</strong> for ${amount}.</p>
      <p>Download it any time from your library:</p>
      <p><a href="${SITE_URL}/library" style="display:inline-block;background:#0E7C7B;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Open my library</a></p>
      <p style="font-size:13px;color:#4A5A7A">Order reference: ${esc(s.id)}</p>`))
  }
  return new Response('ok')
})
