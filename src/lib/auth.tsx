import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import type { Profile, Session } from './types'

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState>({ session: null, profile: null, loading: true, isAdmin: false, refresh: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const s = await api.getSession()
    setSession(s)
    setProfile(s ? await api.getProfile().catch(() => null) : null)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    return api.onAuthChange(() => { refresh() })
  }, [refresh])

  return (
    <AuthContext.Provider value={{ session, profile, loading, isAdmin: profile?.role === 'admin', refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
