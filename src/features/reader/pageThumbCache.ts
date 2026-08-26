import type { PDFDocumentProxy } from 'pdfjs-dist'

export const THUMB_WIDTH = 72
export const THUMB_BODY_H = Math.round(THUMB_WIDTH * 1.35)

const JPEG_QUALITY = 0.7

const imageUrls = new Map<string, string>()
const inflight = new Map<string, Promise<string>>()

let running = 0
let maxConcurrent = 2
const waiters: Array<() => void> = []

export function setThumbConcurrency(n: number): void {
  maxConcurrent = Math.max(1, Math.min(2, n))
}

function cacheKey(fileUrl: string, page: number): string {
  return `${fileUrl}::${page}`
}

export function peekThumbUrl(fileUrl: string, page: number): string | undefined {
  return imageUrls.get(cacheKey(fileUrl, page))
}

export function revokeThumbs(fileUrl: string): void {
  const prefix = `${fileUrl}::`
  for (const [key, url] of imageUrls) {
    if (!key.startsWith(prefix)) continue
    URL.revokeObjectURL(url)
    imageUrls.delete(key)
  }
  for (const key of [...inflight.keys()]) {
    if (key.startsWith(prefix)) inflight.delete(key)
  }
}

async function acquireSlot(): Promise<void> {
  if (running < maxConcurrent) {
    running += 1
    return
  }
  await new Promise<void>((resolve) => {
    waiters.push(resolve)
  })
  running += 1
}

function releaseSlot(): void {
  running = Math.max(0, running - 1)
  const next = waiters.shift()
  if (next) next()
}

export function requestThumb(
  pdf: PDFDocumentProxy,
  fileUrl: string,
  page: number,
): Promise<string> {
  const key = cacheKey(fileUrl, page)
  const hit = imageUrls.get(key)
  if (hit) return Promise.resolve(hit)
  const pending = inflight.get(key)
  if (pending) return pending

  const work = (async () => {
    await acquireSlot()
    try {
      const cached = imageUrls.get(key)
      if (cached) return cached
      const url = await renderThumbJpeg(pdf, page)
      imageUrls.set(key, url)
      return url
    } finally {
      inflight.delete(key)
      releaseSlot()
    }
  })()

  inflight.set(key, work)
  return work
}

async function renderThumbJpeg(pdf: PDFDocumentProxy, pageNumber: number): Promise<string> {
  const page = await pdf.getPage(pageNumber)
  try {
    const base = page.getViewport({ scale: 1 })
    const scale = THUMB_WIDTH / Math.max(1, base.width)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(viewport.width))
    canvas.height = Math.max(1, Math.floor(viewport.height))
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('미리보기 캔버스를 만들 수 없습니다.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({
      canvas,
      canvasContext: ctx,
      viewport,
    }).promise
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('미리보기 인코딩 실패'))),
        'image/jpeg',
        JPEG_QUALITY,
      )
    })
    canvas.width = 0
    canvas.height = 0
    return URL.createObjectURL(blob)
  } finally {
    try {
      page.cleanup()
    } catch {
      /* ignore */
    }
  }
}
