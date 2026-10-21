import { useEffect, useState, type FormEvent } from 'react'
import { Field, Input, Notice, Select } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { errorMessage } from '../lib/format'
import { Seo } from '../lib/seo'
import { USER_TYPES, type UserType } from '../lib/types'

export default function Account() {
  const { profile, refresh } = useAuth()
  const [fullName, setFullName] = useState('')
  const [userType, setUserType] = useState<UserType | ''>('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (profile) { setFullName(profile.fullName); setUserType(profile.userType ?? '') }
  }, [profile])

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null)
    try { await api.updateProfile({ fullName, userType: userType || null }); await refresh(); setMsg({ tone: 'success', text: 'Profile saved.' }) }
    catch (err) { setMsg({ tone: 'error', text: errorMessage(err) }) }
  }
  const savePassword = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null)
    try { await api.updatePassword(password); setPassword(''); setMsg({ tone: 'success', text: 'Password changed.' }) }
    catch (err) { setMsg({ tone: 'error', text: errorMessage(err) }) }
  }

  return (
    <div>
      <Seo title="Account" noindex />
      <h1 className="text-3xl font-extrabold">Account</h1>
      <p className="mt-3 text-inksoft">Signed in as {profile?.email}</p>
      <div className="mt-8 grid max-w-3xl gap-6">
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <form onSubmit={saveProfile} className="panel grid gap-5 p-6">
          <h2 className="text-xl font-bold">Profile</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Your name" htmlFor="fullName"><Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
            <Field label="I am a" htmlFor="userType">
              <Select id="userType" value={userType} onChange={(e) => setUserType(e.target.value as UserType)}>
                <option value="">Choose one</option>
                {USER_TYPES.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
          </div>
          <button className="btn-primary justify-self-start">Save profile</button>
        </form>
        <form onSubmit={savePassword} className="panel grid gap-5 p-6">
          <h2 className="text-xl font-bold">Change password</h2>
          <Field label="New password" htmlFor="newPassword" hint="At least 8 characters."><Input id="newPassword" type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <button className="btn-ghost justify-self-start">Change password</button>
        </form>
      </div>
    </div>
  )
}
