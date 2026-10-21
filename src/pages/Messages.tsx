import { useEffect } from 'react'
import { Chat } from '../components/Chat'
import { Notice, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useLoad } from '../lib/hooks'
import { Seo } from '../lib/seo'

export default function Messages() {
  const { session } = useAuth()
  const { data, loading, error, reload } = useLoad(() => api.listMyMessages())

  useEffect(() => {
    if (!session || !data?.some((m) => m.fromAdmin && !m.read)) return
    api.markThreadRead(session.userId).then(() => window.dispatchEvent(new Event('cm:messages-read'))).catch(() => {})
  }, [data, session])
  useEffect(() => {
    const t = setInterval(reload, 20_000)
    return () => clearInterval(t)
  }, [reload])

  return (
    <div className="max-w-3xl">
      <Seo title="Messages" noindex />
      <h1 className="text-3xl font-extrabold">Messages</h1>
      <p className="mt-2 text-inksoft">Questions about a lesson, a booking or your account? Write to Larbi here. You also get an email when he replies.</p>
      <div className="mt-6">
        {error && <Notice tone="error">{error}</Notice>}
        {loading && !data ? <Spinner /> : (
          <Chat messages={data ?? []} mine={(m) => !m.fromAdmin} otherName="Larbi" emptyText="No messages yet. Say hello!"
            onSend={async (body) => { await api.sendMessage(body); await reload() }} />
        )}
      </div>
    </div>
  )
}
