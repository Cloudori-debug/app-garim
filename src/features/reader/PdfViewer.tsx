import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Document as PdfDocument, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'

import type { Mark } from '@/entities/mark/types'
import { MarkOverlay } from '@/features/reader/MarkOverlay'
import type { ReaderMode } from '@/features/reader/types'
import '@/shared/lib/setupPdfWorker'

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
  marks: Mark[]
  selectedMarkId: string | null
  onSelectMark: (id: string | null) => void
  onPageChange?: (page: number) => void
  onPageCount: (n: number) => void
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
  pageRef,
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
  pageRef?: (el: HTMLDivElement | null) => void
}) {
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 })
  const z = zoomFactor > 0 ? zoomFactor : 1
  const sized = pageSize.width > 0 && pageSize.height > 0

  return (
    <div
      ref={pageRef}
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
            }}
          />
          {sized && (
            <MarkOverlay
              marks={marks}
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
  marks,
  selectedMarkId,
  onSelectMark,
  onPageChange,
  onPageCount,
  onCreateMark,
  onUpdateGeometry,
  onDeleteMark,
  onToggleStudy,
  onToggleFavorite,
}: PdfViewerProps) {
  const file = useMemo(() => ({ url: fileUrl }), [fileUrl])
  const pageEls = useRef(new Map<number, HTMLDivElement>())
  const skipObserver = useRef(false)
  const [docPages, setDocPages] = useState(pageCount)

  useEffect(() => {
    void pdfjs.version
  }, [])

  const total = Math.max(docPages, pageCount, 1)
  const pages = useMemo(() => {
    if (pagesProp && pagesProp.length > 0) return pagesProp
    return Array.from({ length: total }, (_, i) => i + 1)
  }, [pagesProp, total])

  useLayoutEffect(() => {
    if (!continuousScroll) return
    const el = pageEls.current.get(page)
    if (!el) return
    skipObserver.current = true
    el.scrollIntoView({ block: 'start', behavior: 'instant' in window ? 'instant' : 'auto' })
    const t = window.setTimeout(() => {
      skipObserver.current = false
    }, 120)
    return () => window.clearTimeout(t)
  }, [page, continuousScroll, pages])

  useEffect(() => {
    if (!continuousScroll || !onPageChange) return
    const nodes = [...pageEls.current.values()]
    if (nodes.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (skipObserver.current) return
        const visible = entries
          .filter((e) => e.isIntersecting)
          .map((e) => ({
            page: Number((e.target as HTMLElement).dataset.page),
            ratio: e.intersectionRatio,
          }))
          .filter((v) => v.page > 0)
        if (visible.length === 0) return
        visible.sort((a, b) => b.ratio - a.ratio)
        const next = visible[0]?.page
        if (next && next !== page) onPageChange(next)
      },
      { root: null, threshold: [0.2, 0.4, 0.6] },
    )

    nodes.forEach((n) => observer.observe(n))
    return () => observer.disconnect()
  }, [continuousScroll, onPageChange, page, pages, fileUrl, zoomFactor])

  const setPageRef = (pageNumber: number) => (el: HTMLDivElement | null) => {
    if (el) pageEls.current.set(pageNumber, el)
    else pageEls.current.delete(pageNumber)
  }

  return (
    <PdfDocument
      file={file}
      loading={<div className="p-8 text-sm text-neutral-500">PDF 로딩…</div>}
      error={<div className="p-8 text-sm text-red-600">PDF를 열 수 없습니다.</div>}
      onLoadSuccess={(doc) => {
        setDocPages(doc.numPages)
        onPageCount(doc.numPages)
      }}
    >
      {continuousScroll ? (
        <div className="flex flex-col items-center gap-4 pb-8">
          {pages.map((pageNumber) => (
            <PageBlock
              key={pageNumber}
              pageNumber={pageNumber}
              scale={scale}
              zoomFactor={zoomFactor}
              mode={mode}
              marks={marks}
              selectedMarkId={selectedMarkId}
              onSelectMark={onSelectMark}
              onCreateMark={onCreateMark}
              onUpdateGeometry={onUpdateGeometry}
              onDeleteMark={onDeleteMark}
              onToggleStudy={onToggleStudy}
              onToggleFavorite={onToggleFavorite}
              pageRef={setPageRef(pageNumber)}
            />
          ))}
        </div>
      ) : (
        <PageBlock
          pageNumber={page}
          scale={scale}
          zoomFactor={zoomFactor}
          mode={mode}
          marks={marks}
          selectedMarkId={selectedMarkId}
          onSelectMark={onSelectMark}
          onCreateMark={onCreateMark}
          onUpdateGeometry={onUpdateGeometry}
          onDeleteMark={onDeleteMark}
          onToggleStudy={onToggleStudy}
          onToggleFavorite={onToggleFavorite}
        />
      )}
    </PdfDocument>
  )
}
