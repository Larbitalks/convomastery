// Writes public/sitemap.xml from the live lesson list.
// Run before each build: npm run sitemap && npm run build
// Needs VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and VITE_SITE_URL in the environment (or .env.local).
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}
const site = (process.env.VITE_SITE_URL || '').replace(/\/$/, '')
const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!site) { console.warn('Sitemap skipped: set VITE_SITE_URL to generate it.'); process.exit(process.argv.includes('--optional') ? 0 : 1) }

let lessons = []
if (url && key) {
  const res = await fetch(`${url}/rest/v1/lessons?select=slug,updated_at&published=eq.true`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  lessons = await res.json()
}
const pages = ['/', '/lessons', '/pricing', '/about', '/contact']
const entries = [
  ...pages.map((p) => `<url><loc>${site}${p}</loc></url>`),
  ...lessons.map((l) => `<url><loc>${site}/lessons/${l.slug}</loc><lastmod>${l.updated_at.slice(0, 10)}</lastmod></url>`),
]
writeFileSync('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`)
writeFileSync('public/robots.txt', readFileSync('public/robots.txt', 'utf8').replace(/^Sitemap:.*$/m, `Sitemap: ${site}/sitemap.xml`))
console.log(`sitemap.xml written with ${entries.length} pages`)
