// Simple line icons for award categories, chosen from the category's name (works for categories you add yourself)
const ICONS: [RegExp, JSX.Element][] = [
  [/home ?work|assignment/i, <><rect x="22" y="14" width="50" height="70" rx="5" /><path d="M32 32 h30 M32 46 h30 M32 60 h18" /><path d="M64 70 L86 48 L92 54 L70 76 L62 78Z" fill="currentColor" fillOpacity=".25" /></>],
  [/follow|question|ask/i, <><path d="M14 20 h72 a6 6 0 0 1 6 6 v36 a6 6 0 0 1 -6 6 H44 L28 84 V68 H14 a6 6 0 0 1 -6 -6 V26 a6 6 0 0 1 6 -6Z" /><path d="M40 36 a10 10 0 1 1 14 9 c-4 2 -4 5 -4 8" /><circle cx="50" cy="60" r="2.5" fill="currentColor" /></>],
  [/vocab|word|spell/i, <><path d="M50 26 C40 18 24 18 12 22 V80 C24 76 40 76 50 84 C60 76 76 76 88 80 V22 C76 18 60 18 50 26Z" /><path d="M50 26 V84" /><path d="M22 38 h18 M22 50 h18 M60 38 h18 M60 50 h18" /></>],
  [/great|answer|idea|smart|think/i, <><path d="M50 12 a24 24 0 0 1 14 43 c-3 3 -4 6 -4 10 H40 c0 -4 -1 -7 -4 -10 A24 24 0 0 1 50 12Z" fill="currentColor" fillOpacity=".2" /><path d="M40 74 h20 M42 84 h16" /><path d="M50 30 v14 M44 38 h12" /></>],
  [/particip|hand|volunteer|active/i, <><path d="M36 88 V50 L28 38 a5 5 0 0 1 8 -6 l6 8 V18 a5 5 0 0 1 10 0 V40 V14 a5 5 0 0 1 10 0 V42 V20 a5 5 0 0 1 10 0 V46 V30 a5 5 0 0 1 10 0 V62 c0 14 -8 26 -22 26Z" fill="currentColor" fillOpacity=".15" /></>],
  [/team|help|kind|share|friend/i, <><circle cx="34" cy="32" r="12" /><circle cx="66" cy="32" r="12" /><path d="M10 84 c0 -18 10 -28 24 -28 s24 10 24 28 M44 84 c2 -16 10 -24 22 -24 c14 0 24 10 24 24" /></>],
  [/pronun|speak|fluen|voice|talk/i, <><path d="M30 38 h16 l20 -16 v56 l-20 -16 H30Z" fill="currentColor" fillOpacity=".2" /><path d="M76 36 a20 20 0 0 1 0 28 M84 26 a34 34 0 0 1 0 48" /></>],
  [/listen/i, <><path d="M30 60 a24 24 0 1 1 42 -16 c0 14 -14 16 -14 30 a10 10 0 0 1 -20 0" /><path d="M42 44 a10 10 0 0 1 20 0" /></>],
  [/read/i, <><path d="M14 22 h28 a10 10 0 0 1 10 10 v52 a8 8 0 0 0 -8 -8 H14Z M86 22 H58 a10 10 0 0 0 -6 2" /><path d="M86 22 v54 H60 a8 8 0 0 0 -8 8" /></>],
  [/writ/i, <><path d="M20 80 L24 64 L66 22 L78 34 L36 76Z" fill="currentColor" fillOpacity=".2" /><path d="M58 30 L70 42 M20 86 h60" /></>],
  [/creat|imagin|art|story/i, <><path d="M50 14 C24 14 12 34 16 54 c4 18 22 16 26 8 c4 -8 14 -6 16 2 c4 14 28 8 28 -14 c0 -20 -16 -36 -36 -36Z" fill="currentColor" fillOpacity=".15" /><circle cx="34" cy="38" r="5" /><circle cx="52" cy="28" r="5" /><circle cx="70" cy="38" r="5" /></>],
  [/effort|try|work hard|persever|brave/i, <><path d="M50 10 l10 22 24 3 -18 16 5 24 -21 -12 -21 12 5 -24 -18 -16 24 -3Z" fill="currentColor" fillOpacity=".2" /><path d="M50 84 v8" /></>],
  [/review|remember|revis/i, <><path d="M80 50 a30 30 0 1 1 -9 -21" /><path d="M72 16 v14 h-14" /><path d="M50 32 v18 l12 8" /></>],
  [/time|punctual|early/i, <><circle cx="50" cy="52" r="32" /><path d="M50 32 v20 l14 10 M40 12 h20" /></>],
]
const DEFAULT = <path d="M50 10 l11 24 26 3 -19 17 5 26 -23 -13 -23 13 5 -26 -19 -17 26 -3Z" fill="currentColor" fillOpacity=".2" />

export function AwardIcon({ name, className = '' }: { name: string; className?: string }) {
  const icon = ICONS.find(([re]) => re.test(name))?.[1] ?? DEFAULT
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">{icon}</g>
    </svg>
  )
}
