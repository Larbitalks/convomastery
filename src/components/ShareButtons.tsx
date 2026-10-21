import { useState } from 'react'
import { trackEvent } from '../lib/analytics'

export function ShareButtons({ title, imageUrl }: { title: string; imageUrl?: string | null }) {
  const [copied, setCopied] = useState(false)
  const url = window.location.href
  const enc = encodeURIComponent
  const links = [
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { label: 'Pinterest', href: `https://pinterest.com/pin/create/button/?url=${enc(url)}&description=${enc(title)}${imageUrl ? `&media=${enc(imageUrl)}` : ''}` },
  ]
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* clipboard blocked */ }
    trackEvent('share', { method: 'copy_link', content: title })
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[15px] font-bold">Share</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="chip border-line hover:border-ink/40"
          onClick={() => trackEvent('share', { method: l.label, content: title })}>{l.label}</a>
      ))}
      <button onClick={copy} className="chip border-line hover:border-ink/40">{copied ? 'Link copied' : 'Copy link'}</button>
    </div>
  )
}
