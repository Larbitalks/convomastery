import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

export const SITE_URL = (Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '')

export const cors = {
  'Access-Control-Allow-Origin': SITE_URL || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** Admin database client. Only ever used inside these server functions. */
export const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
export { esc }

/** Send an email through Resend (https://resend.com). Logs and skips if not configured. */
export async function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
  const key = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM') // e.g. "ConvoMastery <hello@yourdomain.com>"
  if (!key || !from) {
    console.warn('Email not sent: RESEND_API_KEY or EMAIL_FROM is not set')
    return false
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  })
  if (!res.ok) console.error('Email failed', res.status, await res.text())
  return res.ok
}

export function emailLayout(title: string, body: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1B2A4A">
  <h1 style="font-size:22px">${title}</h1>${body}
  <p style="margin-top:32px;font-size:13px;color:#4A5A7A">ConvoMastery${SITE_URL ? ` · <a href="${SITE_URL}">${SITE_URL.replace(/^https?:\/\//, '')}</a>` : ''}</p></div>`
}
