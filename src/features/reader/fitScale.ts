import { pdfjs } from 'react-pdf'

import type { PageLayout } from '@/entities/document/types'

const PORTRAIT_BASE_SCALE = 1.1
const LANDSCAPE_BOOST = 1.5
const VIEW_PADDING = 32

/** 페이지가 잘리지 않는 최대 배율(contain) 안에서 레이아웃별 기본 배율 */
export function clampFitScale(
  pageWidthAt1: number,
  pageHeightAt1: number,
  containerWidth: number,
  containerHeight: number,
  pageLayout: PageLayout,
): number {
  const availW = Math.max(120, containerWidth - VIEW_PADDING)
  const availH = Math.max(120, containerHeight - VIEW_PADDING)
  const contain = Math.min(availW / pageWidthAt1, availH / pageHeightAt1)
  if (!Number.isFinite(contain) || contain <= 0) {
    return pageLayout === 'landscape' ? PORTRAIT_BASE_SCALE * LANDSCAPE_BOOST : PORTRAIT_BASE_SCALE
  }
  if (pageLayout === 'landscape') {
    return Math.min(PORTRAIT_BASE_SCALE * LANDSCAPE_BOOST, contain)
  }
  return Math.min(PORTRAIT_BASE_SCALE, contain)
}

export async function measurePdfPageSize(
  fileUrl: string,
): Promise<{ width: number; height: number } | null> {
  try {
    const pdf = await pdfjs.getDocument({ url: fileUrl }).promise
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 1 })
    return { width: viewport.width, height: viewport.height }
  } catch {
    return null
  }
}
