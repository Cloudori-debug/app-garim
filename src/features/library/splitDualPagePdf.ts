import { PDFDocument } from 'pdf-lib'
import { pdfjs } from 'react-pdf'

import '@/shared/lib/setupPdfWorker'

export type SplitProgress = {
  phase: 'prepare' | 'split' | 'save'
  sourcePage: number
  sourcePageCount: number
  outputPages: number
  /** 0~1 */
  ratio: number
  message: string
}

export type SplitPreview = {
  file: File
  pageCount: number
  /** 첫 페이지 미리보기 */
  previewUrl: string
  /** 가로(양면)로 보이는 페이지 수 */
  landscapePages: number
  /** 대략 예상 초 (기기·해상도에 따라 달라짐) */
  estimatedSeconds: number
}

const RENDER_SCALE = 1.5
const JPEG_QUALITY = 0.82
/** 페이지당 대략적인 작업 시간(초) — 안내용 */
const SEC_PER_PAGE = 1.2

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    const err = new Error('cancelled')
    err.name = 'AbortError'
    throw err
  }
}

async function canvasToJpegBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('이미지 변환 실패'))),
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
  return new Uint8Array(await blob.arrayBuffer())
}

function sliceCanvas(
  source: HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(sw))
  canvas.height = Math.max(1, Math.floor(sh))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas를 사용할 수 없습니다.')
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** 미리보기 + 예상 시간 (실제 분할 전) */
export async function prepareLandscapeSplitPreview(
  file: File,
  signal?: AbortSignal,
): Promise<SplitPreview> {
  assertNotAborted(signal)
  const data = await file.arrayBuffer()
  assertNotAborted(signal)
  const pdf = await pdfjs.getDocument({ data: data.slice(0) }).promise
  const pageCount = pdf.numPages

  const first = await pdf.getPage(1)
  const baseViewport = first.getViewport({ scale: 1 })
  const firstIsLandscape = baseViewport.width > baseViewport.height
  // 전 페이지 스캔은 느리므로 첫 페이지 기준으로 안내 (실제 분할은 페이지마다 판정)
  const landscapePages = firstIsLandscape ? pageCount : Math.max(0, Math.ceil(pageCount * 0.5))

  const viewport = first.getViewport({ scale: 0.35 })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('미리보기를 만들 수 없습니다.')
  await first.render({ canvasContext: ctx, viewport, canvas }).promise
  assertNotAborted(signal)

  const previewUrl = canvas.toDataURL('image/jpeg', 0.75)
  const estimatedSeconds = Math.max(3, Math.ceil(pageCount * SEC_PER_PAGE))

  return {
    file,
    pageCount,
    previewUrl,
    landscapePages,
    estimatedSeconds,
  }
}

/**
 * 가로(양면) 페이지는 좌/우로 잘라 세로 페이지 2장으로 저장.
 * 세로 페이지는 그대로 1장 유지.
 */
export async function splitDualPagePdf(
  file: File,
  options: {
    signal?: AbortSignal
    onProgress?: (p: SplitProgress) => void
  } = {},
): Promise<{ file: File; pageCount: number }> {
  const { signal, onProgress } = options
  assertNotAborted(signal)

  onProgress?.({
    phase: 'prepare',
    sourcePage: 0,
    sourcePageCount: 0,
    outputPages: 0,
    ratio: 0,
    message: 'PDF 준비 중…',
  })

  const data = await file.arrayBuffer()
  assertNotAborted(signal)
  const src = await pdfjs.getDocument({ data: data.slice(0) }).promise
  const sourcePageCount = src.numPages
  const out = await PDFDocument.create()
  let outputPages = 0

  for (let i = 1; i <= sourcePageCount; i++) {
    assertNotAborted(signal)
    onProgress?.({
      phase: 'split',
      sourcePage: i,
      sourcePageCount,
      outputPages,
      ratio: (i - 1) / sourcePageCount,
      message: `${i}/${sourcePageCount}페이지 분할 중…`,
    })

    const page = await src.getPage(i)
    const viewport = page.getViewport({ scale: RENDER_SCALE })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas를 사용할 수 없습니다.')
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    assertNotAborted(signal)

    const isLandscape = viewport.width > viewport.height
    const halves = isLandscape
      ? [
          sliceCanvas(canvas, 0, 0, canvas.width / 2, canvas.height),
          sliceCanvas(canvas, canvas.width / 2, 0, canvas.width / 2, canvas.height),
        ]
      : [canvas]

    for (const half of halves) {
      assertNotAborted(signal)
      const bytes = await canvasToJpegBytes(half)
      const image = await out.embedJpg(bytes)
      const pdfPage = out.addPage([image.width, image.height])
      pdfPage.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      })
      outputPages += 1
    }

    // 메모리 완화
    canvas.width = 0
    canvas.height = 0
  }

  assertNotAborted(signal)
  onProgress?.({
    phase: 'save',
    sourcePage: sourcePageCount,
    sourcePageCount,
    outputPages,
    ratio: 0.95,
    message: '파일 저장 중…',
  })

  const saved = await out.save({ useObjectStreams: false })
  assertNotAborted(signal)

  const base = file.name.replace(/\.pdf$/i, '')
  const blob = new Blob([saved.buffer.slice(saved.byteOffset, saved.byteOffset + saved.byteLength) as ArrayBuffer], {
    type: 'application/pdf',
  })
  const outFile = new File([blob], `${base}-양면분할.pdf`, {
    type: 'application/pdf',
  })

  onProgress?.({
    phase: 'save',
    sourcePage: sourcePageCount,
    sourcePageCount,
    outputPages,
    ratio: 1,
    message: '완료',
  })

  return { file: outFile, pageCount: outputPages }
}

export function isAbortError(e: unknown): boolean {
  return e instanceof Error && (e.name === 'AbortError' || e.message === 'cancelled')
}
