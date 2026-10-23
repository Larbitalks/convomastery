import { useEffect } from 'react'
import { MessageThread } from './MessageThread'
import { Spinner } from './ui'
import { api } from '../lib/api'
import { useLoad } from '../lib/hooks'

/** Teacher side: messages with one student, with a reply box. Opening it marks their messages as read. */
export function StudentMessages({ studentId, name, hasCode }: { studentId: string; name: string; hasCode: boolean }) {
  const { data, loading, reload } = useLoad(() => api.listStudentMessages(studentId), [studentId])
  const unread = data?.filter((m) => !m.fromTeacher && !m.read).length ?? 0
  useEffect(() => { if (unread) api.markStudentMessagesRead(studentId).catch(() => {}) }, [unread, studentId])
  return (
    <section className={`rounded-2xl border-2 p-5 ${unread ? 'border-coral' : 'border-line'} bg-white`}>
      <h2 className="text-xl font-extrabold">Messages{unread > 0 && <span className="ml-2 rounded-full bg-coral px-2 py-0.5 align-middle text-[13px] text-white">{unread} new</span>}</h2>
      <div className="mt-3">
        {loading && !data ? <Spinner /> : (
          <MessageThread
            messages={(data ?? []).map((m) => ({ id: m.id, mine: m.fromTeacher, who: m.fromTeacher ? 'You' : name, body: m.body, createdAt: m.createdAt }))}
            onSend={async (b) => { await api.replyToStudent(studentId, b); reload() }}
            onDelete={async (id) => { await api.deleteStudentMessage(id); reload() }}
            placeholder={`Reply to ${name}`} sendLabel="Send reply"
            empty={hasCode ? `No messages yet. ${name} can message you from their progress page.` : `Create a progress code below so ${name} can see their page and message you.`}
          />
        )}
      </div>
    </section>
  )
}
