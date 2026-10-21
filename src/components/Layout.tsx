import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { trackPage } from '../lib/analytics'
import { api } from '../lib/api'
import { DEMO_ADMIN, DEMO_TEACHER, resetDemo } from '../lib/api/demo'
import { useAuth } from '../lib/auth'
import { config, isDemo } from '../lib/config'
import { Logo } from './Logo'
import { useUnread } from '../lib/useUnread'

const publicNav = [
  { to: '/lessons', label: 'Lessons' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]
// Signed-in teachers get their tools in the main menu
const memberNav = [
  { to: '/lessons', label: 'Lessons' },
  { to: '/library', label: 'My library' },
  { to: '/classes', label: 'Classes' },
  { to: '/students', label: 'Students' },
  { to: '/bookings', label: 'Bookings' },
]

function DemoBanner() {
  const { session, refresh } = useAuth()
  const navigate = useNavigate()
  if (!isDemo) return null
  const tryAs = async (email: string, password: string, to: string) => {
    await api.signIn(email, password)
    await refresh()
    navigate(to)
  }
  return (
    <div className="bg-sun-light border-b-2 border-sun text-[14px]">
      <div className="wrap flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
        <p><strong>Preview with sample data.</strong> Everything you do stays in this browser.</p>
        <div className="flex flex-wrap items-center gap-2">
          {!session && (
            <>
              <button className="rounded-full bg-ink px-3 py-1 font-bold text-white" onClick={() => tryAs(DEMO_ADMIN.email, DEMO_ADMIN.password, '/classes')}>Try it as Larbi (admin)</button>
              <button className="rounded-full border-2 border-ink px-3 py-0.5 font-bold" onClick={() => tryAs(DEMO_TEACHER.email, DEMO_TEACHER.password, '/classes')}>Try it as a teacher</button>
            </>
          )}
          <button className="font-bold underline underline-offset-2" onClick={() => { resetDemo(); window.location.reload() }}>Reset sample data</button>
        </div>
      </div>
    </div>
  )
}

function Dot({ n }: { n: number }) {
  return <span className="ml-1.5 rounded-full bg-coral px-1.5 text-[12px] text-white" aria-label={`${n} unread messages`}>{n}</span>
}

function Header() {
  const { session, isAdmin } = useAuth()
  const unread = useUnread()
  const [menu, setMenu] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  useEffect(() => setMenu(false), [pathname])

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3.5 py-2 font-bold text-[15px] ${isActive ? 'bg-board text-ink' : 'text-inksoft hover:text-ink'}`

  const nav = session ? [...memberNav, ...(isAdmin ? [] : [{ to: '/messages', label: 'Messages' }])] : publicNav
  const signOut = async () => { await api.signOut(); navigate('/') }

  return (
    <header className="border-b-2 border-line bg-white">
      <div className="wrap flex h-[68px] items-center justify-between gap-4">
        <Link to="/" aria-label="ConvoMastery home"><Logo /></Link>
        <nav className="hidden lg:flex items-center gap-0.5" aria-label="Main">
          {nav.map((n) => <NavLink key={n.to} to={n.to} className={linkCls}>{n.label}{n.to === '/messages' && unread > 0 && <Dot n={unread} />}</NavLink>)}
        </nav>
        <div className="hidden lg:flex items-center gap-1">
          {session ? (
            <>
              {isAdmin && <NavLink to="/admin" className={linkCls}>Admin{unread > 0 && <Dot n={unread} />}</NavLink>}
              <NavLink to="/account" className={linkCls}>Account</NavLink>
              <button onClick={signOut} className="btn-ghost !py-2">Sign out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkCls}>Sign in</NavLink>
              <Link to="/signup" className="btn-primary">Create free account</Link>
            </>
          )}
        </div>
        <button className="lg:hidden btn-ghost !px-3.5 !py-2" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="mobile-menu">
          {menu ? 'Close' : 'Menu'}
        </button>
      </div>
      {menu && (
        <nav id="mobile-menu" className="lg:hidden border-t-2 border-line wrap py-3 grid gap-1" aria-label="Mobile">
          {nav.map((n) => <NavLink key={n.to} to={n.to} className={linkCls}>{n.label}</NavLink>)}
          {session ? (
            <>
              {isAdmin && <NavLink to="/admin" className={linkCls}>Admin{unread > 0 && <Dot n={unread} />}</NavLink>}
              <NavLink to="/account" className={linkCls}>Account</NavLink>
              <button onClick={signOut} className="btn-ghost mt-2">Sign out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkCls}>Sign in</NavLink>
              <Link to="/signup" className="btn-primary mt-2">Create free account</Link>
            </>
          )}
        </nav>
      )}
    </header>
  )
}

function Footer() {
  const socials = [
    { label: 'Instagram', url: config.social.instagram },
    { label: 'Facebook', url: config.social.facebook },
    { label: 'YouTube', url: config.social.youtube },
  ].filter((s) => s.url)
  return (
    <footer className="mt-24 bg-ink text-white">
      <div className="wrap grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo className="!text-white [&_path]:stroke-white" />
          <p className="mt-3 max-w-sm text-white/75">Ready-to-teach speaking lessons for ESL teachers, tutors and parents. Less preparing, more talking.</p>
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Explore</h2>
          <ul className="mt-3 grid gap-2 text-white/80">
            <li><Link to="/lessons" className="hover:text-white">All lessons</Link></li>
            <li><Link to="/lessons?age=Teens" className="hover:text-white">Speaking activities for teens</Link></li>
            <li><Link to="/lessons?activity=Debate" className="hover:text-white">ESL debate topics</Link></li>
            <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Get in touch</h2>
          <ul className="mt-3 grid gap-2 text-white/80">
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link to="/about" className="hover:text-white">About</Link></li>
            {socials.map((s) => <li key={s.label}><a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-white">{s.label}</a></li>)}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15">
        <p className="wrap py-5 text-sm text-white/60">© {new Date().getFullYear()} ConvoMastery. All rights reserved.</p>
      </div>
    </footer>
  )
}

export function Layout() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    trackPage(pathname + search)
  }, [pathname, search])
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 btn-sun">Skip to content</a>
      <DemoBanner />
      <Header />
      <main id="main" className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  )
}
