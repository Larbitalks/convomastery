import { useLocation, useNavigate } from 'react-router-dom'

/** Where "Back" goes when there is no earlier page on this site to return to (for example a link opened from an email) */
function parentOf(path: string): string {
  const p = path.replace(/\/+$/, '')
  const rules: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/^\/students\/([^/]+)\/class\/[^/]+$/, (m) => `/students/${m[1]}`],
    [/^\/students\/[^/]+$/, () => '/students'],
    [/^\/classes\/[^/]+$/, () => '/classes'],
    [/^\/lessons\/[^/]+$/, () => '/lessons'],
    [/^\/progress\/[^/]+$/, () => '/progress'],
    [/^\/admin\/.+$/, () => '/admin'],
    [/^\/checkout\/success$/, () => '/library'],
  ]
  for (const [re, to] of rules) { const m = p.match(re); if (m) return to(m) }
  return '/'
}

/** "← Back" on every page except the home page: returns to the previous page, or up one level if there is none */
export function BackButton() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  if (pathname === '/' || pathname === '') return null
  const hasHistory = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0
  return (
    <div className="wrap pt-5">
      <button type="button" onClick={() => (hasHistory ? navigate(-1) : navigate(parentOf(pathname)))}
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-line bg-white py-1.5 pl-2.5 pr-4 text-[15px] font-bold text-ink transition hover:border-ink/40 hover:bg-board">
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true"><path d="M12.5 4.5 L7 10 L12.5 15.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back
      </button>
    </div>
  )
}
