import { useEffect, useMemo, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  PanelLeft,
  RectangleHorizontal,
  Star,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

import * as appStateRepo from '@/entities/app-state/repository'
import * as documentRepo from '@/entities/document/repository'
import * as markRepo from '@/entities/mark/repository'
import * as pageFavoriteRepo from '@/entities/pageFavorite/repository'
import * as reviewRepo from '@/entities/review/repository'
import type { Document } from '@/entities/document/types'
import type { MarkColor } from '@/entities/mark/types'
import { clampFitScale } from '@/features/reader/fitScale'
import { PdfViewer } from '@/features/reader/PdfViewer'
import { PageThumbnailRail } from '@/features/reader/PageThumbnailRail'
import { isHeavyPdf } from '@/features/reader/pdfBudget'
import { revokeThumbs, setThumbConcurrency } from '@/features/reader/pageThumbCache'
import type { ReaderMode } from '@/features/reader/types'
import type { MarkHistoryOp } from '@/features/reader/markHistory'
import { rectsEqual } from '@/features/reader/markHistory'
import { useMarks } from '@/features/reader/useMarks'
import { useOpHistory } from '@/features/reader/useOpHistory'
import {
  isMaxZoom,
  isMinZoom,
  snapZoomPercent,
  stepZoomPercent,
  ZOOM_PERCENTS,
} from '@/features/reader/zoomSteps'
import { usePinchZoom } from '@/features/reader/usePinchZoom'
import { Button } from '@/shared/ui/button'
import { SegmentedGroup, ToolCluster } from '@/shared/ui/tool-cluster'
import { UndoRedoButtons } from '@/shared/ui/undo-redo'
import { cn } from '@/shared/lib/cn'
import {
  adjacentVisiblePage,
  listVisiblePages,
  nearestVisiblePage,
} from '@/shared/lib/visiblePages'

const COLORS: MarkColor[] = ['yellow', 'red', 'purple']

function isTypingTarget(t: EventTarget | null) {
  return (
    t instanceof HTMLInputElement ||
    t instanceof HTMLTextAreaElement ||
    t instanceof HTMLSelectElement
  )
}

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
  const [railOpen, setRailOpen] = useState(false)
  const [pdfJsDoc, setPdfJsDoc] = useState<PDFDocumentProxy | null>(null)
  const [fileBytes, setFileBytes] = useState(0)
  const {
    canUndo,
    canRedo,
    push: pushHistory,
    takeUndo,
    takeRedo,
    clear: clearHistory,
  } = useOpHistory<MarkHistoryOp>()
  const applyingHistory = useRef(false)
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
      setFileBytes(blobRow.size)
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
    if (!selectedMarkId) return
    const selected = marksApi.marks.find((m) => m.id === selectedMarkId)
    if (selected && selected.page !== page) setSelectedMarkId(null)
  }, [page, selectedMarkId, marksApi.marks])

  useEffect(() => {
    setFitReady(false)
    setZoomPercent(100)
  }, [documentId, fileUrl, pageLayout])

  useEffect(() => {
    setRailOpen(false)
    setPdfJsDoc(null)
  }, [documentId, fileUrl])

  const heavyPdf = isHeavyPdf(fileBytes, pageCount)

  /** 가벼운 PDF만 책장을 자동으로 연다. 대용량은 본문만 먼저 그린다. */
  useEffect(() => {
    if (!fileUrl || !doc) return
    if (heavyPdf) return
    const t = window.setTimeout(() => setRailOpen(true), 450)
    return () => window.clearTimeout(t)
  }, [fileUrl, doc, heavyPdf])

  useEffect(() => {
    setThumbConcurrency(heavyPdf ? 1 : 2)
  }, [heavyPdf])

  useEffect(() => {
    if (!fileUrl) return
    return () => {
      revokeThumbs(fileUrl)
    }
  }, [fileUrl])

  const applyFitFromBaseSize = (size: { width: number; height: number }) => {
    const el = viewerPaneRef.current
    if (!el || !doc) {
      setScale(pageLayout === 'landscape' ? 1.65 : 1.1)
      setFitReady(true)
      return
    }
    const next = clampFitScale(
      size.width,
      size.height,
      el.clientWidth,
      el.clientHeight,
      pageLayout,
    )
    setScale(Math.round(next * 100) / 100)
    setZoomPercent(100)
    setFitReady(true)
  }

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

  const recordOp = (op: MarkHistoryOp) => {
    if (applyingHistory.current) return
    pushHistory(op)
  }

  const applyOp = async (op: MarkHistoryOp, direction: 'undo' | 'redo') => {
    applyingHistory.current = true
    try {
      if (op.kind === 'create') {
        if (direction === 'undo') {
          await marksApi.remove(op.mark.id)
          setSelectedMarkId(null)
        } else {
          await markRepo.restoreMark(op.mark)
          await marksApi.refresh()
          setSelectedMarkId(op.mark.id)
          goToPage(op.mark.page)
        }
        return
      }
      if (op.kind === 'delete') {
        if (direction === 'undo') {
          await markRepo.restoreMark(op.mark, op.review)
          await marksApi.refresh()
          setSelectedMarkId(op.mark.id)
          goToPage(op.mark.page)
        } else {
          await marksApi.remove(op.mark.id)
          setSelectedMarkId(null)
        }
        return
      }
      if (op.kind === 'geometry') {
        await marksApi.updateGeometry(op.id, direction === 'undo' ? op.before : op.after)
        setSelectedMarkId(op.id)
        return
      }
      await marksApi.setColor(op.id, direction === 'undo' ? op.before : op.after)
      setSelectedMarkId(op.id)
      setColor(direction === 'undo' ? op.before : op.after)
    } finally {
      applyingHistory.current = false
    }
  }

  const undoMark = async () => {
    const op = takeUndo()
    if (!op) return
    await applyOp(op, 'undo')
  }

  const redoMark = async () => {
    const op = takeRedo()
    if (!op) return
    await applyOp(op, 'redo')
  }

  const deleteMarkWithUndo = async (id: string) => {
    const mark = marksApi.marks.find((m) => m.id === id)
    if (!mark) return
    const review = (await reviewRepo.getReviewState(id)) ?? null
    await marksApi.remove(id)
    setSelectedMarkId(null)
    recordOp({ kind: 'delete', mark, review })
  }

  const undoMarkRef = useRef(undoMark)
  undoMarkRef.current = undoMark
  const redoMarkRef = useRef(redoMark)
  redoMarkRef.current = redoMark

  useEffect(() => {
    clearHistory()
  }, [documentId, clearHistory])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || isTypingTarget(e.target)) return
      const key = e.key.toLowerCase()
      if (key === 'z' && e.shiftKey) {
        e.preventDefault()
        void redoMarkRef.current()
        return
      }
      if (key === 'z') {
        e.preventDefault()
        void undoMarkRef.current()
        return
      }
      if (key === 'y') {
        e.preventDefault()
        void redoMarkRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const canPrev = pageCoverMode ? page > 1 : adjacentVisiblePage(page, visiblePages, -1) != null
  const canNext = pageCoverMode
    ? page < pageCount
    : adjacentVisiblePage(page, visiblePages, 1) != null

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-[var(--danger)]">{error}</p>
        <Button asChild variant="secondary">
          <Link to="/library">서재로</Link>
        </Button>
      </div>
    )
  }

  if (!doc || !fileUrl || !documentId) {
    return <div className="p-8 text-sm text-[var(--muted)]">불러오는 중…</div>
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
        <SegmentedGroup>
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
        </SegmentedGroup>

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
                doc.isFavorite ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-[var(--muted)]',
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
                ? '가로 맞춤 (넓은 스캔용)'
                : '세로 맞춤'
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

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ToolCluster>
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!canPrev} onClick={() => goAdjacent(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
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
            <span className="px-0.5 text-xs text-[var(--muted)]">/</span>
            <span className="min-w-6 pr-1 text-xs tabular-nums text-[var(--muted)]">{pageCount}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!canNext} onClick={() => goAdjacent(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </ToolCluster>
          {hiddenPages.length > 0 && (
            <span className="text-[10px] text-[var(--muted)]">숨김 {hiddenPages.length}</span>
          )}
          <ToolCluster>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="축소"
              disabled={isMinZoom(zoomPercent)}
              onClick={() => setZoomPercent((z) => stepZoomPercent(z, -1))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <select
              aria-label="확대 배율"
              title="확대 배율 (핀치로도 조절)"
              className="h-8 rounded-md border-0 bg-transparent px-1.5 text-xs font-semibold tabular-nums text-[var(--ink)] outline-none"
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
              className="h-8 w-8"
              title="확대"
              disabled={isMaxZoom(zoomPercent)}
              onClick={() => setZoomPercent((z) => stepZoomPercent(z, 1))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </ToolCluster>
        </div>
      </div>

      {mode === 'wordCover' && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--accent-soft)]/40 px-3 py-1.5">
          <span className="shrink-0 text-[10px] font-semibold tracking-wide text-[var(--accent)]">
            편집
          </span>
          <UndoRedoButtons
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={() => void undoMark()}
            onRedo={() => void redoMark()}
          />
          <ToolCluster label="색">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={selectedMark ? `선택 가림 색 · ${c}` : `새 가림 색 · ${c}`}
                className={cn(
                  'h-7 w-7 rounded-full border-2',
                  c === 'yellow' && 'bg-yellow-300',
                  c === 'red' && 'bg-red-400',
                  c === 'purple' && 'bg-purple-400',
                  (selectedMark ? selectedMark.color === c : color === c)
                    ? 'border-neutral-900'
                    : 'border-transparent',
                )}
                onClick={() => {
                  if (selectedMark) {
                    if (selectedMark.color !== c) {
                      void marksApi.setColor(selectedMark.id, c)
                      recordOp({
                        kind: 'color',
                        id: selectedMark.id,
                        before: selectedMark.color,
                        after: c,
                      })
                    }
                    setColor(c)
                  } else {
                    setColor(c)
                  }
                }}
              />
            ))}
          </ToolCluster>
          {selectedMark && selectedMark.page === page ? (
            <ToolCluster>
              <span className="hidden px-1.5 text-[11px] font-medium text-[var(--muted)] sm:inline">
                선택 · {selectedMark.page}p
              </span>
              <Button
                size="sm"
                variant="danger"
                onClick={() => void deleteMarkWithUndo(selectedMark.id)}
              >
                <Trash2 className="h-4 w-4" />
                삭제
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedMarkId(null)}>
                선택 해제
              </Button>
            </ToolCluster>
          ) : null}
          {pageMarks.length > 0 ? (
            <ToolCluster>
              <Button
                size="sm"
                variant="ghost"
                title="이 페이지 가림 전부 열기"
                onClick={() => void marksApi.setHiddenBulk(false, page)}
              >
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">전부 열기</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                title="이 페이지 가림 전부 가리기"
                onClick={() => void marksApi.setHiddenBulk(true, page)}
              >
                <EyeOff className="h-4 w-4" />
                <span className="hidden sm:inline">전부 가리기</span>
              </Button>
            </ToolCluster>
          ) : null}
          {pageMarks.length > 0 ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              <span className="text-[11px] text-[var(--muted)]">이 페이지 {pageMarks.length}개</span>
              {pageMarks.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-[11px] font-medium',
                    selectedMarkId === m.id
                      ? 'border-[var(--accent)] bg-[var(--surface)] text-[var(--ink)]'
                      : 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--ink)]',
                  )}
                  onClick={() => setSelectedMarkId(m.id)}
                >
                  #{i + 1}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--muted)]">드래그해서 가림을 만드세요</p>
          )}
        </div>
      )}

      {mode === 'pageCover' && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--accent-soft)]/40 px-3 py-1.5">
          <span className="shrink-0 text-[10px] font-semibold tracking-wide text-[var(--accent)]">
            편집
          </span>
          <ToolCluster>
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
          </ToolCluster>
          <p className="text-[11px] text-[var(--muted)]">
            숨긴 페이지는 학습·단어 가림에서 보이지 않습니다.
          </p>
        </div>
      )}

      {mode === 'study' && pageMarks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
          <span className="shrink-0 text-[10px] font-semibold tracking-wide text-[var(--muted)]">
            이 페이지
          </span>
          <ToolCluster>
            <Button
              size="sm"
              variant="ghost"
              title="이 페이지 가림 전부 열기"
              onClick={() => void marksApi.setHiddenBulk(false, page)}
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">전부 열기</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              title="이 페이지 가림 전부 가리기"
              onClick={() => void marksApi.setHiddenBulk(true, page)}
            >
              <EyeOff className="h-4 w-4" />
              <span className="hidden sm:inline">전부 가리기</span>
            </Button>
          </ToolCluster>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[92px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] sm:flex">
          <Button
            size="sm"
            variant={railOpen ? 'secondary' : 'ghost'}
            className="h-10 w-full shrink-0 rounded-none border-b border-[var(--border)]"
            title={railOpen ? '책장 닫기' : '페이지 미리보기 책장'}
            onClick={() => setRailOpen((open) => !open)}
          >
            <PanelLeft className="h-4 w-4" />
            책장
          </Button>
          {railOpen && pdfJsDoc && fileUrl ? (
            <PageThumbnailRail
              pdf={pdfJsDoc}
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
              onClose={() => setRailOpen(false)}
              hideTitle
            />
          ) : null}
        </div>
        <div
          ref={viewerPaneRef}
          className="pdf-reader-scroll min-h-0 flex-1 bg-[var(--pdf-bg)] p-4"
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
            <div className="mx-auto w-full">
              <PdfViewer
                fileUrl={fileUrl}
                page={page}
                pageCount={pageCount}
                pages={railPages}
                scale={scale}
                zoomFactor={zoomPercent / 100}
                mode={mode}
                continuousScroll
                renderRadius={heavyPdf ? 1 : 2}
                scrollRootRef={viewerPaneRef}
                marks={marksApi.marks}
                selectedMarkId={selectedMarkId}
                onSelectMark={setSelectedMarkId}
                onPageChange={setPage}
                onPageCount={(n) => {
                  setPageCount(n)
                  if (doc.pageCount !== n) void documentRepo.updatePageCount(doc.id, n)
                }}
                onPdfJsDocument={setPdfJsDoc}
                devicePixelRatio={heavyPdf ? 1 : undefined}
                onBasePageSize={(size) => {
                  if (!fitReady) applyFitFromBaseSize(size)
                }}
                onCreateMark={(markPage, rect) => {
                  void marksApi.create({ page: markPage, color, ...rect }).then((mark) => {
                    if (mark) {
                      setSelectedMarkId(mark.id)
                      recordOp({ kind: 'create', mark })
                    }
                  })
                }}
                onUpdateGeometry={(id, rect) => {
                  const mark = marksApi.marks.find((m) => m.id === id)
                  if (!mark) return
                  const before = { x: mark.x, y: mark.y, w: mark.w, h: mark.h }
                  if (rectsEqual(before, rect)) return
                  void marksApi.updateGeometry(id, rect)
                  recordOp({ kind: 'geometry', id, before, after: rect })
                }}
                onDeleteMark={(id) => {
                  void deleteMarkWithUndo(id)
                }}
                onToggleStudy={(id) => void marksApi.toggleHidden(id)}
                onToggleFavorite={(id, fav) => void marksApi.toggleFavorite(id, fav)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
