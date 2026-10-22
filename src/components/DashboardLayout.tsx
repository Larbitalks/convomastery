import { NavLink, Outlet } from 'react-router-dom'

export function TabNav({ tabs, label }: { tabs: { to: string; label: string; end?: boolean; badge?: number }[]; label: string }) {
  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b-2 border-line" aria-label={label}>
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end}
          className={({ isActive }) => `-mb-[2px] flex shrink-0 items-center gap-2 border-b-[3px] px-4 py-2.5 font-bold ${isActive ? 'border-brand text-ink' : 'border-transparent text-inksoft hover:text-ink'}`}>
          {t.label}
          {!!t.badge && <span className="rounded-full bg-coral px-2 text-[13px] text-white" aria-label={`${t.badge} unread`}>{t.badge}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

/** Wrapper for signed-in pages. The main menu in the header links to each section. */
export function DashboardLayout() {
  return (
    <div className="wrap py-10">
      <Outlet />
    </div>
  )
}
