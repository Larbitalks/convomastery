import { Notice, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { useLoad } from '../../lib/hooks'

export default function AdminInquiries() {
  const { data, loading, error, reload } = useLoad(() => api.listInquiries())
  if (loading) return <Spinner />
  if (error) return <Notice tone="error">{error}</Notice>
  if (!data?.length) return <p className="text-inksoft">No messages yet. Messages from the contact form appear here and are emailed to you.</p>
  return (
    <ul className="grid max-w-3xl gap-4">
      {data.map((q) => (
        <li key={q.id} className={`panel p-5 ${q.handled ? 'opacity-70' : ''}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-bold">{q.name} <a href={`mailto:${q.email}`} className="font-normal text-teal-dark underline">{q.email}</a></p>
              <p className="text-sm text-inksoft">{formatDate(q.createdAt)}. {q.kind}{q.userType ? `, ${q.userType}` : ''}</p>
            </div>
            <button className="btn-ghost !py-1.5" onClick={async () => { await api.setInquiryHandled(q.id, !q.handled); reload() }}>
              {q.handled ? 'Mark as open' : 'Mark as answered'}
            </button>
          </div>
          <p className="mt-3 whitespace-pre-line">{q.message}</p>
        </li>
      ))}
    </ul>
  )
}
