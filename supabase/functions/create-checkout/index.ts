// Starts a Stripe Checkout payment for one lesson and returns the payment page URL.
// If you choose a different payment provider, this is the file to replace.
import { admin, cors, json, SITE_URL } from '../_shared/util.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const db = admin()
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: auth } = await db.auth.getUser(token)
    const user = auth.user
    if (!user) return json({ error: 'Sign in to continue.' }, 401)

    const { lessonId, successUrl, cancelUrl } = await req.json()
    for (const u of [successUrl, cancelUrl]) {
      if (typeof u !== 'string' || (SITE_URL && !u.startsWith(SITE_URL))) return json({ error: 'Invalid return address.' }, 400)
    }

    const { data: lesson } = await db.from('lessons').select('id, title, summary, price_cents, currency, published').eq('id', lessonId).maybeSingle()
    if (!lesson || !lesson.published) return json({ error: 'Lesson not found.' }, 404)
    if (lesson.price_cents === 0) return json({ error: 'This lesson is free.' }, 400)

    const { data: owned } = await db.from('purchases').select('id').eq('user_id', user.id).eq('lesson_id', lesson.id).maybeSingle()
    if (owned) return json({ error: 'You already own this lesson.' }, 409)

    const form = new URLSearchParams({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email ?? '',
      client_reference_id: user.id,
      'metadata[user_id]': user.id,
      'metadata[lesson_id]': lesson.id,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': lesson.currency.toLowerCase(),
      'line_items[0][price_data][unit_amount]': String(lesson.price_cents),
      'line_items[0][price_data][product_data][name]': `${lesson.title} (ESL speaking lesson)`,
      'line_items[0][price_data][product_data][description]': lesson.summary || lesson.title,
    })
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })
    const session = await res.json()
    if (!res.ok) {
      console.error('Stripe error', session)
      return json({ error: 'Payment could not start.' }, 502)
    }
    return json({ url: session.url })
  } catch (e) {
    console.error(e)
    return json({ error: 'Payment could not start.' }, 500)
  }
})
