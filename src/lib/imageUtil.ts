// Shrinks large images before upload so they upload quickly and load fast for visitors.
export async function shrinkImage(file: File, maxWidth = 1600): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  try {
    const bmp = await createImageBitmap(file)
    if (bmp.width <= maxWidth && file.size < 600_000) return file
    const scale = Math.min(1, maxWidth / bmp.width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.86))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

/** Fails with a clear message if a step takes too long, so the page never stays stuck. */
export function withTimeout<T>(p: Promise<T>, seconds: number, what: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${what} took too long and was stopped. Check your internet connection and try again.`)), seconds * 1000)),
  ])
}

/** Small JPEG as a data URL (for class pictures), kept under about 250 KB */
export async function imageToDataUrl(file: File, maxWidth = 800): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file (JPG or PNG).')
  const bmp = await createImageBitmap(file).catch(() => { throw new Error('This image could not be opened. Try a JPG or PNG.') })
  for (const [w, q] of [[maxWidth, 0.82], [600, 0.75], [420, 0.7]] as const) {
    const scale = Math.min(1, w / bmp.width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const url = canvas.toDataURL('image/jpeg', q)
    if (url.length < 250_000) return url
  }
  throw new Error('This image is too detailed. Try a smaller picture.')
}
