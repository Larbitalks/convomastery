// The Discovery journey: award points unlock mountain-themed collectibles.
// Nothing is stored separately: everything is worked out from the awards a student has received,
// so a refresh or a repeated request can never give a reward twice, and an undone award is undone here too.

export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary'
export type Tier = 'Explorers' | 'Trekkers' | 'Climbers' | 'Mountaineers' | 'Alpinists'

export interface Discovery {
  id: string
  name: string
  story: string
  tier: Tier
  rarity: Rarity
}

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

/** The journey, in order. Add new items at the end: students keep what they already have. */
export const DISCOVERIES: Discovery[] = [
  { id: 'trail-map', name: 'The Trail Map', tier: 'Explorers', rarity: 'Common', story: 'Every great climb starts with a map. Yours shows the first path up the mountain.' },
  { id: 'golden-compass', name: 'The Golden Compass', tier: 'Explorers', rarity: 'Common', story: 'It always points the way forward, even on cloudy days.' },
  { id: 'lantern', name: 'The Camp Lantern', tier: 'Explorers', rarity: 'Common', story: 'A warm light for reading new words late at base camp.' },
  { id: 'explorer-hat', name: "The Explorer's Hat", tier: 'Explorers', rarity: 'Uncommon', story: 'Worn by brave beginners who ask lots of questions.' },
  { id: 'boots', name: 'The Trail Boots', tier: 'Trekkers', rarity: 'Common', story: 'Strong boots for long walks and long sentences.' },
  { id: 'flask', name: 'The Water Flask', tier: 'Trekkers', rarity: 'Common', story: 'Keep going, take a sip, and keep talking.' },
  { id: 'backpack', name: 'The Trekking Pack', tier: 'Trekkers', rarity: 'Uncommon', story: 'Packed with everything you have learned so far.' },
  { id: 'pine-charm', name: 'The Pine Cone Charm', tier: 'Trekkers', rarity: 'Rare', story: 'Found under the tallest tree on the trail. It brings good luck.' },
  { id: 'rope', name: 'The Climbing Rope', tier: 'Climbers', rarity: 'Uncommon', story: 'Ideas tied together, like words in a good sentence.' },
  { id: 'climber-kit', name: "The Climber's Kit", tier: 'Climbers', rarity: 'Uncommon', story: 'Hooks and clips for the steep parts of the climb.' },
  { id: 'ice-crystal', name: 'The Ice Crystal', tier: 'Climbers', rarity: 'Rare', story: 'Clear and sharp, like your pronunciation is becoming.' },
  { id: 'tent', name: 'The Ridge Tent', tier: 'Climbers', rarity: 'Rare', story: 'A safe place to rest high on the mountain.' },
  { id: 'ice-axe', name: 'The Ice Axe', tier: 'Mountaineers', rarity: 'Rare', story: 'For cutting steps into the hardest grammar.' },
  { id: 'goggles', name: 'The Snow Goggles', tier: 'Mountaineers', rarity: 'Rare', story: 'See clearly through wind, snow and difficult texts.' },
  { id: 'expedition-flag', name: 'The Expedition Flag', tier: 'Mountaineers', rarity: 'Epic', story: 'Planted at every camp you reach. Look how far you have come!' },
  { id: 'eagle-feather', name: 'The Eagle Feather', tier: 'Mountaineers', rarity: 'Epic', story: 'A gift from the eagles who fly above the clouds.' },
  { id: 'mountain-relic', name: 'The Ancient Mountain Relic', tier: 'Alpinists', rarity: 'Epic', story: 'An old stone with words from climbers long ago. Now you can read them.' },
  { id: 'star-chart', name: 'The Star Chart', tier: 'Alpinists', rarity: 'Epic', story: 'Above the clouds, the stars show the last part of the route.' },
  { id: 'snow-lotus', name: 'The Snow Lotus', tier: 'Alpinists', rarity: 'Legendary', story: 'A rare flower that only grows near the summit.' },
  { id: 'summit-trophy', name: 'The Summit Trophy', tier: 'Alpinists', rarity: 'Legendary', story: 'You reached the top! A true master of conversation.' },
]

/** After the whole journey: more summit stars, so points always lead somewhere */
export const SUMMIT_STAR: Discovery = { id: 'summit-star', name: 'Summit Star', tier: 'Alpinists', rarity: 'Legendary', story: 'Another climb completed. Collect as many stars as you can!' }

export const RARITY_COLOR: Record<Rarity, string> = {
  Common: '#5F627A', Uncommon: '#2F7F7A', Rare: '#5B6C8F', Epic: '#7A5C8C', Legendary: '#9A6A1F',
}

/** Points needed for the n-th discovery (0 = first), counted from the one before */
export const costOf = (n: number) => FIRST_COSTS[n] ?? STEP

/** The discovery at position n (0 = first). Past the end of the list, summit stars. */
export function discoveryAt(n: number): Discovery & { number: number } {
  return { ...(DISCOVERIES[n] ?? SUMMIT_STAR), number: n + 1 }
}
export const tierOf = (t: Tier) => TIERS.find((x) => x.tier === t)!

export interface Unlocked { discovery: Discovery & { number: number }; date: string }
export interface Journey {
  lifetime: number
  unlocked: Unlocked[]
  /** Points towards the next discovery, and how many it needs */
  current: number
  needed: number
  next: Discovery & { number: number }
}

/**
 * Work out the journey from a student's awards. Awards are added up in the order they were given;
 * each time the running total passes a threshold, that award's date is the unlock date.
 * Several thresholds crossed by one award are all counted.
 */
export function journeyOf(awards: { points: number; at: string }[]): Journey {
  const sorted = [...awards].sort((a, b) => a.at.localeCompare(b.at))
  const unlocked: Unlocked[] = []
  let lifetime = 0
  let nextAt = costOf(0)
  for (const a of sorted) {
    lifetime += Math.max(0, a.points)
    while (lifetime >= nextAt) {
      unlocked.push({ discovery: discoveryAt(unlocked.length), date: a.at })
      nextAt += costOf(unlocked.length)
    }
  }
  const needed = costOf(unlocked.length)
  return { lifetime, unlocked, current: lifetime - (nextAt - needed), needed, next: discoveryAt(unlocked.length) }
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
