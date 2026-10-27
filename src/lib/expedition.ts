// Expeditions: each camp has a series of mountains. Award points move a student along the current mountain's trail,
// past four camps to the summit; then the next mountain begins. Like discoveries, everything is worked out from the
// awards and class moves already saved, so nothing can be lost or given twice.
import { chance, type CampStay, type Tier } from './discoveries'

export interface Mountain {
  id: string; camp: Tier; name: string; where: string; height: string
  /** Path on the picture (2172 x 724), from START to the summit */
  trail: [number, number][]
  /** Trail points of Base Camp, Camp 1, Camp 2, High Camp and the Summit */
  stops: number[]
  /** From this trail point the last climb is a rope (drawn dotted) */
  ropeFrom?: number
}
export const MOUNTAIN_SIZE = { w: 2172, h: 724 }
export const mountainSrc = (m: Mountain) => `map/mountains/${m.id}.webp`
export const mountainThumb = (m: Mountain) => `map/mountains/${m.id}-thumb.webp`

/** Each camp's series, climbed in this order. Add new mountains at the end of a list. */
export const MOUNTAINS: Mountain[] = [
  { id: 'bluebell-hill', camp: 'Explorers', name: 'Bluebell Hill', where: 'A sunny hill full of bluebells', height: '', trail: [[165, 560], [420, 680], [760, 640], [920, 575], [1060, 520], [1160, 488], [1300, 445], [1360, 390], [1400, 335], [1530, 320], [1520, 270], [1600, 228], [1720, 210], [1680, 175], [1675, 155], [1800, 128], [1900, 112]], stops: [5, 8, 11, 14, 16] },
  { id: 'whispering-woods', camp: 'Explorers', name: 'Whispering Woods', where: 'A magical forest with waterfalls', height: '', trail: [[165, 530], [330, 660], [620, 640], [860, 600], [1000, 570], [1080, 505], [1110, 470], [1286, 430], [1336, 390], [1440, 345], [1556, 330], [1536, 290], [1550, 248], [1656, 240], [1636, 200], [1740, 155], [1820, 120], [1906, 100]], stops: [6, 9, 12, 15, 17] },
  { id: 'black-forest', camp: 'Trekkers', name: 'The Black Forest', where: 'Germany', height: '1,493 m', trail: [[160, 520], [260, 620], [450, 610], [600, 550], [760, 535], [930, 540], [1060, 520], [1150, 500], [1336, 510], [1406, 480], [1356, 430], [1370, 365], [1506, 320], [1500, 290], [1516, 275], [1636, 270], [1650, 230], [1611, 182], [1686, 150], [1676, 110]], stops: [7, 11, 14, 17, 19] },
  { id: 'catbells', camp: 'Trekkers', name: 'Catbells', where: 'Lake District, England', height: '451 m', trail: [[200, 525], [300, 630], [560, 640], [800, 600], [950, 560], [1060, 520], [1150, 475], [1286, 470], [1326, 420], [1366, 380], [1356, 350], [1390, 328], [1506, 320], [1516, 280], [1526, 260], [1550, 228], [1666, 220], [1636, 180], [1656, 150], [1656, 137], [1736, 110], [1746, 70]], stops: [6, 11, 15, 19, 21] },
  { id: 'fansipan', camp: 'Climbers', name: 'Fansipan', where: 'The roof of Indochina, Vietnam', height: '3,143 m', trail: [[170, 540], [350, 620], [560, 660], [760, 640], [920, 600], [1060, 560], [1180, 500], [1210, 420], [1290, 320], [1370, 300], [1430, 350], [1475, 285], [1465, 245], [1400, 200], [1370, 150], [1430, 128]], stops: [4, 6, 10, 12, 15] },
  { id: 'mount-fuji', camp: 'Climbers', name: 'Mount Fuji', where: 'Japan', height: '3,776 m', trail: [[230, 545], [420, 620], [600, 590], [750, 560], [880, 510], [962, 478], [1080, 470], [1066, 430], [1166, 400], [1116, 370], [1156, 365], [1236, 350], [1206, 320], [1276, 290], [1326, 250], [1336, 228], [1396, 210], [1376, 180], [1406, 153], [1476, 130], [1436, 90], [1456, 55]], stops: [5, 10, 15, 18, 21] },
  { id: 'kilimanjaro', camp: 'Mountaineers', name: 'Kilimanjaro', where: 'The roof of Africa, Tanzania', height: '5,895 m', trail: [[175, 560], [400, 590], [620, 565], [700, 570], [820, 550], [840, 530], [785, 495], [850, 490], [1000, 440], [990, 410], [950, 385], [1050, 370], [1080, 340], [1040, 305], [1090, 270], [1120, 230], [1115, 192], [1100, 150], [1110, 110], [1085, 70]], stops: [6, 10, 13, 16, 19] },
  { id: 'matterhorn', camp: 'Mountaineers', name: 'The Matterhorn', where: 'The Alps, Switzerland and Italy', height: '4,478 m', trail: [[150, 530], [330, 520], [480, 505], [560, 490], [640, 485], [720, 440], [760, 380], [840, 368], [880, 330], [900, 300], [930, 272], [960, 240], [962, 225], [1000, 190], [1060, 120], [1100, 70], [1125, 35]], stops: [4, 7, 10, 12, 16], ropeFrom: 12 },
  { id: 'cho-oyu', camp: 'Alpinists', name: 'Cho Oyu', where: 'Himalayas, Nepal and Tibet', height: '8,188 m', trail: [[150, 560], [300, 610], [500, 600], [650, 570], [770, 548], [880, 540], [950, 510], [900, 480], [830, 470], [870, 445], [965, 418], [1000, 400], [990, 370], [1020, 330], [1040, 318], [1080, 290], [1060, 250], [1070, 220], [1090, 188], [1040, 160], [1020, 130], [1040, 90], [1040, 50]], stops: [4, 10, 14, 18, 22] },
  { id: 'manaslu', camp: 'Alpinists', name: 'Manaslu', where: 'Himalayas, Nepal', height: '8,163 m', trail: [[165, 560], [300, 610], [430, 580], [470, 540], [515, 518], [620, 510], [680, 480], [650, 460], [720, 450], [800, 430], [820, 402], [760, 350], [800, 320], [845, 295], [880, 270], [830, 240], [870, 200], [815, 168], [760, 150], [720, 110], [700, 70], [710, 35]], stops: [4, 10, 13, 17, 21] },
]
export const seriesOf = (camp: Tier) => MOUNTAINS.filter((m) => m.camp === camp)

/** Points to climb one mountain, by camp */
export const SUMMIT_POINTS: Record<Tier, number> = { Explorers: 40, Trekkers: 50, Climbers: 70, Mountaineers: 90, Alpinists: 120 }
export const MILESTONES = ['Base Camp', 'Camp 1', 'Camp 2', 'High Camp', 'Summit'] as const

/** Rare lucky finds on the trail. They only ever help: each gives bonus steps on the current mountain. */
export const LUCKY = [
  { id: 'lucky-charm', name: 'Lucky Charm', steps: 2, weight: 40, story: 'A tiny charm in the grass. Two extra steps!' },
  { id: 'golden-compass', name: 'Golden Compass', steps: 4, weight: 30, story: 'It points to a quicker route. Four extra steps!' },
  { id: 'secret-shortcut', name: 'Secret Shortcut', steps: 6, weight: 20, story: 'A hidden path through the rocks. Six extra steps!' },
  { id: 'weather-window', name: 'Weather Window', steps: 8, weight: 10, story: 'The clouds clear and the climbing is easy. Eight extra steps!' },
] as const
export type Lucky = (typeof LUCKY)[number]
/** On average one lucky find for every 30 or so points */
const LUCKY_EVERY = 10, LUCKY_CHANCE = 0.32

export interface Summit { mountain: Mountain; ascent: number; date: string }
export interface LuckyFind { lucky: Lucky; date: string; mountain: Mountain }
export interface MilestoneReached { mountain: Mountain; ascent: number; stop: number; date: string }
export interface Expedition {
  camp: Tier
  mountain: Mountain
  /** 1 for the first climb of this mountain, 2 for the second ascent and so on */
  ascent: number
  /** Steps on the current mountain, out of SUMMIT_POINTS */
  steps: number
  cost: number
  /** How many milestones on this mountain are reached (0 to 4; 5 would be the summit) */
  reached: number
  summits: Summit[]
  lucky: LuckyFind[]
  milestones: MilestoneReached[]
}

function campAt(stays: CampStay[], at: string, fallback: Tier): Tier {
  let camp = stays.length ? stays[0].camp : fallback
  for (const s of stays) if (s.at <= at) camp = s.camp
  return camp
}

/** Where a student is on the mountains, from their awards and class moves */
export function expeditionOf(awards: { points: number; at: string }[], stays: CampStay[], currentCamp: Tier, seed = ''): Expedition {
  const sorted = [...awards].sort((a, b) => a.at.localeCompare(b.at))
  const camps = [...stays].sort((a, b) => a.at.localeCompare(b.at))
  const steps: Record<string, number> = {}
  const summits: Summit[] = [], lucky: LuckyFind[] = [], milestones: MilestoneReached[] = []
  let lifetime = 0
  const mountainAt = (camp: Tier, s: number) => {
    const series = seriesOf(camp), cost = SUMMIT_POINTS[camp], n = Math.floor(s / cost)
    return { mountain: series[n % series.length], ascent: Math.floor(n / series.length) + 1, inside: s - n * cost, cost, n }
  }
  const add = (camp: Tier, amount: number, at: string) => {
    const before = steps[camp] ?? 0, after = before + amount
    steps[camp] = after
    const cost = SUMMIT_POINTS[camp]
    // Every fifth of a mountain is a milestone; the fifth one is the summit
    for (let k = Math.floor(before / (cost / 5)) + 1; k <= Math.floor(after / (cost / 5)); k++) {
      const where = mountainAt(camp, k * (cost / 5) - 0.001)
      const stop = (k - 1) % 5
      if (stop === 4) summits.push({ mountain: where.mountain, ascent: where.ascent, date: at })
      else milestones.push({ mountain: where.mountain, ascent: where.ascent, stop, date: at })
    }
  }
  for (const a of sorted) {
    const camp = campAt(camps, a.at, currentCamp)
    const pts = Math.max(0, a.points)
    const before = lifetime
    lifetime += pts
    add(camp, pts, a.at)
    // Lucky finds: a chance at every 10 points passed
    for (let k = Math.floor(before / LUCKY_EVERY) + 1; k <= Math.floor(lifetime / LUCKY_EVERY); k++) {
      if (chance(`${seed}|luck|${k}`) >= LUCKY_CHANCE) continue
      let x = chance(`${seed}|luckType|${k}`) * LUCKY.reduce((t, l) => t + l.weight, 0)
      const l = LUCKY.find((l) => (x -= l.weight) < 0) ?? LUCKY[0]
      lucky.push({ lucky: l, date: a.at, mountain: mountainAt(camp, steps[camp] ?? 0).mountain })
      add(camp, l.steps, a.at)
    }
  }
  const now = mountainAt(currentCamp, steps[currentCamp] ?? 0)
  return {
    camp: currentCamp, mountain: now.mountain, ascent: now.ascent, steps: now.inside, cost: now.cost,
    reached: Math.min(4, Math.floor(now.inside / (now.cost / 5))), summits, lucky, milestones,
  }
}

/** A point on a mountain's trail for a number of steps: START, then evenly between the milestone stops */
export function trailSpot(m: Mountain, steps: number, cost: number): [number, number] {
  const f = Math.max(0, Math.min(1, steps / cost)) * 5
  const seg = Math.min(4, Math.floor(f)), t = f - seg
  const from = seg === 0 ? 0 : m.stops[seg - 1], to = m.stops[seg]
  const pts = m.trail.slice(from, to + 1)
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
  let d = t * lens.reduce((a, b) => a + b, 0)
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const k = lens[i] ? Math.min(1, d / lens[i]) : 0
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]
    }
    d -= lens[i]
  }
  return m.trail[to]
}
