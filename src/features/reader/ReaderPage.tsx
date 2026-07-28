import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  RectangleHorizontal,
  Star,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

import * as appStateRepo from '@/entities/app-state/repository'
import * as documentRepo from '@/entities/document/repository'
import * as pageFavoriteRepo from '@/entities/pageFavorite/repository'
import type { Document } from '@/entities/document/types'
import type { MarkColor } from '@/entities/mark/types'
import { clampFitScale, measurePdfPageSize } from '@/features/reader/fitScale'
import { PdfViewer } from '@/features/reader/PdfViewer'
import { PageThumbnailRail } from '@/features/reader/PageThumbnailRail'
import type { ReaderMode } from '@/features/reader/types'
import { useMarks } from '@/features/reader/useMarks'
import {
  isMaxZoom,
  isMinZoom,
  snapZoomPercent,
  stepZoomPercent,
  ZOOM_PERCENTS,
} from '@/features/reader/zoomSteps'
import { usePinchZoom } from '@/features/reader/usePinchZoom'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/cn'
import {
  adjacentVisiblePage,
  listVisiblePages,
  nearestVisiblePage,
} from '@/shared/lib/visiblePages'

const COLORS: MarkColor[] = ['yellow', 'red', 'purple']

function clampPage(n: number, pageCount: number) {
  if (!Number.isFinite(n)) return 1
  return Math.min(pageCount, Math.max(1, Math.floor(n)))
}

export function ReaderPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const [searchParams] = useSearchParams()
  const [doc, setDoc] = useState<Document | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const [scale, setScale] = useState(1.1)
  const [zoomPercent, setZoomPercent] = useState(100)
  const [mode, setMode] = useState<ReaderMode>('study')
  const [color, setColor] = useState<MarkColor>('yellow')
  const [selectedMarkId, setSelectedMarkId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pageBookmarked, setPageBookmarked] = useState(false)
  const [favoritePages, setFavoritePages] = useState<number[]>([])
  const [fitReady, setFitReady] = useState(false)
  const viewerPaneRef = useRef<HTMLDivElement>(null)
  // PDF DOM이 마운트된 뒤에만 리스너 부착 (로딩 중 early return 버그 방지)
  usePinchZoom(viewerPaneRef, zoomPercent, setZoomPercent, Boolean(doc && fileUrl))

  const marksApi = useMarks(documentId)
  const pageLayout = doc?.pageLayout ?? 'portrait'
  const hiddenPages = doc?.hiddenPages ?? []
  const pageCoverMode = mode === 'pageCover'
  const filterHidden = mode !== 'pageCover'

  const visiblePages = useMemo(
    () => listVisiblePages(pageCount, hiddenPages),
    [pageCount, hiddenPages],
  )

  /** 스크롤·책장에 보여줄 페이지 */
  const railPages = pageCoverMode
    ? Array.from({ length: Math.max(0, pageCount) }, (_, i) => i + 1)
    : visiblePages

  const markCounts = useMemo(() => {
    const map: Record<number, number> = {}
    for (const m of marksApi.marks) {
      map[m.page] = (map[m.page] ?? 0) + 1
    }
    return map
  }, [marksApi.marks])

  const selectedMark = useMemo(
    () => marksApi.marks.find((m) => m.id === selectedMarkId) ?? null,
    [marksApi.marks, selectedMarkId],
  )

  const pageMarks = useMemo(
    () => marksApi.marks.filter((m) => m.page === page).sort((a, b) => a.y - b.y || a.x - b.x),
    [marksApi.marks, page],
  )

  const pageIsHidden = hiddenPages.includes(page)

  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false

    async function load() {
      if (!documentId) return
      const document = await documentRepo.getDocument(documentId)
      if (!document) {
        setError('문서를 찾을 수 없습니다.')
        return
      }
      const blobRow = await documentRepo.getPdfBlob(document.blobId)
      if (!blobRow) {
        setError('PDF 파일을 찾을 수 없습니다.')
        return
      }
      if (cancelled) return
      const url = URL.createObjectURL(blobRow.blob)
      revoked = url
      setDoc({ ...document, hiddenPages: document.hiddenPages ?? [] })
      setFileUrl(url)
      const initialPage = Number(searchParams.get('page')) || document.lastPage || 1
      const p = Math.max(1, initialPage)
      setPage(p)
      setPageInput(String(p))
      setPageCount(document.pageCount || 1)
      const focusMark = searchParams.get('mark')
      if (focusMark) setSelectedMarkId(focusMark)
      const modeParam = searchParams.get('mode')
      if (modeParam === 'study' || modeParam === 'wordCover' || modeParam === 'pageCover') {
        setMode(modeParam)
      } else if ((document.hiddenPages ?? []).includes(p)) {
        setMode('pageCover')
      } else if (focusMark) {
        setMode('wordCover')
      }
    }

    void load()
    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [documentId, searchParams])

  const refreshFavoritePages = async (docId: string) => {
    const pages = await pageFavoriteRepo.listFavoritePagesForDocument(docId)
    setFavoritePages(pages)
  }

  useEffect(() => {
    setPageInput(String(page))
  }, [page])

  useEffect(() => {
    if (!documentId) return
    void pageFavoriteRepo.isPageFavorite(documentId, page).then(setPageBookmarked)
  }, [documentId, page])

  useEffect(() => {
    if (!documentId) {
      setFavoritePages([])
      return
    }
    void refreshFavoritePages(documentId)
  }, [documentId])

  useEffect(() => {
    if (!documentId || !doc) return
    void documentRepo.updateLastPage(documentId, page)
    void appStateRepo.setLastOpened(documentId, page)
  }, [documentId, doc, page])

  useEffect(() => {
    setFitReady(false)
    setZoomPercent(100)
  }, [documentId, fileUrl, pageLayout])

  useEffect(() => {
    if (!fileUrl || !doc || fitReady) return
    const el = viewerPaneRef.current
    if (!el) return
    let cancelled = false

    void (async () => {
      const size = await measurePdfPageSize(fileUrl)
      if (cancelled || !size) {
        if (!cancelled) {
          setScale(pageLayout === 'landscape' ? 1.65 : 1.1)
          setZoomPercent(100)
          setFitReady(true)
        }
        return
      }
      const next = clampFitScale(
        size.width,
        size.height,
        el.clientWidth,
        el.clientHeight,
        pageLayout,
      )
      if (!cancelled) {
        setScale(Math.round(next * 100) / 100)
        setZoomPercent(100)
        setFitReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [fileUrl, doc, pageLayout, fitReady])

  /** 학습/단어가림: 숨긴 페이지에 있으면 가까운 보이는 페이지로 */
  useEffect(() => {
    if (!filterHidden || pageCount < 1) return
    if (visiblePages.length === 0) return
    if (!visiblePages.includes(page)) {
      const next = nearestVisiblePage(page, visiblePages)
      if (next > 0 && next !== page) {
        setPage(next)
        setPageInput(String(next))
      }
    }
  }, [filterHidden, visiblePages, page, pageCount])

  const goToPage = (raw: number | string) => {
    let next = clampPage(typeof raw === 'string' ? Number(raw) : raw, pageCount)
    if (filterHidden && visiblePages.length > 0 && !visiblePages.includes(next)) {
      next = nearestVisiblePage(next, visiblePages)
    }
    if (next < 1) return
    setPage(next)
    setPageInput(String(next))
  }

  const goAdjacent = (dir: -1 | 1) => {
    if (pageCoverMode) {
      goToPage(page + dir)
      return
    }
    const next = adjacentVisiblePage(page, visiblePages, dir)
    if (next != null) goToPage(next)
  }

  const togglePageHidden = async (targetPage: number) => {
    if (!doc) return
    const nextHidden = !hiddenPages.includes(targetPage)
    const updated = await documentRepo.setPageHidden(doc.id, targetPage, nextHidden)
    if (updated) setDoc({ ...updated, hiddenPages: updated.hiddenPages ?? [] })
  }

  const canPrev = pageCoverMode ? page > 1 : adjacentVisiblePage(page, visiblePages, -1) != null
  const canNext = pageCoverMode
    ? page < pageCount
    : adjacentVisiblePage(page, visiblePages, 1) != null

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-red-600">{error}</p>
        <Button asChild variant="secondary">
          <Link to="/library">서재로</Link>
        </Button>
      </div>
    )
  }

  if (!doc || !fileUrl || !documentId) {
    return <div className="p-8 text-sm text-neutral-500">불러오는 중…</div>
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
        <div className="flex rounded-md bg-[var(--border)]/80 p-0.5">
          <Button
            size="sm"
            variant={mode === 'study' ? 'default' : 'ghost'}
            onClick={() => {
              setMode('study')
              setSelectedMarkId(null)
            }}
          >
            학습
          </Button>
          <Button
            size="sm"
            variant={mode === 'wordCover' ? 'default' : 'ghost'}
            onClick={() => setMode('wordCover')}
          >
            단어 가림
          </Button>
          <Button
            size="sm"
            variant={mode === 'pageCover' ? 'default' : 'ghost'}
            onClick={() => {
              setMode('pageCover')
              setSelectedMarkId(null)
            }}
          >
            페이지 가림
          </Button>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 px-1">
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-[var(--border)]"
            title={doc.isFavorite ? 'PDF 즐겨찾기 해제' : 'PDF 즐겨찾기'}
            onClick={() => {
              void documentRepo.setDocumentFavorite(doc.id, !doc.isFavorite).then(async () => {
                const next = await documentRepo.getDocument(doc.id)
                if (next) setDoc({ ...next, hiddenPages: next.hiddenPages ?? [] })
              })
            }}
          >
            <Star
              className={cn(
                'h-4 w-4',
                doc.isFavorite ? 'fill-amber-400 text-amber-500' : 'text-neutral-400',
              )}
            />
          </button>
          <h1 className="min-w-0 truncate text-center text-sm font-medium text-[var(--ink)]" title={doc.fileName}>
            {doc.fileName}
          </h1>
          <button
            type="button"
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] font-semibold',
              pageLayout === 'landscape'
                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'text-[var(--muted)] hover:bg-[var(--border)]',
            )}
            title={
              pageLayout === 'landscape'
                ? '가로 PDF (화면 맞춤 확대) · 탭하면 세로로'
                : '세로 PDF · 탭하면 가로 스캔용으로'
            }
            onClick={() => {
              const next = pageLayout === 'landscape' ? 'portrait' : 'landscape'
              void documentRepo.setDocumentPageLayout(doc.id, next).then(async () => {
                const updated = await documentRepo.getDocument(doc.id)
                if (updated) setDoc({ ...updated, hiddenPages: updated.hiddenPages ?? [] })
              })
            }}
          >
            <RectangleHorizontal className="h-3.5 w-3.5" />
            {pageLayout === 'landscape' ? '가로' : '세로'}
          </button>
        </div>

        {mode === 'wordCover' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={selectedMark ? `선택 가림 색 · ${c}` : `새 가림 색 · ${c}`}
                  className={cn(
                    'h-6 w-6 rounded-full border-2',
                    c === 'yellow' && 'bg-yellow-300',
                    c === 'red' && 'bg-red-400',
                    c === 'purple' && 'bg-purple-400',
                    (selectedMark ? selectedMark.color === c : color === c)
                      ? 'border-neutral-900'
                      : 'border-transparent',
                  )}
                  onClick={() => {
                    if (selectedMark) {
                      void marksApi.setColor(selectedMark.id, c)
                      setColor(c)
                    } else {
                      setColor(c)
                    }
                  }}
                />
              ))}
            </div>

            {selectedMark && (
              <>
                <span className="hidden h-4 w-px bg-neutral-300 sm:block" aria-hidden />
                <span className="text-xs font-medium text-[var(--muted)]">
                  선택됨 · {selectedMark.page}p
                </span>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    if (confirm('이 가림을 삭제할까요?')) {
                      void marksApi.remove(selectedMark.id)
                      setSelectedMarkId(null)
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  삭제
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedMarkId(null)}>
                  선택 해제
                </Button>
              </>
            )}
          </div>
        )}

        {mode === 'pageCover' && (
          <Button
            size="sm"
            variant={pageIsHidden ? 'secondary' : 'default'}
            onClick={() => void togglePageHidden(page)}
          >
            {pageIsHidden ? (
              <>
                <Eye className="h-4 w-4" />
                이 페이지 보이기
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4" />
                이 페이지 숨기기
              </>
            )}
          </Button>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button size="icon" variant="ghost" disabled={!canPrev} onClick={() => goAdjacent(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 text-xs text-neutral-600">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title={pageBookmarked ? '페이지 즐겨찾기 해제' : '이 페이지 즐겨찾기'}
              onClick={() => {
                void pageFavoriteRepo.togglePageFavorite(doc.id, page).then((on) => {
                  setPageBookmarked(on)
                  void refreshFavoritePages(doc.id)
                })
              }}
            >
              <Bookmark
                className={cn(
                  'h-4 w-4',
                  pageBookmarked && 'fill-[var(--accent)] text-[var(--accent)]',
                )}
              />
            </Button>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={pageCount}
              value={pageInput}
              aria-label="페이지 번호"
              title="페이지 입력 후 Enter"
              className="h-8 w-14 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-1.5 text-center text-xs tabular-nums text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => goToPage(pageInput)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  goToPage(pageInput)
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
            />
            <span className="text-neutral-400">/</span>
            <span className="min-w-6 tabular-nums">{pageCount}</span>
            {hiddenPages.length > 0 && (
              <span className="ml-1 text-[10px] text-[var(--muted)]">
                (숨김 {hiddenPages.length})
              </span>
            )}
          </div>

          <Button size="icon" variant="ghost" disabled={!canNext} onClick={() => goAdjacent(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="축소"
            disabled={isMinZoom(zoomPercent)}
            onClick={() => setZoomPercent((z) => stepZoomPercent(z, -1))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <select
            aria-label="확대 배율"
            title="확대 배율 (핀치로도 조절)"
            className="h-8 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-1.5 text-xs font-semibold tabular-nums text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            value={snapZoomPercent(zoomPercent)}
            onChange={(e) => setZoomPercent(Number(e.target.value))}
          >
            {ZOOM_PERCENTS.map((p) => (
              <option key={p} value={p}>
                {p}%
              </option>
            ))}
          </select>
          <Button
            size="icon"
            variant="ghost"
            title="확대"
            disabled={isMaxZoom(zoomPercent)}
            onClick={() => setZoomPercent((z) => stepZoomPercent(z, 1))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <PageThumbnailRail
          fileUrl={fileUrl}
          pages={railPages}
          pageCount={pageCount}
          currentPage={page}
          markCounts={markCounts}
          favoritePages={favoritePages}
          hiddenPages={hiddenPages}
          pageCoverMode={pageCoverMode}
          onSelectPage={goToPage}
          onToggleHidden={(p) => void togglePageHidden(p)}
        />
        <div
          ref={viewerPaneRef}
          className="min-h-0 flex-1 overflow-auto bg-[var(--pdf-bg)] p-4 touch-pan-x touch-pan-y"
        >
          {filterHidden && visiblePages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <EyeOff className="h-8 w-8 text-[var(--muted)]" />
              <p className="text-sm text-[var(--ink)]">보이는 페이지가 없습니다</p>
              <p className="text-xs text-[var(--muted)]">페이지 가림 모드에서 숨김을 해제하세요.</p>
              <Button size="sm" onClick={() => setMode('pageCover')}>
                페이지 가림으로 이동
              </Button>
            </div>
          ) : (
            <div className="mx-auto w-fit">
              <PdfViewer
                fileUrl={fileUrl}
                page={page}
                pageCount={pageCount}
                pages={railPages}
                scale={scale}
                zoomFactor={zoomPercent / 100}
                mode={mode}
                continuousScroll
                marks={marksApi.marks}
                selectedMarkId={selectedMarkId}
                onSelectMark={setSelectedMarkId}
                onPageChange={setPage}
                onPageCount={(n) => {
                  setPageCount(n)
                  if (doc.pageCount !== n) void documentRepo.updatePageCount(doc.id, n)
                }}
                onCreateMark={(markPage, rect) => {
                  void marksApi.create({ page: markPage, color, ...rect }).then((mark) => {
                    if (mark) setSelectedMarkId(mark.id)
                  })
                }}
                onUpdateGeometry={(id, rect) => void marksApi.updateGeometry(id, rect)}
                onDeleteMark={(id) => {
                  void marksApi.remove(id)
                  setSelectedMarkId(null)
                }}
                onToggleStudy={(id) => void marksApi.toggleHidden(id)}
                onToggleFavorite={(id, fav) => void marksApi.toggleFavorite(id, fav)}
              />
            </div>
          )}
        </div>
      </div>

      {mode === 'wordCover' && !selectedMark && pageMarks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2">
          <span className="text-xs text-[var(--muted)]">
            이 페이지 단어 가림 {pageMarks.length}개 — 탭해서 선택
          </span>
          <div className="flex flex-wrap gap-1">
            {pageMarks.map((m, i) => (
              <button
                key={m.id}
                type="button"
                className="rounded-md border border-[var(--border-strong)] bg-[var(--bg)] px-2 py-1 text-xs font-medium"
                onClick={() => setSelectedMarkId(m.id)}
              >
                #{i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'wordCover' && !selectedMark && pageMarks.length === 0 && (
        <p className="border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)]">
          드래그로 단어(상자) 가림을 만드세요. 선택 후 상단에서 삭제할 수 있습니다.
        </p>
      )}

      {mode === 'pageCover' && (
        <p className="border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)]">
          숨긴 페이지는 학습·단어 가림에서 보이지 않습니다. PDF 파일은 그대로 두고, 책장에서
          숨기기/보이기를 바꿀 수 있습니다.
        </p>
      )}

      {mode === 'study' && (
        <p className="border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)]">
          숨긴 페이지는 건너뜁니다. 단어 가림은 탭으로 열고 닫습니다.
        </p>
      )}
    </div>
  )
}
