import { CREATURE_ART } from '../lib/creatureArt'
// Original flat illustrations for each discovery, drawn in the site's colours (viewBox 100 x 100).
const INK = '#3D405B', CORAL = '#E07A5F', SAGE = '#81B29A', SAND = '#F2CC8F', CREAM = '#F4F1DE', GOLD = '#E9B949', DGOLD = '#C08A1E', ICE = '#BFE3F0', WHITE = '#FFFFFF', BROWN = '#9A6A3F', GREEN = '#46725D'
const S = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

const ART: Record<string, JSX.Element> = {
  'trail-map': (
    <g {...S}>
      <path d="M18 28 L38 20 L62 28 L82 20 L82 72 L62 80 L38 72 L18 80 Z" fill={CREAM} />
      <path d="M38 20 L38 72 M62 28 L62 80" fill="none" />
      <path d="M26 64 Q36 50 46 56 T66 40 L72 34" fill="none" stroke={CORAL} strokeDasharray="4 5" />
      <path d="M66 30 l10 10 M76 30 l-10 10" stroke={CORAL} />
      <path d="M22 44 l8 -10 l8 10 Z" fill={SAGE} strokeWidth={2} />
    </g>
  ),
  'golden-compass': (
    <g {...S}>
      <circle cx="50" cy="52" r="32" fill={GOLD} />
      <circle cx="50" cy="52" r="24" fill={CREAM} />
      <rect x="44" y="12" width="12" height="9" rx="3" fill={DGOLD} />
      <path d="M50 32 L57 52 L50 72 L43 52 Z" fill={WHITE} />
      <path d="M50 32 L57 52 L43 52 Z" fill={CORAL} />
      <circle cx="50" cy="52" r="3" fill={INK} />
    </g>
  ),
  lantern: (
    <g {...S}>
      <path d="M40 22 Q50 10 60 22" fill="none" />
      <rect x="36" y="22" width="28" height="8" rx="2" fill={INK} />
      <path d="M38 30 L62 30 L60 72 L40 72 Z" fill={SAND} />
      <path d="M50 42 Q58 52 50 62 Q42 52 50 42 Z" fill={CORAL} strokeWidth={2} />
      <rect x="34" y="72" width="32" height="9" rx="2" fill={INK} />
    </g>
  ),
  'explorer-hat': (
    <g {...S}>
      <ellipse cx="50" cy="66" rx="38" ry="12" fill={BROWN} />
      <path d="M30 64 Q30 30 50 30 Q70 30 70 64 Z" fill={SAND} />
      <path d="M31 56 L69 56 L69 63 L31 63 Z" fill={CORAL} />
    </g>
  ),
  boots: (
    <g {...S}>
      <path d="M30 20 L54 20 L56 56 L80 62 Q84 64 84 72 L84 78 L26 78 L26 56 Z" fill={BROWN} />
      <path d="M26 72 L84 72" />
      <path d="M34 30 l14 0 M34 38 l14 0 M34 46 l14 0" stroke={SAND} />
      <path d="M26 78 L84 78 L84 84 L26 84 Z" fill={INK} />
    </g>
  ),
  flask: (
    <g {...S}>
      <rect x="42" y="14" width="16" height="10" rx="2" fill={INK} />
      <path d="M38 24 L62 24 L70 38 L70 82 Q70 86 66 86 L34 86 Q30 86 30 82 L30 38 Z" fill={SAGE} />
      <rect x="34" y="48" width="32" height="20" rx="3" fill={CREAM} />
      <path d="M44 58 Q50 50 56 58" fill="none" stroke={CORAL} />
    </g>
  ),
  backpack: (
    <g {...S}>
      <path d="M34 26 Q50 10 66 26" fill="none" />
      <rect x="26" y="26" width="48" height="58" rx="12" fill={CORAL} />
      <path d="M26 44 Q50 54 74 44" fill="none" />
      <rect x="36" y="58" width="28" height="18" rx="4" fill={SAND} />
      <path d="M50 58 l0 6" />
    </g>
  ),
  'pine-charm': (
    <g {...S}>
      <path d="M50 12 l0 10" />
      <circle cx="50" cy="12" r="4" fill={GOLD} />
      <path d="M50 22 Q72 34 66 62 Q60 86 50 88 Q40 86 34 62 Q28 34 50 22 Z" fill={BROWN} />
      <path d="M38 40 Q50 48 62 40 M35 54 Q50 64 65 54 M38 70 Q50 78 62 70" fill="none" stroke={SAND} />
    </g>
  ),
  rope: (
    <g {...S}>
      <circle cx="50" cy="50" r="30" fill="none" stroke={CORAL} strokeWidth={10} />
      <circle cx="50" cy="50" r="30" fill="none" stroke={INK} strokeWidth={2} strokeDasharray="6 6" />
      <path d="M72 70 Q84 80 80 90" fill="none" stroke={CORAL} strokeWidth={8} />
    </g>
  ),
  'climber-kit': (
    <g {...S}>
      <path d="M36 18 Q22 18 22 34 L22 66 Q22 82 38 82 L44 82 Q58 82 58 66 L58 34 Q58 18 44 18 Z" fill="none" stroke={GOLD} strokeWidth={9} />
      <path d="M36 18 Q22 18 22 34 L22 66 Q22 82 38 82 L44 82 Q58 82 58 66 L58 34 Q58 18 44 18 Z" fill="none" />
      <rect x="62" y="40" width="22" height="34" rx="6" fill={SAGE} />
      <path d="M66 50 l14 0 M66 58 l14 0" />
    </g>
  ),
  'ice-crystal': (
    <g {...S}>
      <path d="M50 10 L70 34 L62 84 L38 84 L30 34 Z" fill={ICE} />
      <path d="M30 34 L70 34 M50 10 L44 34 L50 84 L56 34 Z" fill="none" strokeWidth={2} />
      <path d="M78 18 l0 10 M73 23 l10 0 M22 60 l0 8 M18 64 l8 0" stroke={WHITE} strokeWidth={2.5} />
    </g>
  ),
  tent: (
    <g {...S}>
      <path d="M12 80 L50 22 L88 80 Z" fill={CORAL} />
      <path d="M50 22 L40 80 L60 80 Z" fill={SAND} />
      <path d="M50 22 L50 14" />
      <path d="M8 80 L92 80" />
    </g>
  ),
  'ice-axe': (
    <g {...S}>
      <path d="M50 26 L50 88" stroke={BROWN} strokeWidth={8} />
      <path d="M50 26 L50 88" fill="none" />
      <path d="M22 30 Q36 16 50 18 L78 22 Q64 28 50 30 Q38 30 22 30 Z" fill="#C9CED6" />
      <path d="M46 86 L54 86 L50 94 Z" fill="#C9CED6" />
    </g>
  ),
  goggles: (
    <g {...S}>
      <path d="M10 48 Q10 30 30 30 L70 30 Q90 30 90 48 Q90 66 70 66 Q56 66 50 56 Q44 66 30 66 Q10 66 10 48 Z" fill={INK} />
      <ellipse cx="31" cy="48" rx="14" ry="11" fill={GOLD} />
      <ellipse cx="69" cy="48" rx="14" ry="11" fill={GOLD} />
      <path d="M24 44 l8 -4 M62 44 l8 -4" stroke={WHITE} />
    </g>
  ),
  'expedition-flag': (
    <g {...S}>
      <path d="M8 86 L36 50 L52 66 L66 46 L92 86 Z" fill={WHITE} />
      <path d="M58 46 L58 10" />
      <path d="M58 12 L84 20 L58 28 Z" fill={CORAL} />
    </g>
  ),
  'eagle-feather': (
    <g {...S}>
      <path d="M30 86 Q40 40 76 14 Q80 50 46 76 Z" fill={CREAM} />
      <path d="M30 86 Q50 54 74 18" fill="none" />
      <path d="M44 60 l10 4 M50 50 l12 2 M56 40 l12 0" stroke={BROWN} strokeWidth={2} />
      <path d="M62 24 Q72 16 76 14 Q74 26 66 32 Z" fill={INK} />
    </g>
  ),
  'mountain-relic': (
    <g {...S}>
      <path d="M26 86 L26 30 Q26 14 50 14 Q74 14 74 30 L74 86 Z" fill="#B5AFA3" />
      <path d="M36 34 l28 0 M36 46 l20 0 M36 58 l26 0 M36 70 l14 0" stroke={INK} strokeWidth={2.5} />
      <path d="M58 66 l8 -8 l8 8 Z" fill={SAGE} strokeWidth={2} />
      <circle cx="50" cy="24" r="4" fill={GOLD} strokeWidth={2} />
    </g>
  ),
  'star-chart': (
    <g {...S}>
      <rect x="14" y="18" width="72" height="64" rx="6" fill={INK} />
      <path d="M28 64 L42 40 L60 50 L74 30" fill="none" stroke={SAND} strokeWidth={2} strokeDasharray="3 4" />
      {[[28, 64], [42, 40], [60, 50], [74, 30]].map(([x, y]) => <circle key={`${x}`} cx={x} cy={y} r="4" fill={GOLD} strokeWidth={0} />)}
      <circle cx="78" cy="68" r="2" fill={WHITE} strokeWidth={0} />
      <circle cx="24" cy="30" r="2" fill={WHITE} strokeWidth={0} />
    </g>
  ),
  'snow-lotus': (
    <g {...S}>
      <path d="M50 20 Q62 40 50 70 Q38 40 50 20 Z" fill={WHITE} />
      <path d="M50 70 Q24 60 20 36 Q42 40 50 70 Z" fill={ICE} />
      <path d="M50 70 Q76 60 80 36 Q58 40 50 70 Z" fill={ICE} />
      <path d="M30 78 Q50 70 70 78" fill="none" stroke={GREEN} strokeWidth={5} />
      <circle cx="50" cy="58" r="4" fill={GOLD} strokeWidth={2} />
    </g>
  ),
  'summit-trophy': (
    <g {...S}>
      <path d="M32 16 L68 16 L66 44 Q64 60 50 60 Q36 60 34 44 Z" fill={GOLD} />
      <path d="M32 22 Q16 22 18 34 Q20 44 34 44 M68 22 Q84 22 82 34 Q80 44 66 44" fill="none" />
      <path d="M46 60 L54 60 L56 72 L44 72 Z" fill={DGOLD} />
      <rect x="32" y="72" width="36" height="12" rx="2" fill={INK} />
      <path d="M40 40 l10 -14 l10 14 Z" fill={WHITE} strokeWidth={2} />
    </g>
  ),
  magnifier: (
    <g {...S}>
      <circle cx="42" cy="42" r="24" fill={ICE} />
      <circle cx="42" cy="42" r="24" fill="none" stroke={GOLD} strokeWidth={7} />
      <circle cx="42" cy="42" r="24" fill="none" />
      <path d="M60 60 L84 84" stroke={BROWN} strokeWidth={10} />
      <path d="M60 60 L84 84" fill="none" />
      <path d="M32 34 Q36 28 44 28" fill="none" stroke={WHITE} />
    </g>
  ),
  binoculars: (
    <g {...S}>
      <rect x="16" y="30" width="28" height="46" rx="10" fill={INK} />
      <rect x="56" y="30" width="28" height="46" rx="10" fill={INK} />
      <rect x="40" y="38" width="20" height="16" rx="3" fill={SAND} />
      <circle cx="30" cy="66" r="9" fill={ICE} />
      <circle cx="70" cy="66" r="9" fill={ICE} />
      <rect x="20" y="22" width="20" height="10" rx="3" fill={SAGE} />
      <rect x="60" y="22" width="20" height="10" rx="3" fill={SAGE} />
    </g>
  ),
  'field-journal': (
    <g {...S}>
      <rect x="22" y="14" width="56" height="72" rx="5" fill={SAGE} />
      <path d="M32 14 L32 86" />
      <rect x="40" y="28" width="30" height="18" rx="2" fill={CREAM} />
      <path d="M46 37 l18 0" strokeWidth={2} />
      <path d="M78 52 L86 52 L86 64 L78 64" fill={CORAL} />
    </g>
  ),
  spyglass: (
    <g {...S}>
      <path d="M14 70 L70 26 L80 38 L24 82 Z" fill={BROWN} />
      <path d="M44 48 L54 60 M58 36 L68 48" stroke={GOLD} strokeWidth={5} />
      <path d="M70 26 L80 38 L88 32 L78 20 Z" fill={GOLD} />
      <circle cx="19" cy="76" r="5" fill={ICE} />
    </g>
  ),
  'walking-stick': (
    <g {...S}>
      <path d="M42 90 L60 18" stroke={BROWN} strokeWidth={8} />
      <path d="M42 90 L60 18" fill="none" />
      <path d="M54 30 Q40 26 38 36" fill="none" stroke={GREEN} strokeWidth={4} />
      <ellipse cx="36" cy="38" rx="6" ry="4" fill={SAGE} />
      <path d="M50 52 l10 3 M48 60 l10 3" stroke={CORAL} strokeWidth={3} />
    </g>
  ),
  'camp-mug': (
    <g {...S}>
      <path d="M24 34 L66 34 L62 82 Q62 86 58 86 L32 86 Q28 86 28 82 Z" fill={CORAL} />
      <path d="M66 44 Q84 44 82 58 Q80 70 64 70" fill="none" strokeWidth={4} />
      <path d="M36 24 Q40 18 36 12 M46 24 Q50 18 46 12 M56 24 Q60 18 56 12" fill="none" stroke={SAGE} />
      <path d="M36 56 l20 0" stroke={CREAM} strokeWidth={4} />
    </g>
  ),
  campfire: (
    <g {...S}>
      <path d="M50 18 Q70 40 64 60 Q60 72 50 72 Q40 72 36 60 Q30 40 50 18 Z" fill={CORAL} />
      <path d="M50 40 Q60 54 56 64 Q52 70 50 70 Q46 70 44 64 Q40 54 50 40 Z" fill={GOLD} strokeWidth={2} />
      <path d="M20 84 L80 70 M20 70 L80 84" stroke={BROWN} strokeWidth={8} />
      <path d="M20 84 L80 70 M20 70 L80 84" fill="none" />
    </g>
  ),
  'trail-sign': (
    <g {...S}>
      <path d="M48 20 L48 90" stroke={BROWN} strokeWidth={7} />
      <path d="M48 20 L48 90" fill="none" />
      <path d="M22 28 L70 28 L80 37 L70 46 L22 46 Z" fill={SAND} />
      <path d="M78 54 L30 54 L20 63 L30 72 L78 72 Z" fill={SAGE} />
      <path d="M32 37 l26 0 M38 63 l26 0" strokeWidth={2.5} />
    </g>
  ),
  helmet: (
    <g {...S}>
      <path d="M14 64 Q14 22 50 22 Q86 22 86 64 Z" fill={CORAL} />
      <path d="M10 64 L90 64 L90 72 L10 72 Z" fill={INK} />
      <path d="M36 26 L36 62 M64 26 L64 62" fill="none" strokeWidth={2.5} />
      <rect x="42" y="36" width="16" height="12" rx="3" fill={GOLD} />
    </g>
  ),
  'chalk-bag': (
    <g {...S}>
      <path d="M28 30 L72 30 L68 82 Q66 88 60 88 L40 88 Q34 88 32 82 Z" fill={SAGE} />
      <ellipse cx="50" cy="30" rx="22" ry="7" fill={WHITE} />
      <path d="M30 40 Q50 48 70 40" fill="none" stroke={CREAM} strokeWidth={4} />
      <path d="M50 22 l0 -8" />
      <circle cx="50" cy="12" r="4" fill={GOLD} strokeWidth={2} />
    </g>
  ),
  headlamp: (
    <g {...S}>
      <ellipse cx="50" cy="56" rx="36" ry="22" fill="none" stroke={CORAL} strokeWidth={8} />
      <ellipse cx="50" cy="56" rx="36" ry="22" fill="none" strokeWidth={2} />
      <rect x="34" y="22" width="32" height="24" rx="6" fill={INK} />
      <circle cx="50" cy="34" r="8" fill={GOLD} />
      <path d="M50 10 l0 -6 M30 14 l-4 -4 M70 14 l4 -4" stroke={GOLD} />
    </g>
  ),
  'mountain-gem': (
    <g {...S}>
      <path d="M30 22 L70 22 L86 42 L50 86 L14 42 Z" fill="#B49AD6" />
      <path d="M14 42 L86 42 M30 22 L40 42 L50 86 L60 42 L70 22 M40 42 L50 22 L60 42" fill="none" strokeWidth={2} />
      <path d="M78 14 l0 8 M74 18 l8 0" stroke={WHITE} strokeWidth={2.5} />
    </g>
  ),
  crampons: (
    <g {...S}>
      <rect x="16" y="34" width="68" height="22" rx="8" fill="#C9CED6" />
      <path d="M22 56 l-4 14 M36 56 l-2 14 M50 56 l0 14 M64 56 l2 14 M78 56 l4 14" />
      <path d="M26 34 Q50 16 74 34" fill="none" stroke={CORAL} strokeWidth={5} />
      <path d="M26 34 Q50 16 74 34" fill="none" strokeWidth={2} />
    </g>
  ),
  radio: (
    <g {...S}>
      <path d="M62 10 L62 28" />
      <circle cx="62" cy="10" r="3" fill={CORAL} />
      <rect x="28" y="28" width="44" height="60" rx="8" fill={SAND} />
      <rect x="36" y="36" width="28" height="16" rx="3" fill={SAGE} />
      <circle cx="42" cy="68" r="6" fill={INK} />
      <path d="M54 62 l10 0 M54 70 l10 0 M54 78 l10 0" strokeWidth={2.5} />
    </g>
  ),
  'snowflake-medal': (
    <g {...S}>
      <path d="M38 10 L50 34 L62 10" fill="none" stroke={CORAL} strokeWidth={8} />
      <circle cx="50" cy="60" r="28" fill={ICE} />
      <path d="M50 40 L50 80 M33 50 L67 70 M33 70 L67 50" stroke={WHITE} strokeWidth={4} />
      <path d="M50 40 L50 80 M33 50 L67 70 M33 70 L67 50" fill="none" strokeWidth={1.5} />
    </g>
  ),
  'yak-bell': (
    <g {...S}>
      <path d="M40 22 Q50 10 60 22" fill="none" />
      <path d="M36 24 L64 24 L74 72 L26 72 Z" fill={GOLD} />
      <path d="M22 72 L78 72 L78 78 L22 78 Z" fill={DGOLD} />
      <circle cx="50" cy="84" r="5" fill={INK} />
      <path d="M38 40 Q50 46 62 40" fill="none" stroke={CORAL} strokeWidth={4} />
    </g>
  ),
  'golden-key': (
    <g {...S}>
      <circle cx="32" cy="34" r="18" fill={GOLD} />
      <circle cx="32" cy="34" r="8" fill={CREAM} />
      <path d="M44 46 L82 84" stroke={GOLD} strokeWidth={9} />
      <path d="M44 46 L82 84" fill="none" />
      <path d="M66 68 L74 60 M74 76 L82 68" stroke={DGOLD} strokeWidth={6} />
    </g>
  ),
  'ancient-scroll': (
    <g {...S}>
      <rect x="22" y="22" width="56" height="56" fill={CREAM} />
      <rect x="16" y="14" width="68" height="12" rx="6" fill={BROWN} />
      <rect x="16" y="74" width="68" height="12" rx="6" fill={BROWN} />
      <path d="M32 38 l36 0 M32 48 l28 0 M32 58 l34 0" strokeWidth={2.5} stroke={INK} />
      <circle cx="66" cy="64" r="6" fill={CORAL} strokeWidth={2} />
    </g>
  ),
  'crystal-crown': (
    <g {...S}>
      <path d="M16 74 L20 34 L36 52 L50 24 L64 52 L80 34 L84 74 Z" fill={GOLD} />
      <path d="M16 74 L84 74 L84 84 L16 84 Z" fill={DGOLD} />
      <path d="M44 56 L50 46 L56 56 L50 66 Z" fill={ICE} strokeWidth={2} />
      <circle cx="20" cy="32" r="4" fill={ICE} strokeWidth={2} />
      <circle cx="80" cy="32" r="4" fill={ICE} strokeWidth={2} />
    </g>
  ),
  'sun-medallion': (
    <g {...S}>
      {Array.from({ length: 12 }, (_, i) => <path key={i} d="M50 8 L55 22 L45 22 Z" fill={GOLD} strokeWidth={2} transform={`rotate(${i * 30} 50 50)`} />)}
      <circle cx="50" cy="50" r="26" fill={GOLD} />
      <circle cx="50" cy="50" r="17" fill={CREAM} />
      <path d="M38 56 L46 44 L52 52 L56 46 L64 56 Z" fill={SAGE} strokeWidth={2} />
    </g>
  ),
  'summit-star': (
    <g {...S}>
      <path d="M50 10 L61 37 L90 39 L68 58 L75 87 L50 71 L25 87 L32 58 L10 39 L39 37 Z" fill={GOLD} />
      <path d="M50 28 L56 42 L50 54 L44 42 Z" fill={WHITE} strokeWidth={0} />
    </g>
  ),
}

/** One discovery drawing. Locked ones show as a dark silhouette. */
export function DiscoveryArt({ id, locked = false, className = '' }: { id: string; locked?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" style={locked ? { filter: 'brightness(0)', opacity: 0.22 } : undefined}>
      {CREATURE_ART[id] ? <g dangerouslySetInnerHTML={{ __html: CREATURE_ART[id] }} /> : (ART[id] ?? ART['summit-star'])}
    </svg>
  )
}
