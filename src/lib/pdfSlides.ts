// Turns a PDF (for example a PowerPoint saved as PDF) into one image per page, in the browser.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

export async function pdfToSlideImages(file: File, onProgress?: (done: number, total: number) => void): Promise<File[]> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const base = file.name.replace(/\.pdf$/i, '')
  const out: File[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const first = page.getViewport({ scale: 1 })
    const scale = 1600 / first.width // 1600 px wide: sharp on a projector, small enough to load fast
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport }).promise
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not convert a page.'))), 'image/jpeg', 0.86))
    out.push(new File([blob], `${base}-slide-${String(n).padStart(3, '0')}.jpg`, { type: 'image/jpeg' }))
    onProgress?.(n, doc.numPages)
  }
  return out
}
