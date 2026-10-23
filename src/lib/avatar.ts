// Student avatars, drawn in the browser from a few choices (no images to download).
// Artwork: Avataaars by Pablo Stanley (free for personal and commercial use), via DiceBear (MIT).
import { createAvatar } from '@dicebear/core'
import * as avataaars from '@dicebear/avataaars'

export interface AvatarConfig {
  skin: string; top: string; hair: string; hat: string
  eyes: string; eyebrows: string; mouth: string
  glasses: string; facialHair: string; facialHairColor: string
  clothing: string; clothes: string; background: string
}

const opt = (value: string, label: string) => ({ value, label })

/** Every choice in the avatar builder, with friendly names. Hairstyles and hats share one list ("top"). */
export const AVATAR_PARTS = {
  skin: [opt('ffdbb4', 'Very light'), opt('edb98a', 'Light'), opt('f8d25c', 'Golden'), opt('fd9841', 'Tan'), opt('d08b5b', 'Brown'), opt('ae5d29', 'Dark brown'), opt('614335', 'Deep')],
  top: [
    opt('none', 'No hair'), opt('shortFlat', 'Short flat'), opt('shortRound', 'Short round'), opt('shortWaved', 'Short wavy'), opt('shortCurly', 'Short curly'),
    opt('theCaesar', 'Caesar'), opt('theCaesarAndSidePart', 'Side part'), opt('sides', 'Sides'), opt('shavedSides', 'Shaved sides'), opt('frizzle', 'Frizzy'),
    opt('shaggy', 'Shaggy'), opt('shaggyMullet', 'Mullet'), opt('dreads01', 'Short locs'), opt('dreads02', 'Locs'), opt('dreads', 'Long locs'),
    opt('fro', 'Afro'), opt('froBand', 'Afro with band'), opt('curly', 'Curly'), opt('curvy', 'Wavy long'), opt('bob', 'Bob'),
    opt('bun', 'Bun'), opt('frida', 'Flower crown'), opt('straight01', 'Straight long'), opt('straight02', 'Straight'), opt('straightAndStrand', 'Straight with strand'),
    opt('longButNotTooLong', 'Shoulder length'), opt('miaWallace', 'Fringe'), opt('bigHair', 'Big hair'),
    opt('hijab', 'Hijab'), opt('turban', 'Turban'), opt('hat', 'Hat'), opt('winterHat1', 'Winter hat'), opt('winterHat02', 'Bobble hat'), opt('winterHat03', 'Earflap hat'), opt('winterHat04', 'Beanie'),
  ],
  hair: [opt('2c1b18', 'Black'), opt('4a312c', 'Dark brown'), opt('724133', 'Brown'), opt('a55728', 'Auburn'), opt('b58143', 'Light brown'), opt('d6b370', 'Blonde'), opt('ecdcbf', 'Platinum'), opt('c93305', 'Red'), opt('e8e1e1', 'Grey'), opt('f59797', 'Pink')],
  hat: [opt('3d405b', 'Navy'), opt('e07a5f', 'Coral'), opt('81b29a', 'Green'), opt('f2cc8f', 'Sand'), opt('5199e4', 'Blue'), opt('ff488e', 'Pink'), opt('ffffff', 'White'), opt('262e33', 'Black')],
  eyes: [opt('default', 'Normal'), opt('happy', 'Happy'), opt('wink', 'Wink'), opt('squint', 'Squint'), opt('side', 'Side look'), opt('surprised', 'Surprised'), opt('hearts', 'Hearts'), opt('winkWacky', 'Silly wink'), opt('closed', 'Closed'), opt('eyeRoll', 'Eye roll')],
  eyebrows: [opt('defaultNatural', 'Natural'), opt('flatNatural', 'Flat'), opt('raisedExcitedNatural', 'Excited'), opt('upDownNatural', 'Curious'), opt('sadConcernedNatural', 'Worried'), opt('frownNatural', 'Frown'), opt('unibrowNatural', 'Unibrow'), opt('default', 'Thin'), opt('raisedExcited', 'Thin excited')],
  mouth: [opt('smile', 'Smile'), opt('default', 'Normal'), opt('twinkle', 'Grin'), opt('tongue', 'Tongue out'), opt('eating', 'Eating'), opt('serious', 'Serious'), opt('concerned', 'Oh no'), opt('disbelief', 'Wow')],
  glasses: [opt('none', 'None'), opt('prescription01', 'Glasses'), opt('prescription02', 'Thin glasses'), opt('round', 'Round glasses'), opt('kurt', 'Big glasses'), opt('wayfarers', 'Sunglasses'), opt('sunglasses', 'Round sunglasses')],
  facialHair: [opt('none', 'None'), opt('beardLight', 'Light beard'), opt('beardMedium', 'Beard'), opt('beardMajestic', 'Big beard'), opt('moustacheFancy', 'Fancy moustache'), opt('moustacheMagnum', 'Moustache')],
  facialHairColor: [opt('2c1b18', 'Black'), opt('4a312c', 'Dark brown'), opt('724133', 'Brown'), opt('a55728', 'Auburn'), opt('d6b370', 'Blonde'), opt('e8e1e1', 'Grey')],
  clothing: [opt('hoodie', 'Hoodie'), opt('shirtCrewNeck', 'T-shirt'), opt('shirtScoopNeck', 'Scoop neck'), opt('shirtVNeck', 'V-neck'), opt('collarAndSweater', 'Sweater'), opt('overall', 'Overalls'), opt('blazerAndShirt', 'Blazer'), opt('blazerAndSweater', 'Blazer and sweater')],
  clothes: [opt('e07a5f', 'Coral'), opt('3d405b', 'Navy'), opt('81b29a', 'Green'), opt('f2cc8f', 'Sand'), opt('5199e4', 'Blue'), opt('65c9ff', 'Sky'), opt('ff488e', 'Pink'), opt('ffafb9', 'Light pink'), opt('a7ffc4', 'Mint'), opt('ffffb1', 'Lemon'), opt('929598', 'Grey'), opt('262e33', 'Black'), opt('ffffff', 'White')],
  background: [opt('f4f1de', 'Cream'), opt('f2cc8f', 'Sand'), opt('81b29a', 'Green'), opt('e07a5f', 'Coral'), opt('b6e3f4', 'Sky'), opt('c0aede', 'Lilac'), opt('ffd5dc', 'Pink'), opt('d1d4f9', 'Lavender'), opt('3d405b', 'Navy')],
} as const

export type AvatarPart = keyof typeof AVATAR_PARTS

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: 'edb98a', top: 'shortFlat', hair: '2c1b18', hat: '3d405b', eyes: 'default', eyebrows: 'defaultNatural', mouth: 'smile',
  glasses: 'none', facialHair: 'none', facialHairColor: '2c1b18', clothing: 'hoodie', clothes: 'e07a5f', background: 'f4f1de',
}

const pick = <T,>(list: readonly T[], r: () => number) => list[Math.floor(r() * list.length)]
/** A random avatar. Beards and big expressions are rare, so most surprises look like a friendly face. */
export function randomAvatar(rand: () => number = Math.random): AvatarConfig {
  const v = (k: AvatarPart) => pick(AVATAR_PARTS[k], rand).value
  return {
    skin: v('skin'), top: pick(AVATAR_PARTS.top.slice(1, 28), rand).value, hair: v('hair'), hat: v('hat'),
    eyes: rand() < 0.6 ? pick(['default', 'happy', 'wink', 'squint'], rand) : v('eyes'),
    eyebrows: rand() < 0.7 ? pick(['defaultNatural', 'flatNatural', 'raisedExcitedNatural'], rand) : v('eyebrows'),
    mouth: rand() < 0.7 ? pick(['smile', 'default', 'twinkle'], rand) : v('mouth'),
    glasses: rand() < 0.25 ? pick(AVATAR_PARTS.glasses.slice(1), rand).value : 'none',
    facialHair: 'none', facialHairColor: v('hair'), clothing: v('clothing'), clothes: v('clothes'), background: v('background'),
  }
}
/** The same "random" avatars every time for a given number, so the ready-made row stays put */
export function presetAvatar(n: number): AvatarConfig {
  let x = (n + 1) * 9301 + 49297
  return randomAvatar(() => { x = (x * 9301 + 49297) % 233280; return x / 233280 })
}

/** Make sure a saved avatar only uses known choices (older or damaged data falls back to the defaults) */
export function cleanAvatar(a: unknown): AvatarConfig | null {
  if (!a || typeof a !== 'object') return null
  const src = a as Record<string, unknown>
  const out = { ...DEFAULT_AVATAR }
  for (const k of Object.keys(AVATAR_PARTS) as AvatarPart[]) {
    const v = src[k]
    if (typeof v === 'string' && AVATAR_PARTS[k].some((o) => o.value === v)) (out as Record<string, string>)[k] = v
  }
  return out
}

const cache = new Map<string, string>()
/** The avatar as an image address, ready for <img src> */
export function avatarUri(a: AvatarConfig): string {
  const key = JSON.stringify(a)
  const hit = cache.get(key)
  if (hit) return hit
  const uri = createAvatar(avataaars, {
    seed: 'cm',
    skinColor: [a.skin],
    top: a.top === 'none' ? undefined : [a.top as never], topProbability: a.top === 'none' ? 0 : 100,
    hairColor: [a.hair], hatColor: [a.hat],
    eyes: [a.eyes as never], eyebrows: [a.eyebrows as never], mouth: [a.mouth as never],
    accessories: a.glasses === 'none' ? undefined : [a.glasses as never], accessoriesProbability: a.glasses === 'none' ? 0 : 100, accessoriesColor: ['262e33'],
    facialHair: a.facialHair === 'none' ? undefined : [a.facialHair as never], facialHairProbability: a.facialHair === 'none' ? 0 : 100, facialHairColor: [a.facialHairColor],
    clothing: [a.clothing as never], clothesColor: [a.clothes], clothingGraphic: ['bear', 'deer', 'diamond', 'pizza', 'hola'] as never,
    backgroundColor: [a.background],
  }).toDataUri()
  if (cache.size > 800) cache.clear()
  cache.set(key, uri)
  return uri
}
