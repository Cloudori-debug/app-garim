import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { Document as PdfDocument, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'

import type { Mark } from '@/entities/mark/types'
import { MarkOverlay } from '@/features/reader/MarkOverlay'
import type { ReaderMode } from '@/features/reader/types'
import '@/shared/lib/setupPdfWorker'
import { PDFJS_DOC_OPTIONS } from '@/shared/lib/setupPdfWorker'

/** 연속 스크롤에서 실제로 캔버스를 그릴 페이지 반경(현재 ±N) */
const DEFAULT_RENDER_RADIUS = 2
const DEFAULT_PAGE_HEIGHT = 900
const PAGE_GAP = 16

interface PdfViewerProps {
  fileUrl: string
  page: number
  pageCount: number
  /** 렌더할 페이지(1-based). 없으면 1..pageCount 전체 */
  pages?: number[]
  /** pdf.js 렌더 배율(화면 맞춤). 확대 스텝과 무관하게 유지 */
  scale: number
  /** CSS 확대 배수 (1 = 100%). 스텝 변경 시 PDF 재렌더 없이 즉시 반영 */
  zoomFactor?: number
  mode: ReaderMode
  /** true면 페이지를 세로로 이어 스크롤 */
  continuousScroll?: boolean
  /** 연속 스크롤 시 현재 페이지 앞뒤로 그릴 장 수. 대용량은 1 권장 */
  renderRadius?: number
  /** 실제 overflow 스크롤 컨테이너 (Reader 본문 패인) */
  scrollRootRef?: RefObject<HTMLElement | null>
  marks: Mark[]
  selectedMarkId: string | null
  onSelectMark: (id: string | null) => void
  onPageChange?: (page: number) => void
  onPageCount: (n: number) => void
  /** 1페이지 원본(scale=1) 크기 — fit 배율 계산용. 별도 getDocument 없이 사용 */
  onBasePageSize?: (size: { width: number; height: number }) => void
  /** 본문이 연 pdf.js 문서. 책장이 두 번째 Document를 열지 않도록 공유 */
  onPdfJsDocument?: (doc: PDFDocumentProxy | null) => void
  /** 레티나 캔버스 상한. 대용량 스캔본은 1 */
  devicePixelRatio?: number
  onCreateMark: (page: number, rect: { x: number; y: number; w: number; h: number }) => void
  onUpdateGeometry: (id: string, rect: { x: number; y: number; w: number; h: number }) => void
  onDeleteMark: (id: string) => void
  onToggleStudy: (id: string) => void
  onToggleFavorite: (id: string, isFavorite: boolean) => void
}

function PageBlock({
  pageNumber,
  scale,
  zoomFactor,
  mode,
  marks,
  selectedMarkId,
  onSelectMark,
  onCreateMark,
  onUpdateGeometry,
  onDeleteMark,
  onToggleStudy,
  onToggleFavorite,
  onMeasured,
  devicePixelRatio,
}: {
  pageNumber: number
  scale: number
  zoomFactor: number
  mode: ReaderMode
  marks: Mark[]
  selectedMarkId: string | null
  onSelectMark: (id: string | null) => void
  onCreateMark: (page: number, rect: { x: number; y: number; w: number; h: number }) => void
  onUpdateGeometry: (id: string, rect: { x: number; y: number; w: number; h: number }) => void
  onDeleteMark: (id: string) => void
  onToggleStudy: (id: string) => void
  onToggleFavorite: (id: string, isFavorite: boolean) => void
  onMeasured?: (pageNumber: number, width: number, height: number) => void
  devicePixelRatio?: number
}) {
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 })
  const z = zoomFactor > 0 ? zoomFactor : 1
  const sized = pageSize.width > 0 && pageSize.height > 0
  const pageMarks = useMemo(
    () => marks.filter((m) => m.page === pageNumber),
    [marks, pageNumber],
  )

  return (
    <div
      data-page={pageNumber}
      className="relative mx-auto shadow-md"
      style={
        sized
          ? { width: pageSize.width * z, height: pageSize.height * z }
          : undefined
      }
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={
          sized
            ? {
                width: pageSize.width,
                height: pageSize.height,
                transform: z === 1 ? undefined : `scale(${z})`,
              }
            : undefined
        }
      >
        <div className="relative w-fit">
          <Page
            pageNumber={pageNumber}
            scale={scale}
            {...(devicePixelRatio != null ? { devicePixelRatio } : {})}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading={
              <div className="flex h-40 w-64 items-center justify-center bg-[var(--surface)] text-xs text-[var(--muted)]">
                {pageNumber}p…
              </div>
            }
            onRenderSuccess={(pageProxy) => {
              const viewport = pageProxy.getViewport({ scale })
              setPageSize({ width: viewport.width, height: viewport.height })
              onMeasured?.(pageNumber, viewport.width, viewport.height)
            }}
          />
          {sized && (
            <MarkOverlay
              marks={pageMarks}
              page={pageNumber}
              pageWidth={pageSize.width}
              pageHeight={pageSize.height}
              mode={mode}
              selectedMarkId={selectedMarkId}
              onSelectMark={onSelectMark}
              onCreate={(rect) => onCreateMark(pageNumber, rect)}
              onUpdateGeometry={onUpdateGeometry}
              onDelete={onDeleteMark}
              onToggleStudy={onToggleStudy}
              onToggleFavorite={onToggleFavorite}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export function PdfViewer({
  fileUrl,
  page,
  pageCount,
  pages: pagesProp,
  scale,
  zoomFactor = 1,
  mode,
  continuousScroll = false,
  renderRadius = DEFAULT_RENDER_RADIUS,
  scrollRootRef,
  marks,
  selectedMarkId,
  onSelectMark,
  onPageChange,
  onPageCount,
  onBasePageSize,
  onCreateMark,
  onUpdateGeometry,
  onDeleteMark,
  onToggleStudy,
  onToggleFavorite,
  onPdfJsDocument,
  devicePixelRatio,
}: PdfViewerProps) {
  const file = useMemo(() => ({ url: fileUrl }), [fileUrl])
  const [docPages, setDocPages] = useState(pageCount)
  const [estHeight, setEstHeight] = useState(DEFAULT_PAGE_HEIGHT)
  const onPdfJsDocumentRef = useRef(onPdfJsDocument)
  onPdfJsDocumentRef.current = onPdfJsDocument
  const onPageChangeRef = useRef(onPageChange)
  onPageChangeRef.current = onPageChange
  const lastEmittedPage = useRef(page)
  const strideRef = useRef(DEFAULT_PAGE_HEIGHT + PAGE_GAP)
  const radius = Math.max(1, renderRadius)
  const z = zoomFactor > 0 ? zoomFactor : 1
  const displayHeight = estHeight * z
  const stride = displayHeight + PAGE_GAP

  const reportedBase = useRef(false)

  useLayoutEffect(() => {
    reportedBase.current = false
    lastEmittedPage.current = Number.NaN
  }, [fileUrl])

  useEffect(() => {
    return () => {
      onPdfJsDocumentRef.current?.(null)
    }
  }, [fileUrl])

  useEffect(() => {
    void pdfjs.version
  }, [])

  const total = Math.max(docPages, pageCount, 1)
  const pages = useMemo(() => {
    if (pagesProp && pagesProp.length > 0) return pagesProp
    return Array.from({ length: total }, (_, i) => i + 1)
  }, [pagesProp, total])

  const activeIndex = useMemo(() => {
    const idx = pages.indexOf(page)
    return idx >= 0 ? idx : 0
  }, [pages, page])

  /** 도구바·책장에서 페이지가 바뀐 경우에만 스크롤 이동. 손스크롤은 건드리지 않음 */
  useLayoutEffect(() => {
    if (!continuousScroll) return
    const root = scrollRootRef?.current
    if (!root) return
    const idx = Math.max(0, pages.indexOf(page))
    const prevStride = strideRef.current
    strideRef.current = stride

    if (page !== lastEmittedPage.current) {
      lastEmittedPage.current = page
      root.scrollTop = idx * stride
      return
    }
    if (prevStride !== stride && prevStride > 0) {
      root.scrollTop = root.scrollTop * (stride / prevStride)
    }
  }, [page, continuousScroll, pages, stride, scrollRootRef, fileUrl])

  useEffect(() => {
    if (!continuousScroll || !onPageChange) return
    const root = scrollRootRef?.current
    if (!root) return

    const onScroll = () => {
      const step = strideRef.current
      if (step <= 0) return
      const idx = Math.min(
        pages.length - 1,
        Math.max(0, Math.round((root.scrollTop + 8) / step)),
      )
      const next = pages[idx]
      if (next && next !== lastEmittedPage.current) {
        lastEmittedPage.current = next
        onPageChangeRef.current?.(next)
      }
    }

    root.addEventListener('scroll', onScroll, { passive: true })
    return () => root.removeEventListener('scroll', onScroll)
  }, [continuousScroll, onPageChange, pages, scrollRootRef])

  const onMeasured = (_pageNumber: number, _width: number, height: number) => {
    if (height > 0 && (estHeight === DEFAULT_PAGE_HEIGHT || Math.abs(height - estHeight) > 40)) {
      setEstHeight(height)
    }
  }

  const start = Math.max(0, activeIndex - radius)
  const end = Math.min(pages.length, activeIndex + radius + 1)
  const slice = pages.slice(start, end)
  const stackHeight = Math.max(1, pages.length) * stride

  const sharedPageProps = {
    scale,
    zoomFactor: z,
    mode,
    marks,
    selectedMarkId,
    onSelectMark,
    onCreateMark,
    onUpdateGeometry,
    onDeleteMark,
    onToggleStudy,
    onToggleFavorite,
    onMeasured,
    devicePixelRatio,
  }

  return (
    <PdfDocument
      file={file}
      className="block w-full"
      options={PDFJS_DOC_OPTIONS}
      loading={<div className="p-8 text-sm text-neutral-500">PDF 로딩…</div>}
      error={<div className="p-8 text-sm text-red-600">PDF를 열 수 없습니다.</div>}
      onLoadSuccess={(doc) => {
        setDocPages(doc.numPages)
        onPageCount(doc.numPages)
        onPdfJsDocumentRef.current?.(doc)
        if (!reportedBase.current && onBasePageSize) {
          reportedBase.current = true
          void doc.getPage(1).then((p) => {
            const viewport = p.getViewport({ scale: 1 })
            onBasePageSize({ width: viewport.width, height: viewport.height })
            const fitted = viewport.height * scale
            if (fitted > 0) setEstHeight(fitted)
          })
        }
      }}
    >
      {continuousScroll ? (
        <div className="relative mx-auto w-full" style={{ height: stackHeight }}>
          {slice.map((pageNumber) => {
            const index = pages.indexOf(pageNumber)
            return (
              <div
                key={pageNumber}
                className="absolute left-1/2 -translate-x-1/2"
                style={{ top: index * stride }}
              >
                <PageBlock pageNumber={pageNumber} {...sharedPageProps} />
              </div>
            )
          })}
        </div>
      ) : (
        <PageBlock pageNumber={page} {...sharedPageProps} />
      )}
    </PdfDocument>
  )
}
