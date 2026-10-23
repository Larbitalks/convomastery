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
  if (l.startsWith('C')) return 'Alpinists'
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
