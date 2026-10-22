import { Link } from 'react-router-dom'
import { Notice, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { formatPrice } from '../../lib/format'
import { useLoad } from '../../lib/hooks'

export default function AdminLessons() {
  const { data, loading, error } = useLoad(async () => {
    const [lessons, categories, orders] = await Promise.all([api.listLessons({ includeUnpublished: true }), api.listCategories(), api.listOrders()])
    return { lessons, categories, orders }
  })
  if (loading) return <Spinner />
  if (error || !data) return <Notice tone="error">{error}</Notice>
  const sales = (id: string) => data.orders.filter((o) => o.lessonId === id).length
  const revenue = data.orders.reduce((s, o) => s + o.amountCents, 0)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-5"><p className="text-inksoft text-sm">Published lessons</p><p className="font-display text-3xl font-extrabold">{data.lessons.filter((l) => l.published).length}</p></div>
        <div className="panel p-5"><p className="text-inksoft text-sm">Orders</p><p className="font-display text-3xl font-extrabold">{data.orders.length}</p></div>
        <div className="panel p-5"><p className="text-inksoft text-sm">Revenue</p><p className="font-display text-3xl font-extrabold">{formatPrice(revenue) === 'Free' ? '$0.00' : formatPrice(revenue)}</p></div>
      </div>
      <div className="mt-8 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-extrabold">Lessons</h2>
        <Link to="/admin/lessons/new" className="btn-primary">Add a lesson</Link>
      </div>
      <div className="mt-4 overflow-x-auto panel">
        <table className="w-full min-w-[640px] text-left text-[15px]">
          <thead className="border-b-2 border-line bg-board">
            <tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Level</th><th className="px-4 py-3">Topic area</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Sales</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y-2 divide-line">
            {data.lessons.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3 font-bold"><Link to={`/admin/lessons/${l.id}`} className="underline underline-offset-2">{l.title}</Link></td>
                <td className="px-4 py-3">{l.level}, {l.ageGroup}</td>
                <td className="px-4 py-3">{data.categories.find((c) => c.id === l.categoryId)?.name ?? 'None'}</td>
                <td className="px-4 py-3">{formatPrice(l.priceCents, l.currency)}</td>
                <td className="px-4 py-3">{sales(l.id)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-0.5 text-sm font-bold ${l.published ? 'bg-sage-light text-sage-dark' : 'bg-board text-inksoft'}`}>{l.published ? 'Published' : 'Draft'}</span>
                  {!l.filePath && l.published && <span className="ml-2 rounded-md bg-sun-light px-2 py-0.5 text-sm font-bold">No file</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
