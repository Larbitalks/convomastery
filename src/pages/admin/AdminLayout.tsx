import { Outlet } from 'react-router-dom'
import { TabNav } from '../../components/DashboardLayout'
import { useUnread } from '../../lib/useUnread'
import { Seo } from '../../lib/seo'

export default function AdminLayout() {
  const unread = useUnread()
  const tabs = [
    { to: '/admin', label: 'Lessons', end: true },
    { to: '/admin/categories', label: 'Topic areas' },
    { to: '/admin/orders', label: 'Orders' },
    { to: '/admin/bookings', label: 'Bookings' },
    { to: '/admin/messages', label: 'Customer messages', badge: unread },
    { to: '/admin/inquiries', label: 'Contact form' },
  ]
  return (
    <div className="wrap py-10">
      <Seo title="Admin" noindex />
      <h1 className="text-3xl font-extrabold">Admin</h1>
      <div className="mt-5"><TabNav tabs={tabs} label="Admin" /></div>
      <div className="mt-8"><Outlet /></div>
    </div>
  )
}
