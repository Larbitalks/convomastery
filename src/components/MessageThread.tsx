import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Notice, Textarea } from './ui'
import { errorMessage, formatDateTime } from '../lib/format'

export interface ThreadMessage { id?: string; mine: boolean; who: string; body: string; createdAt: string }

/** A short chat: bubbles on the right are from the person viewing, on the left from the other side */
export function MessageThread({ messages, onSend, placeholder, sendLabel = 'Send', empty, maxLength = 2000, onDelete }: {
  messages: ThreadMessage[]; onSend: (body: string) => Promise<void>; placeholder: string; sendLabel?: string; empty: string; maxLength?: number
  onDelete?: (id: string) => Promise<void>
}) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const list = useRef<HTMLOListElement>(null)
  useEffect(() => { if (list.current) list.current.scrollTop = list.current.scrollHeight }, [messages.length])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    setBusy(true); setErr(null); setSent(false)
    try { await onSend(body.trim()); setBody(''); setSent(true) } catch (x) { setErr(errorMessage(x)) } finally { setBusy(false) }
  }
  return (
    <div className="grid gap-3">
      {messages.length === 0 ? <p className="text-[15px] text-inksoft">{empty}</p> : (
        <ol ref={list} className="grid max-h-80 gap-2 overflow-y-auto pr-1" aria-label="Messages">
          {messages.map((m, i) => (
            <li key={m.id ?? i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-[15px] ${m.mine ? 'justify-self-end rounded-br-md bg-ink text-white' : 'justify-self-start rounded-bl-md bg-white ring-2 ring-line'}`}>
              <p className={`text-[12px] ${m.mine ? 'text-white/70' : 'text-inksoft'}`}>{m.who}, {formatDateTime(m.createdAt)}</p>
              <p className="whitespace-pre-line break-words">{m.body}</p>
              {onDelete && m.id && <button className={`mt-0.5 text-[12px] underline ${m.mine ? 'text-white/70' : 'text-inksoft'}`} onClick={() => onDelete(m.id!)}>Delete</button>}
            </li>
          ))}
        </ol>
      )}
      <form onSubmit={send} className="grid gap-2">
        {err && <Notice tone="error">{err}</Notice>}
        <Textarea aria-label={placeholder} rows={3} maxLength={maxLength} value={body} placeholder={placeholder} onChange={(e) => { setBody(e.target.value); setSent(false) }} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-inksoft" aria-live="polite">{sent ? 'Sent.' : body.length > maxLength - 200 ? `${maxLength - body.length} characters left` : ''}</span>
          <button className="btn-primary" disabled={busy || !body.trim()}>{busy ? 'Sending' : sendLabel}</button>
        </div>
      </form>
    </div>
  )
}
