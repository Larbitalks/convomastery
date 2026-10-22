import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Field, Input, Notice, Select } from '../components/ui'
import { trackEvent } from '../lib/analytics'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { errorMessage } from '../lib/format'
import { Seo } from '../lib/seo'
import { USER_TYPES, type UserType } from '../lib/types'

function AuthCard({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="wrap py-14">
      <Seo title={title} noindex />
      <div className="mx-auto max-w-md">
        <h1 className="text-4xl font-extrabold">{title}</h1>
        {intro && <p className="mt-3 text-inksoft">{intro}</p>}
        <div className="panel mt-8 p-6 sm:p-8">{children}</div>
      </div>
    </div>
  )
}

const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/library')

export function Login() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const next = safeNext(params.get('next'))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null); setBusy(true)
    try {
      await api.signIn(email, password)
      await refresh()
      trackEvent('login')
      navigate(next, { replace: true })
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <AuthCard title="Sign in" intro={<>New here? <Link className="font-bold text-brand-dark underline underline-offset-2" to={`/signup?next=${encodeURIComponent(next)}`}>Create a free account</Link>.</>}>
      <form onSubmit={submit} className="grid gap-5">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Email" htmlFor="email"><Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password" htmlFor="password"><Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <button className="btn-primary !py-3" disabled={busy}>{busy ? 'Signing in' : 'Sign in'}</button>
        <Link to="/forgot-password" className="text-[15px] font-bold underline underline-offset-2 justify-self-start">Forgot your password?</Link>
      </form>
    </AuthCard>
  )
}

export function Signup() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', userType: 'ESL teacher' as UserType })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)
  const next = safeNext(params.get('next'))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (form.password.length < 8) { setError('Use at least 8 characters for your password.'); return }
    setBusy(true)
    try {
      const { needsVerification } = await api.signUp(form)
      trackEvent('sign_up', { user_type: form.userType })
      if (needsVerification) { setCheckEmail(true); return }
      await refresh()
      navigate(next, { replace: true })
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }

  if (checkEmail) {
    return (
      <AuthCard title="Check your email">
        <p>We sent a link to <strong>{form.email}</strong>. Open it to verify your address, then sign in.</p>
        <p className="mt-3 text-inksoft text-[15px]">No email after a few minutes? Check your spam folder.</p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Create your free account" intro={<>Already have one? <Link className="font-bold text-brand-dark underline underline-offset-2" to={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>.</>}>
      <form onSubmit={submit} className="grid gap-5">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Your name" htmlFor="fullName"><Input id="fullName" required autoComplete="name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
        <Field label="Email" htmlFor="email"><Input id="email" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters."><Input id="password" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="I am a" htmlFor="userType" hint="Helps us suggest the right lessons.">
          <Select id="userType" value={form.userType} onChange={(e) => setForm({ ...form, userType: e.target.value as UserType })}>
            {USER_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <button className="btn-primary !py-3" disabled={busy}>{busy ? 'Creating account' : 'Create account'}</button>
      </form>
    </AuthCard>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null); setBusy(true)
    try { await api.sendPasswordReset(email); setSent(true) } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return (
    <AuthCard title="Reset your password" intro="Enter your account email and we will send you a link to choose a new password.">
      {sent ? (
        <Notice tone="success">If an account exists for {email}, a reset link is on its way.{api.mode === 'demo' && ' (Demo mode does not send emails.)'}</Notice>
      ) : (
        <form onSubmit={submit} className="grid gap-5">
          {error && <Notice tone="error">{error}</Notice>}
          <Field label="Email" htmlFor="email"><Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <button className="btn-primary !py-3" disabled={busy}>{busy ? 'Sending' : 'Send reset link'}</button>
        </form>
      )}
    </AuthCard>
  )
}

export function ResetPassword() {
  const navigate = useNavigate()
  const { session, loading } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null); setBusy(true)
    try { await api.updatePassword(password); navigate('/library', { replace: true }) } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  if (!loading && !session) {
    return (
      <AuthCard title="Choose a new password">
        <Notice tone="error">This reset link has expired or was already used.</Notice>
        <Link to="/forgot-password" className="btn-primary mt-5">Send a new link</Link>
      </AuthCard>
    )
  }
  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={submit} className="grid gap-5">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="New password" htmlFor="password" hint="At least 8 characters."><Input id="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <button className="btn-primary !py-3" disabled={busy}>{busy ? 'Saving' : 'Save new password'}</button>
      </form>
    </AuthCard>
  )
}
