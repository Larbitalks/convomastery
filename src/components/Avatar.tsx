import { useEffect, useMemo, useRef, useState } from 'react'
import { AVATAR_PARTS, DEFAULT_AVATAR, avatarUri, presetAvatar, randomAvatar, type AvatarConfig, type AvatarPart } from '../lib/avatar'

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')

/** A student's avatar in a circle, or their initials when no avatar is set */
export function Avatar({ avatar, name, size = 40, className = '', color = '#3D405B' }: { avatar?: AvatarConfig | null; name: string; size?: number; className?: string; color?: string }) {
  if (!avatar) {
    return (
      <span className={`grid shrink-0 place-items-center rounded-full font-extrabold text-white ${className}`} style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.36 }} aria-hidden="true">
        {initials(name)}
      </span>
    )
  }
  return <img src={avatarUri(avatar)} alt="" width={size} height={size} className={`shrink-0 rounded-full bg-white ${className}`} style={{ width: size, height: size }} />
}

const SECTIONS: { key: AvatarPart; label: string; kind: 'face' | 'color' }[] = [
  { key: 'skin', label: 'Skin', kind: 'color' },
  { key: 'top', label: 'Hair and headwear', kind: 'face' },
  { key: 'hair', label: 'Hair colour', kind: 'color' },
  { key: 'eyes', label: 'Eyes', kind: 'face' },
  { key: 'eyebrows', label: 'Eyebrows', kind: 'face' },
  { key: 'mouth', label: 'Mouth', kind: 'face' },
  { key: 'glasses', label: 'Glasses', kind: 'face' },
  { key: 'facialHair', label: 'Beard', kind: 'face' },
  { key: 'clothing', label: 'Clothes', kind: 'face' },
  { key: 'clothes', label: 'Clothes colour', kind: 'color' },
  { key: 'hat', label: 'Hat or scarf colour', kind: 'color' },
  { key: 'facialHairColor', label: 'Beard colour', kind: 'color' },
  { key: 'background', label: 'Background', kind: 'color' },
]

/** Build an avatar: ready-made faces to start from, then every part to change. */
export function AvatarPicker({ value, name, onSave, onClose }: { value?: AvatarConfig | null; name: string; onSave: (a: AvatarConfig | null) => Promise<void> | void; onClose: () => void }) {
  const [a, setA] = useState<AvatarConfig>(value ?? DEFAULT_AVATAR)
  const [tab, setTab] = useState<AvatarPart>('skin')
  const [busy, setBusy] = useState(false)
  const [presetPage, setPresetPage] = useState(0)
  const first = useRef<HTMLButtonElement>(null)
  const presets = useMemo(() => Array.from({ length: 12 }, (_, i) => presetAvatar(presetPage * 12 + i)), [presetPage])
  const section = SECTIONS.find((s) => s.key === tab)!
  const hasHat = ['hijab', 'turban', 'hat', 'winterHat1', 'winterHat02', 'winterHat03', 'winterHat04'].includes(a.top)

  useEffect(() => {
    first.current?.focus()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = prev }
  }, [onClose])

  const save = async (v: AvatarConfig | null) => { setBusy(true); try { await onSave(v) } finally { setBusy(false) } }
  const set = (k: AvatarPart, v: string) => setA((x) => ({ ...x, [k]: v }))
  // Show colour choices that matter: hat colour only with a hat, beard colour only with a beard
  const tabs = SECTIONS.filter((s) => (s.key !== 'hat' || hasHat) && (s.key !== 'facialHairColor' || a.facialHair !== 'none'))

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-2 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="av-title" onClick={onClose}>
      <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b-2 border-line px-5 py-3">
          <h2 id="av-title" className="text-xl font-extrabold">Avatar for {name}</h2>
          <button className="text-sm font-bold underline" onClick={onClose}>Cancel</button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-y-auto overflow-x-hidden md:grid-cols-[240px_minmax(0,1fr)] md:overflow-y-hidden">
          <div className="flex min-w-0 flex-col items-center gap-3 border-line p-5 md:overflow-y-auto md:border-r-2">
            <img src={avatarUri(a)} alt={`Avatar preview for ${name}`} className="h-32 w-32 shrink-0 rounded-full ring-4 ring-line md:h-48 md:w-48" />
            <button ref={first} className="btn-ghost w-full" onClick={() => setA(randomAvatar())}>Surprise me</button>
            <p className="text-center text-[13px] text-inksoft">Start from a face below, then change any part you like.</p>
            <div className="grid w-full max-w-xs grid-cols-6 gap-1.5 md:grid-cols-4">
              {presets.map((p, i) => (
                <button key={i} className="rounded-full ring-2 ring-transparent hover:ring-ink" onClick={() => setA(p)} aria-label={`Ready-made avatar ${i + 1}`}>
                  <img src={avatarUri(p)} alt="" className="aspect-square w-full rounded-full" loading="lazy" />
                </button>
              ))}
            </div>
            <button className="text-sm font-bold underline" onClick={() => setPresetPage((n) => n + 1)}>Show more faces</button>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b-2 border-line px-3 pt-2" role="tablist" aria-label="Avatar parts">
              {tabs.map((s) => (
                <button key={s.key} role="tab" aria-selected={tab === s.key} onClick={() => setTab(s.key)}
                  className={`-mb-[2px] shrink-0 whitespace-nowrap border-b-[3px] px-3 py-2 text-sm font-bold ${tab === s.key ? 'border-brand text-ink' : 'border-transparent text-inksoft hover:text-ink'}`}>{s.label}</button>
              ))}
            </div>
            <div className="min-h-[16rem] flex-1 overflow-y-auto p-4" role="tabpanel">
              {section.kind === 'color' ? (
                <div className="flex flex-wrap gap-3">
                  {AVATAR_PARTS[tab].map((o) => (
                    <button key={o.value} onClick={() => set(tab, o.value)} aria-pressed={a[tab] === o.value} className="flex flex-col items-center gap-1 text-[12px] font-bold">
                      <span className={`h-12 w-12 rounded-full border-2 border-line ${a[tab] === o.value ? 'ring-4 ring-ink ring-offset-2' : ''}`} style={{ backgroundColor: `#${o.value}` }} />
                      {o.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                  {AVATAR_PARTS[tab].map((o) => (
                    <button key={o.value} onClick={() => set(tab, o.value)} aria-pressed={a[tab] === o.value}
                      className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-1.5 text-[12px] font-bold ${a[tab] === o.value ? 'border-ink bg-board' : 'border-line hover:border-ink/40'}`}>
                      <img src={avatarUri({ ...a, [tab]: o.value })} alt="" className="aspect-square w-full rounded-xl" loading="lazy" />
                      <span className="leading-tight">{o.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-line px-5 py-3">
          {value ? <button className="text-sm font-bold underline" disabled={busy} onClick={() => save(null)}>Remove avatar</button> : <span />}
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={busy} onClick={() => save(a)}>{busy ? 'Saving' : 'Save avatar'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
