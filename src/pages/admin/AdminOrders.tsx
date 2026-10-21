import { Notice, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { formatDate, formatPrice } from '../../lib/format'
import { useLoad } from '../../lib/hooks'

export default function AdminOrders() {
  const { data, loading, error } = useLoad(() => api.listOrders())
  if (loading) return <Spinner />
  if (error) return <Notice tone="error">{error}</Notice>
  if (!data?.length) return <p className="text-inksoft">No orders yet.</p>
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[600px] text-left text-[15px]">
        <thead className="border-b-2 border-line bg-board">
          <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Lesson</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Via</th></tr>
        </thead>
        <tbody className="divide-y-2 divide-line">
          {data.map((o) => (
            <tr key={o.id}>
              <td className="px-4 py-3">{formatDate(o.createdAt)}</td>
              <td className="px-4 py-3">{o.userEmail ?? 'Unknown'}</td>
              <td className="px-4 py-3">{o.lessonTitle ?? 'Deleted lesson'}</td>
              <td className="px-4 py-3">{formatPrice(o.amountCents, o.currency)}</td>
              <td className="px-4 py-3 capitalize">{o.provider}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
