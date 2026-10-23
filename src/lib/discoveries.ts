// The Discovery journey: award points unlock mountain-themed collectibles from the student's current camp.
// Nothing about discoveries is stored: they are worked out from the awards a student has received and from
// the dates they moved class, so a refresh or a repeated request can never give a reward twice, and an
// undone award is undone here too.

export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary'
export type Tier = 'Explorers' | 'Trekkers' | 'Climbers' | 'Mountaineers' | 'Alpinists'

export interface Discovery { id: string; name: string; story: string; tier: Tier; rarity: Rarity }

/** Points needed for each discovery, counted from 0 after the one before. After this list, every discovery costs STEP. */
export const FIRST_COSTS = [5, 15]
export const STEP = 30

export const TIERS: { tier: Tier; camp: string; level: string; color: string }[] = [
  { tier: 'Explorers', camp: "Explorers' Base Camp", level: 'Pre-beginner', color: '#81B29A' },
  { tier: 'Trekkers', camp: "Trekkers' Trail", level: 'A1', color: '#2F7F7A' },
  { tier: 'Climbers', camp: "Climbers' Ridge", level: 'A2 to B1', color: '#5B6C8F' },
  { tier: 'Mountaineers', camp: "Mountaineers' Pass", level: 'B1+ to B2', color: '#7A5C8C' },
  { tier: 'Alpinists', camp: "Alpinists' Summit", level: 'B2+ to C1', color: '#3D405B' },
]

const item = (tier: Tier, rarity: Rarity, id: string, name: string, story: string): Discovery => ({ id, name, story, tier, rarity })

/** Each camp's set, in the order they are found. Once a set is complete it starts again in Silver, then Gold, then Diamond. */
export const CAMP_ITEMS: Record<Tier, Discovery[]> = {
  Explorers: [
    item('Explorers', 'Common', 'trail-map', 'The Trail Map', 'Every great climb starts with a map. Yours shows the first path up the mountain.'),
    item('Explorers', 'Common', 'golden-compass', 'The Golden Compass', 'It always points the way forward, even on cloudy days.'),
    item('Explorers', 'Common', 'lantern', 'The Camp Lantern', 'A warm light for reading new words late at base camp.'),
    item('Explorers', 'Uncommon', 'magnifier', 'The Magnifying Glass', 'For looking closely at every new word you find.'),
    item('Explorers', 'Uncommon', 'explorer-hat', "The Explorer's Hat", 'Worn by brave beginners who ask lots of questions.'),
    item('Explorers', 'Rare', 'binoculars', 'The Binoculars', 'See far ahead to where your English is taking you.'),
    item('Explorers', 'Rare', 'field-journal', 'The Field Journal', 'Full of notes, drawings and new words from your adventures.'),
    item('Explorers', 'Epic', 'spyglass', "The Captain's Spyglass", 'An old spyglass that once belonged to a famous explorer.'),
  ],
  Trekkers: [
    item('Trekkers', 'Common', 'boots', 'The Trail Boots', 'Strong boots for long walks and long sentences.'),
    item('Trekkers', 'Common', 'flask', 'The Water Flask', 'Keep going, take a sip, and keep talking.'),
    item('Trekkers', 'Common', 'walking-stick', 'The Walking Stick', 'Something steady to lean on when the path gets steep.'),
    item('Trekkers', 'Uncommon', 'camp-mug', 'The Camp Mug', 'Hot chocolate after a long day of practice.'),
    item('Trekkers', 'Uncommon', 'backpack', 'The Trekking Pack', 'Packed with everything you have learned so far.'),
    item('Trekkers', 'Rare', 'trail-sign', 'The Trail Sign', 'This way to the next camp! You are on the right path.'),
    item('Trekkers', 'Rare', 'campfire', 'The Campfire', 'Where trekkers share stories at night. Now you can tell yours.'),
    item('Trekkers', 'Epic', 'pine-charm', 'The Pine Cone Charm', 'Found under the tallest tree on the trail. It brings good luck.'),
  ],
  Climbers: [
    item('Climbers', 'Common', 'rope', 'The Climbing Rope', 'Ideas tied together, like words in a good sentence.'),
    item('Climbers', 'Common', 'chalk-bag', 'The Chalk Bag', 'A good grip for the tricky parts of the climb.'),
    item('Climbers', 'Common', 'helmet', 'The Climbing Helmet', 'Safety first, then confidence.'),
    item('Climbers', 'Uncommon', 'climber-kit', "The Climber's Kit", 'Hooks and clips for the steep parts of the climb.'),
    item('Climbers', 'Uncommon', 'headlamp', 'The Headlamp', 'Lights the way when the rock gets dark.'),
    item('Climbers', 'Rare', 'tent', 'The Ridge Tent', 'A safe place to rest high on the mountain.'),
    item('Climbers', 'Rare', 'ice-crystal', 'The Ice Crystal', 'Clear and sharp, like your pronunciation is becoming.'),
    item('Climbers', 'Epic', 'mountain-gem', 'The Mountain Gem', 'A purple stone that shines brighter every time you speak.'),
  ],
  Mountaineers: [
    item('Mountaineers', 'Uncommon', 'ice-axe', 'The Ice Axe', 'For cutting steps into the hardest grammar.'),
    item('Mountaineers', 'Uncommon', 'crampons', 'The Crampons', 'Sharp spikes that keep you steady on the ice.'),
    item('Mountaineers', 'Uncommon', 'goggles', 'The Snow Goggles', 'See clearly through wind, snow and difficult texts.'),
    item('Mountaineers', 'Rare', 'radio', 'The Expedition Radio', 'Base camp calling! Clear speaking keeps the team together.'),
    item('Mountaineers', 'Rare', 'yak-bell', 'The Yak Bell', 'Its ring echoes across the valley, just like your voice.'),
    item('Mountaineers', 'Rare', 'snowflake-medal', 'The Snowflake Medal', 'Given to mountaineers who keep going when it gets cold.'),
    item('Mountaineers', 'Epic', 'eagle-feather', 'The Eagle Feather', 'A gift from the eagles who fly above the clouds.'),
    item('Mountaineers', 'Epic', 'expedition-flag', 'The Expedition Flag', 'Planted at every camp you reach. Look how far you have come!'),
  ],
  Alpinists: [
    item('Alpinists', 'Rare', 'ancient-scroll', 'The Ancient Scroll', 'Old words from old climbers. You can read every one of them.'),
    item('Alpinists', 'Rare', 'mountain-relic', 'The Mountain Relic', 'A stone tablet with stories from climbers long ago.'),
    item('Alpinists', 'Epic', 'golden-key', 'The Golden Key', 'It opens the door to the highest hut on the mountain.'),
    item('Alpinists', 'Epic', 'star-chart', 'The Star Chart', 'Above the clouds, the stars show the last part of the route.'),
    item('Alpinists', 'Epic', 'snow-lotus', 'The Snow Lotus', 'A rare flower that only grows near the summit.'),
    item('Alpinists', 'Legendary', 'sun-medallion', 'The Sun Medallion', 'The first light of morning, caught at the very top.'),
    item('Alpinists', 'Legendary', 'crystal-crown', 'The Crystal Crown', 'For true masters of conversation.'),
    item('Alpinists', 'Legendary', 'summit-trophy', 'The Summit Trophy', 'You reached the top! And there is always another summit.'),
  ],
}

/** Each time a camp's set is completed, the next round is a better edition */
export const EDITIONS = [
  { label: '', ring: '' },
  { label: 'Silver', ring: '#AEB6C2' },
  { label: 'Gold', ring: '#E9B949' },
  { label: 'Diamond', ring: '#7CC8EA' },
]
export const editionOf = (round: number) => EDITIONS[Math.min(round, EDITIONS.length - 1)]

export const RARITY_COLOR: Record<Rarity, string> = {
  Common: '#5F627A', Uncommon: '#2F7F7A', Rare: '#5B6C8F', Epic: '#7A5C8C', Legendary: '#9A6A1F',
}
export const tierOf = (t: Tier) => TIERS.find((x) => x.tier === t)!

/**
 * A class's camp: from its name (your classes are named after the camps), otherwise from its level.
 */
export function campOfClass(name = '', level = ''): Tier {
  const n = name.toLowerCase()
  for (const t of TIERS) if (n.includes(t.tier.toLowerCase().replace(/s$/, ''))) return t.tier
  const l = level.toUpperCase()
  if (l.startsWith('C') || l === 'B2+') return 'Alpinists'
  if (l === 'B2' || l === 'B1+') return 'Mountaineers'
  if (l === 'A2' || l === 'B1') return 'Climbers'
  if (l === 'A1') return 'Trekkers'
  return 'Explorers'
}

/** Points needed for the n-th discovery (0 = first), counted from the one before */
export const costOf = (n: number) => FIRST_COSTS[n] ?? STEP

export interface Found { discovery: Discovery; round: number; edition: string; number: number; date: string }
export interface Journey {
  lifetime: number
  unlocked: Found[]
  current: number
  needed: number
  camp: Tier
  /** What the next discovery will be, in the current camp */
  next: { discovery: Discovery; round: number; edition: string }
}

/** When the student was in which camp. Sorted or not; the latest one before a date counts. */
export interface CampStay { at: string; camp: Tier }

function campAt(stays: CampStay[], at: string, fallback: Tier): Tier {
  let camp = stays.length ? stays[0].camp : fallback
  for (const s of stays) if (s.at <= at) camp = s.camp
  return camp
}

/**
 * Work out the journey from a student's awards and class moves. Awards are added up in the order they were given;
 * each time the running total passes a threshold, the student finds the next item of the camp they were in then.
 */
export function journeyOf(awards: { points: number; at: string }[], stays: CampStay[] = [], currentCamp: Tier = 'Explorers'): Journey {
  const sorted = [...awards].sort((a, b) => a.at.localeCompare(b.at))
  const camps = [...stays].sort((a, b) => a.at.localeCompare(b.at))
  const perCamp: Record<string, number> = {}
  const unlocked: Found[] = []
  let lifetime = 0
  let nextAt = costOf(0)
  const take = (camp: Tier) => {
    const k = perCamp[camp] ?? 0
    perCamp[camp] = k + 1
    const set = CAMP_ITEMS[camp]
    const round = Math.floor(k / set.length)
    return { discovery: set[k % set.length], round, edition: editionOf(round).label }
  }
  for (const a of sorted) {
    lifetime += Math.max(0, a.points)
    while (lifetime >= nextAt) {
      const camp = campAt(camps, a.at, currentCamp)
      unlocked.push({ ...take(camp), number: unlocked.length + 1, date: a.at })
      nextAt += costOf(unlocked.length)
    }
  }
  const needed = costOf(unlocked.length)
  const k = perCamp[currentCamp] ?? 0
  const set = CAMP_ITEMS[currentCamp]
  const round = Math.floor(k / set.length)
  return {
    lifetime, unlocked, current: lifetime - (nextAt - needed), needed, camp: currentCamp,
    next: { discovery: set[k % set.length], round, edition: editionOf(round).label },
  }
}

/** Special achievements, given for milestones rather than points. The list grows over time. */
export interface AchievementType { id: string; name: string; description: string }
export const ACHIEVEMENTS: AchievementType[] = [
  { id: 'unit-complete', name: 'Unit Complete', description: 'Finished a whole course unit.' },
  { id: 'speaking-challenge', name: 'Speaking Challenge', description: 'Completed a speaking challenge.' },
  { id: 'steady-climber', name: 'Steady Climber', description: 'Joined class and took part, week after week.' },
  { id: 'new-level', name: 'New Level', description: 'Moved up to a new level.' },
  { id: 'big-milestone', name: 'Big Milestone', description: 'Reached an important learning goal.' },
]

/** Class moves (class name and level at the time) to camps */
export const staysOf = (moves: { at: string; className: string; classLevel: string }[]): CampStay[] =>
  moves.map((m) => ({ at: m.at, camp: campOfClass(m.className, m.classLevel) }))

/** How many discoveries a points total has unlocked */
export function unlockedCount(points: number) {
  let n = 0, at = costOf(0)
  while (points >= at) { n++; at += costOf(n) }
  return n
}

// ----- The mountain map -----
/** The whole mountain (overview) and one detailed picture per camp, all in public/map */
export const OVERVIEW = { src: 'map/overview.webp', w: 1774, h: 887 }
/** Where each camp's stop is on the overview */
export const OVERVIEW_STOP: Record<Tier, [number, number]> = { Explorers: [625, 748], Trekkers: [905, 538], Climbers: [1040, 383], Mountaineers: [1130, 242], Alpinists: [1240, 100] }
/** Each camp's picture and its trail, from START to the camp at the end (pixels on the picture) */
export const CAMP_MAPS: Record<Tier, { src: string; w: number; h: number; trail: [number, number][] }> = {
  Explorers: { src: 'map/explorers.webp', w: 2172, h: 724, trail: [[150, 495], [240, 560], [360, 555], [440, 500], [520, 470], [590, 433], [655, 418], [720, 392], [800, 382], [880, 370], [960, 355], [1040, 345], [1110, 370], [1200, 420], [1300, 437], [1330, 472], [1440, 515], [1620, 525], [1770, 490], [1850, 412], [1745, 345], [1840, 312], [1930, 268], [1990, 230], [1960, 182], [1900, 150], [1990, 135]] },
  Trekkers: { src: 'map/trekkers.webp', w: 2172, h: 724, trail: [[130, 520], [250, 605], [340, 585], [490, 565], [600, 540], [720, 505], [850, 480], [965, 462], [1060, 480], [1150, 500], [1215, 470], [1240, 425], [1265, 385], [1330, 365], [1420, 358], [1490, 345], [1580, 320], [1700, 272], [1790, 240], [1830, 205], [1900, 185]] },
  Climbers: { src: 'map/climbers.webp', w: 2172, h: 724, trail: [[115, 530], [220, 620], [320, 600], [400, 583], [460, 565], [530, 520], [535, 478], [565, 460], [690, 445], [830, 415], [915, 388], [1000, 368], [1100, 320], [1200, 290], [1290, 250], [1380, 255], [1440, 252], [1530, 262], [1620, 280], [1680, 235], [1720, 205], [1760, 175], [1820, 140], [1880, 110], [1960, 95]] },
  Mountaineers: { src: 'map/mountaineers.webp', w: 2172, h: 724, trail: [[100, 520], [210, 605], [305, 598], [410, 585], [515, 578], [595, 565], [665, 535], [720, 515], [800, 490], [885, 470], [955, 440], [1040, 380], [1150, 385], [1250, 370], [1330, 350], [1390, 320], [1430, 275], [1440, 240], [1500, 205], [1600, 200], [1700, 190], [1760, 175], [1840, 155], [1910, 125], [1960, 95]] },
  Alpinists: { src: 'map/alpinists.webp', w: 2172, h: 724, trail: [[110, 560], [170, 630], [295, 650], [450, 680], [560, 680], [630, 660], [690, 622], [740, 592], [800, 560], [900, 545], [970, 538], [1030, 518], [1070, 485], [1100, 450], [1080, 420], [1120, 390], [1170, 360], [1220, 330], [1260, 290], [1310, 245], [1360, 205], [1400, 165], [1425, 130], [1415, 108]] },
}

/** A point part of the way along a camp's trail (0 = START, 1 = the camp at the end) */
export function trailPoint(camp: Tier, t: number): [number, number] {
  const pts = CAMP_MAPS[camp].trail
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
  let d = Math.max(0, Math.min(1, t)) * lens.reduce((a, b) => a + b, 0)
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const f = lens[i] ? Math.min(1, d / lens[i]) : 0
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]
    }
    d -= lens[i]
  }
  return pts[pts.length - 1]
}

/** How far up their camp a student is: each find moves them up, slowing near the top so there is always room */
export const campProgress = (findsInCamp: number) => 0.06 + 0.88 * (1 - Math.pow(0.82, findsInCamp))

export interface MapPerson { key: string; name: string; avatar?: import('./avatar').AvatarConfig | null; camp: Tier; findsInCamp: number; discoveries: number; me?: boolean }
