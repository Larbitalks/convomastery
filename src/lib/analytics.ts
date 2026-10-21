import { config } from './config'

declare global {
  interface Window { dataLayer: unknown[]; gtag?: (...args: unknown[]) => void }
}

export function initAnalytics() {
  if (!config.gaId || window.gtag) return
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${config.gaId}`
  document.head.appendChild(s)
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  window.gtag('config', config.gaId, { send_page_view: false })
}

export function trackPage(path: string) {
  window.gtag?.('event', 'page_view', { page_path: path, page_location: window.location.href })
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  window.gtag?.('event', name, params)
}
