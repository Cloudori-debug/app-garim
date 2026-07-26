import { useEffect, useMemo, useRef } from 'react'
import { Document, Page } from 'react-pdf'
import { Bookmark, EyeOff } from 'lucide-react'

import { cn } from '@/shared/lib/cn'
import { PDFJS_DOC_OPTIONS } from '@/shared/lib/setupPdfWorker'
import '@/shared/lib/setupPdfWorker'

const THUMB_WIDTH = 72

interface PageThumbnailRailProps {
  fileUrl: string
  /** 표시할 페이지(1-based). 없으면 1..pageCount */
  pages?: number[]
  pageCount: number
  currentPage: number
  /** 페이지별 가림 개수 (선택) */
  markCounts?: Record<number, number>
  /** 즐겨찾기된 페이지 번호 */
  favoritePages?: ReadonlySet<number> | number[]
  /** 숨긴 페이지 (페이지 가림 모드에서 표시) */
  hiddenPages?: ReadonlySet<number> | number[]
  /** 페이지 가림 모드: 숨김 토글 가능 */
  pageCoverMode?: boolean
  onSelectPage: (page: number) => void
  onToggleHidden?: (page: number) => void
}

export function PageThumbnailRail({
  fileUrl,
  pages: pagesProp,
  pageCount,
  currentPage,
  markCounts,
  favoritePages,
  hiddenPages,
  pageCoverMode = false,
  onSelectPage,
  onToggleHidden,
}: PageThumbnailRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const thumbRefs = useRef(new Map<number, HTMLButtonElement>())
  const file = useMemo(() => ({ url: fileUrl }), [fileUrl])
  const pages = useMemo(() => {
    if (pagesProp && pagesProp.length > 0) return pagesProp
    return Array.from({ length: Math.max(0, pageCount) }, (_, i) => i + 1)
  }, [pagesProp, pageCount])
  const favSet = useMemo(() => {
    if (!favoritePages) return new Set<number>()
    return favoritePages instanceof Set ? favoritePages : new Set(favoritePages)
  }, [favoritePages])
  const hiddenSet = useMemo(() => {
    if (!hiddenPages) return new Set<number>()
    return hiddenPages instanceof Set ? hiddenPages : new Set(hiddenPages)
  }, [hiddenPages])

  useEffect(() => {
    const root = scrollRef.current
    const el = thumbRefs.current.get(currentPage)
    if (!root || !el) return
    const rootRect = root.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const offset = elRect.top - rootRect.top - rootRect.height / 2 + elRect.height / 2
    root.scrollTop += offset
  }, [currentPage, pages])

  if (pages.length <= 0) return null

  return (
    <aside
      className="hidden w-[92px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] sm:flex"
      aria-label="페이지 미리보기"
    >
      <div className="border-b border-[var(--border)] px-2 py-1.5 text-center text-[10px] font-medium text-[var(--muted)]">
        책장
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2">
        <Document file={file} options={PDFJS_DOC_OPTIONS} loading={null} error={null}>
          {pages.map((p) => {
            const marksOnPage = markCounts?.[p] ?? 0
            const favorited = favSet.has(p)
            const hidden = hiddenSet.has(p)
            const active = p === currentPage
            return (
              <div key={p} className="relative">
                <button
                  type="button"
                  ref={(el) => {
                    if (el) thumbRefs.current.set(p, el)
                    else thumbRefs.current.delete(p)
                  }}
                  title={`${p}페이지${hidden ? ' · 숨김' : ''}${favorited ? ' · 즐겨찾기' : ''}${marksOnPage ? ` · 단어가림 ${marksOnPage}` : ''}`}
                  onClick={() => onSelectPage(p)}
                  className={cn(
                    'relative block w-full overflow-hidden rounded-md border bg-[var(--surface)] transition-all',
                    active
                      ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/35'
                      : favorited
                        ? 'border-[var(--accent)]/50 opacity-90 hover:opacity-100'
                        : 'border-[var(--border)] opacity-75 hover:opacity-100',
                    hidden && 'opacity-40',
                  )}
                >
                  <Page
                    pageNumber={p}
                    width={THUMB_WIDTH}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    loading={
                      <div
                        className="flex items-center justify-center bg-[var(--bg)] text-[10px] text-[var(--muted)]"
                        style={{ width: THUMB_WIDTH, height: THUMB_WIDTH * 1.35 }}
                      >
                        …
                      </div>
                    }
                  />
                  <span
                    className={cn(
                      'block py-0.5 text-center text-[10px] font-semibold tabular-nums',
                      active ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg)] text-[var(--muted)]',
                    )}
                  >
                    {p}
                  </span>
                  {favorited && (
                    <span
                      className="absolute top-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow"
                      aria-hidden
                    >
                      <Bookmark className="h-2.5 w-2.5 fill-current" strokeWidth={2} />
                    </span>
                  )}
                  {marksOnPage > 0 && (
                    <span className="absolute top-1 right-1 rounded-full bg-[var(--ink)]/80 px-1 text-[9px] font-bold text-white">
                      {marksOnPage}
                    </span>
                  )}
                  {hidden && (
                    <span className="absolute inset-0 flex items-center justify-center bg-neutral-900/25">
                      <EyeOff className="h-5 w-5 text-white drop-shadow" />
                    </span>
                  )}
                </button>
                {pageCoverMode && onToggleHidden && (
                  <button
                    type="button"
                    className={cn(
                      'mt-1 w-full rounded px-1 py-0.5 text-[9px] font-semibold',
                      hidden
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'bg-[var(--border)] text-[var(--muted)] hover:bg-[var(--border-strong)]',
                    )}
                    onClick={() => onToggleHidden(p)}
                  >
                    {hidden ? '보이기' : '숨기기'}
                  </button>
                )}
              </div>
            )
          })}
        </Document>
      </div>
    </aside>
  )
}
