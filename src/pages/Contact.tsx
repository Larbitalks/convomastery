import { useState, type FormEvent } from 'react'
import { Field, Input, Notice, Select, Textarea } from '../components/ui'
import { trackEvent } from '../lib/analytics'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { errorMessage } from '../lib/format'
import { Seo } from '../lib/seo'
import { USER_TYPES, type Inquiry } from '../lib/types'

const KINDS: Inquiry['kind'][] = ['Lesson materials', 'Partnership or school', 'Something else']

export default function Contact() {
  const { profile } = useAuth()
  const [form, setForm] = useState({ name: profile?.fullName ?? '', email: profile?.email ?? '', userType: profile?.userType ?? '', kind: KINDS[0], message: '', website: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (form.website) return // spam trap
    setError(null)
    setStatus('sending')
    try {
      await api.submitInquiry({ name: form.name.trim(), email: form.email.trim(), kind: form.kind, userType: form.userType || null, message: form.message.trim() })
      trackEvent('generate_lead', { kind: form.kind })
      setStatus('sent')
    } catch (err) {
      setError(errorMessage(err))
      setStatus('idle')
    }
  }

  return (
    <div className="wrap py-12">
      <Seo title="Contact" description="Questions about ConvoMastery lesson materials, schools and partnerships. Send a message and get a reply by email." />
      <div className="grid gap-12 md:grid-cols-[1fr_1.3fr]">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold">Get in touch</h1>
          <p className="mt-4 text-inksoft">Ask about a lesson, request a topic, or tell us about your school or tutoring business. You will get a reply by email, usually within two working days.</p>
        </div>
        {status === 'sent' ? (
          <div className="panel p-8">
            <h2 className="text-2xl font-extrabold">Message sent</h2>
            <p className="mt-2 text-inksoft">Thanks, {form.name.split(' ')[0] || 'there'}. A reply will go to {form.email}.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="panel grid gap-5 p-6 sm:p-8">
            {error && <Notice tone="error">{error}</Notice>}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Your name" htmlFor="name"><Input id="name" required value={form.name} onChange={set('name')} autoComplete="name" /></Field>
              <Field label="Email" htmlFor="email"><Input id="email" type="email" required value={form.email} onChange={set('email')} autoComplete="email" /></Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="I am a" htmlFor="userType">
                <Select id="userType" value={form.userType} onChange={set('userType')}>
                  <option value="">Choose one</option>
                  {USER_TYPES.map((t) => <option key={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="My message is about" htmlFor="kind">
                <Select id="kind" value={form.kind} onChange={set('kind')}>
                  {KINDS.map((k) => <option key={k}>{k}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Message" htmlFor="message" hint="For lesson questions, tell us your students' level and age.">
              <Textarea id="message" required minLength={10} value={form.message} onChange={set('message')} />
            </Field>
            <div className="hidden" aria-hidden="true">
              <label htmlFor="website">Leave this empty</label>
              <input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
            </div>
            <button className="btn-primary justify-self-start !px-6 !py-3" disabled={status === 'sending'}>{status === 'sending' ? 'Sending' : 'Send message'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
