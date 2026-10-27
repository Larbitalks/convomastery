/** "Show 4 earlier notes" / "Show less" under a list that only shows its newest item at first */
export function ShowMore({ hidden, open, onToggle, what }: { hidden: number; open: boolean; onToggle: () => void; what: [string, string] }) {
  if (hidden <= 0) return null
  return (
    <button type="button" onClick={onToggle} aria-expanded={open}
      className="mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-line px-3.5 py-1.5 text-sm font-bold hover:border-ink/40">
      {open ? 'Show less' : `Show ${hidden} earlier ${hidden === 1 ? what[0] : what[1]}`}
      <svg viewBox="0 0 20 20" className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true"><path d="M5 8 L10 13 L15 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  )
}
