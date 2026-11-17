/**
 * Little celebration sounds, made in the browser (no sound files to download).
 * The teacher can switch them off; the choice is remembered on this device.
 */
const KEY = 'cm-sounds-off'
let ctx: AudioContext | null = null

export function soundsOn() { try { return localStorage.getItem(KEY) !== '1' } catch { return true } }
export function setSoundsOn(on: boolean) { try { on ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, '1') } catch { /* private window */ } }

function audio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

/** One bell-like note: a sine with a soft sparkle on top, quick attack, gentle fade */
function bell(a: AudioContext, freq: number, start: number, length = 0.5, volume = 0.22) {
  const out = a.createGain()
  out.gain.setValueAtTime(0.0001, start)
  out.gain.exponentialRampToValueAtTime(volume, start + 0.012)
  out.gain.exponentialRampToValueAtTime(0.0001, start + length)
  out.connect(a.destination)
  ;[[1, 'sine', 1], [2, 'sine', 0.25], [3, 'triangle', 0.08]].forEach(([mult, type, level]) => {
    const o = a.createOscillator(); const g = a.createGain()
    o.type = type as OscillatorType; o.frequency.setValueAtTime(freq * (mult as number), start)
    g.gain.value = level as number
    o.connect(g).connect(out); o.start(start); o.stop(start + length + 0.05)
  })
}

const NOTE = { C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.5, E6: 1318.5, G6: 1568 }

/** Award sound: a bright two-note chime for +1, a rising sparkle for bigger awards */
export function playAward(points: number) {
  if (!soundsOn()) return
  const a = audio(); if (!a) return
  const t = a.currentTime + 0.01
  if (points <= 1) { bell(a, NOTE.E5, t, 0.35); bell(a, NOTE.C6, t + 0.09, 0.6) }
  else if (points === 2) { bell(a, NOTE.C5, t, 0.3); bell(a, NOTE.E5, t + 0.08, 0.3); bell(a, NOTE.G5, t + 0.16, 0.35); bell(a, NOTE.C6, t + 0.24, 0.8, 0.25) }
  else { [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6].forEach((f, i) => bell(a, f, t + i * 0.07, i === 5 ? 1 : 0.3, 0.2)) }
}

/** Undoing an award: a soft falling blip */
export function playUndo() {
  if (!soundsOn()) return
  const a = audio(); if (!a) return
  const t = a.currentTime + 0.01
  bell(a, NOTE.G5, t, 0.2, 0.12); bell(a, NOTE.E5, t + 0.08, 0.3, 0.1)
}
