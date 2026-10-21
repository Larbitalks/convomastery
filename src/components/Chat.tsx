import { useEffect, useRef, useState, type FormEvent } from 'react'
import { formatDateTime } from '../lib/format'
import type { Message } from '../lib/types'
import { Notice, Textarea } from './ui'

/** A message thread. `mine` decides which side a message sits on. */
export function Chat({ messages, mine, onSend, otherName, emptyText }: {
  messages: Message[]
  mine: (m: Message) => boolean
  onSend: (body: string) => Promise<void>
  otherName: string
  emptyText: string
}) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }) }, [messages.length])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setBusy(true); setErr(null)
    try { await onSend(text); setBody('') } catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Message not sent. Try again.') } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col rounded-2xl border-2 border-line bg-white">
      <div className="max-h-[55vh] min-h-[240px] overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 ? <p className="py-10 text-center text-inksoft">{emptyText}</p> : (
          <ul className="grid gap-3">
            {messages.map((m) => {
              const me = mine(m)
              return (
                <li key={m.id} className={`flex flex-col ${me ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-2.5 ${me ? 'rounded-br-sm bg-teal text-white' : 'rounded-bl-sm bg-board'}`}>{m.body}</div>
                  <span className="mt-1 text-[12px] text-inksoft">{me ? 'You' : otherName}, {formatDateTime(m.createdAt)}</span>
                </li>
              )
            })}
          </ul>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="grid gap-2 border-t-2 border-line p-3">
        {err && <Notice tone="error">{err}</Notice>}
        <label htmlFor="chatBody" className="sr-only">Your message</label>
        <Textarea id="chatBody" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(e as unknown as FormEvent) }} />
        <div className="flex items-center justify-between gap-3">
          <span className="hint !mt-0">Ctrl + Enter to send</span>
          <button className="btn-primary" disabled={busy || !body.trim()}>{busy ? 'Sending' : 'Send'}</button>
        </div>
      </form>
    </div>
  )
}
