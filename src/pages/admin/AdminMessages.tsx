import { useEffect, useState } from 'react'
import { Chat } from '../../components/Chat'
import { Notice, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import { useLoad } from '../../lib/hooks'

export default function AdminMessages() {
  const threads = useLoad(() => api.listThreads())
  const [active, setActive] = useState<string | null>(null)
  const current = active ?? threads.data?.[0]?.userId ?? null
  const msgs = useLoad(async () => (current ? api.listThreadMessages(current) : []), [current])

  useEffect(() => {
    if (!current || !msgs.data?.some((m) => !m.fromAdmin && !m.read)) return
    api.markThreadRead(current).then(() => { threads.reload(); window.dispatchEvent(new Event('cm:messages-read')) }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs.data, current])

  if (threads.loading && !threads.data) return <Spinner />
  if (threads.error) return <Notice tone="error">{threads.error}</Notice>
  if (!threads.data?.length) return <p className="text-inksoft">No messages yet. When customers write to you from their dashboard, the conversations appear here.</p>
  const thread = threads.data.find((t) => t.userId === current)

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <ul className="grid content-start gap-2" aria-label="Conversations">
        {threads.data.map((t) => (
          <li key={t.userId}>
            <button onClick={() => setActive(t.userId)} aria-current={t.userId === current ? 'true' : undefined}
              className={`w-full rounded-xl border-2 p-3 text-left ${t.userId === current ? 'border-brand bg-brand-light' : 'border-line bg-white hover:border-ink/30'}`}>
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-bold">{t.userName || t.userEmail}</span>
                {t.unread > 0 && <span className="rounded-full bg-coral px-2 text-[13px] text-white">{t.unread}</span>}
              </span>
              <span className="block truncate text-[14px] text-inksoft">{t.lastMessage.fromAdmin ? 'You: ' : ''}{t.lastMessage.body}</span>
              <span className="block text-[12px] text-inksoft">{formatDateTime(t.lastMessage.createdAt)}</span>
            </button>
          </li>
        ))}
      </ul>
      <div>
        {thread && <p className="mb-3"><strong>{thread.userName}</strong> <span className="text-inksoft">{thread.userEmail}</span></p>}
        {msgs.loading && !msgs.data ? <Spinner /> : (
          <Chat messages={msgs.data ?? []} mine={(m) => m.fromAdmin} otherName={thread?.userName?.split(' ')[0] || 'Customer'} emptyText="No messages."
            onSend={async (body) => { await api.sendAdminMessage(current!, body); await msgs.reload(); threads.reload() }} />
        )}
      </div>
    </div>
  )
}
