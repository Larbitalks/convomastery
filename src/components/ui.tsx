import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`input ${p.className ?? ''}`} />
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={5} {...p} className={`input ${p.className ?? ''}`} />
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={`input ${p.className ?? ''}`} />

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success'; children: ReactNode }) {
  const styles = {
    info: 'bg-board border-line',
    error: 'bg-[#FDECEC] border-coral/40 text-[#8E1C20]',
    success: 'bg-teal-light border-teal/30 text-teal-dark',
  }[tone]
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border-2 px-4 py-3 text-[15px] ${styles}`}>{children}</div>
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-16 justify-center text-inksoft" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-line border-t-teal" />
      {label}
    </div>
  )
}

export function LevelTag({ level, light }: { level: string; light?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[13px] font-bold ${light ? 'bg-white/20 text-white' : 'bg-ink text-white'}`}>
      {level}
    </span>
  )
}
