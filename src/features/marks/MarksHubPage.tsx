import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Eye, EyeOff, Trash2 } from 'lucide-react'

import * as documentRepo from '@/entities/document/repository'
import * as markRepo from '@/entities/mark/repository'
import * as pageFavoriteRepo from '@/entities/pageFavorite/repository'
import * as reviewRepo from '@/entities/review/repository'
import type { HiddenPageItem } from '@/entities/document/types'
import type { Mark } from '@/entities/mark/types'
import type { PageFavoriteItem } from '@/entities/pageFavorite/types'
import type { ReviewState } from '@/entities/review/types'
import { PdfPageThumb } from '@/features/marks/PdfPageThumb'
import { useDocumentPdfUrls } from '@/features/marks/useDocumentPdfUrls'
import { useOpHistory } from '@/features/reader/useOpHistory'
import { Button } from '@/shared/ui/button'
import { SegmentedGroup } from '@/shared/ui/tool-cluster'
import { UndoRedoButtons } from '@/shared/ui/undo-redo'
import { cn } from '@/shared/lib/cn'

type HubTab = 'favorites' | 'wordCovers' | 'pageCovers'

interface MarkRow extends Mark {
  fileName: string
}

type HubDeleteOp = { mark: MarkRow; review: ReviewState | null }

const COLOR_DOT: Record<Mark['color'], string> = {
  yellow: 'bg-yellow-400',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
}

export function MarksHubPage() {
  const [tab, setTab] = useState<HubTab>('favorites')
  const [pages, setPages] = useState<PageFavoriteItem[]>([])
  const [marks, setMarks] = useState<MarkRow[]>([])
  const [hiddenPages, setHiddenPages] = useState<HiddenPageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDocId, setFilterDocId] = useState<string | 'all'>('all')
  const history = useOpHistory<HubDeleteOp>()
  const applyingHistory = useRef(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [favPages, allMarks, hidden] = await Promise.all([
        pageFavoriteRepo.listPageFavorites(),
        markRepo.listAllMarks(),
        documentRepo.listHiddenPages(),
      ])
      const withNames: MarkRow[] = []
      for (const m of allMarks) {
        const doc = await documentRepo.getDocument(m.documentId)
        if (!doc) continue
        withNames.push({ ...m, fileName: doc.fileName })
      }
      setPages(favPages)
      setMarks(withNames)
      setHiddenPages(hidden)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const undoHub = async () => {
    const op = history.takeUndo()
    if (!op) return
    applyingHistory.current = true
    try {
      await markRepo.restoreMark(op.mark, op.review)
      await refresh()
    } finally {
      applyingHistory.current = false
    }
  }

  const redoHub = async () => {
    const op = history.takeRedo()
    if (!op) return
    applyingHistory.current = true
    try {
      await markRepo.deleteMark(op.mark.id)
      await refresh()
    } finally {
      applyingHistory.current = false
    }
  }

  const undoHubRef = useRef(undoHub)
  undoHubRef.current = undoHub
  const redoHubRef = useRef(redoHub)
  redoHubRef.current = redoHub
  const tabRef = useRef(tab)
  tabRef.current = tab

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tabRef.current !== 'wordCovers') return
      if (!(e.ctrlKey || e.metaKey)) return
      const t = e.target
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement
      ) {
        return
      }
      const key = e.key.toLowerCase()
      if (key === 'z' && e.shiftKey) {
        e.preventDefault()
        void redoHubRef.current()
        return
      }
      if (key === 'z') {
        e.preventDefault()
        void undoHubRef.current()
        return
      }
      if (key === 'y') {
        e.preventDefault()
        void redoHubRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const docOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of marks) map.set(m.documentId, m.fileName)
    for (const p of pages) map.set(p.documentId, p.fileName)
    for (const h of hiddenPages) map.set(h.documentId, h.fileName)
    return [...map.entries()].map(([id, fileName]) => ({ id, fileName }))
  }, [marks, pages, hiddenPages])

  const filteredMarks =
    filterDocId === 'all' ? marks : marks.filter((m) => m.documentId === filterDocId)
  const filteredPages =
    filterDocId === 'all' ? pages : pages.filter((p) => p.documentId === filterDocId)
  const filteredHidden =
    filterDocId === 'all'
      ? hiddenPages
      : hiddenPages.filter((h) => h.documentId === filterDocId)

  const urlDocIds = useMemo(() => {
    const items =
      tab === 'favorites'
        ? filteredPages
        : tab === 'wordCovers'
          ? filteredMarks
          : filteredHidden
    return items.map((i) => i.documentId)
  }, [tab, filteredPages, filteredMarks, filteredHidden])

  const pdfUrls = useDocumentPdfUrls(urlDocIds)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="shrink-0 px-5 pt-5 pb-3">
        <h1 className="text-lg font-bold tracking-tight">가림</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          즐겨찾기 · 단어 가림 · 페이지 가림을 모아 봅니다.
        </p>
        <SegmentedGroup size="md" className="mt-3">
          {(
            [
              { id: 'favorites' as const, label: '즐겨찾기' },
              { id: 'wordCovers' as const, label: '단어 가림' },
              { id: 'pageCovers' as const, label: '페이지 가림' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              className={cn(
                'flex-1 rounded-md py-2 text-sm font-semibold',
                tab === t.id
                  ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm'
                  : 'text-[var(--muted)]',
              )}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </SegmentedGroup>

        {docOptions.length > 0 && (
          <select
            className="mt-3 h-9 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-sm"
            value={filterDocId}
            onChange={(e) => setFilterDocId(e.target.value as string | 'all')}
          >
            <option value="all">모든 PDF</option>
            {docOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fileName}
              </option>
            ))}
          </select>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-4 pb-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-[var(--muted)]">불러오는 중…</p>
        ) : tab === 'favorites' ? (
          <FavoritesPanel
            items={filteredPages}
            pdfUrls={pdfUrls}
            onRemove={async (id) => {
              await pageFavoriteRepo.removePageFavorite(id)
              await refresh()
            }}
          />
        ) : tab === 'wordCovers' ? (
          <WordCoversPanel
            items={filteredMarks}
            pdfUrls={pdfUrls}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={() => void undoHub()}
            onRedo={() => void redoHub()}
            onDelete={async (id) => {
              const mark = marks.find((m) => m.id === id)
              if (!mark) return
              if (!confirm('이 단어 가림을 삭제할까요?')) return
              const review = (await reviewRepo.getReviewState(id)) ?? null
              await markRepo.deleteMark(id)
              if (!applyingHistory.current) history.push({ mark, review })
              await refresh()
            }}
          />
        ) : (
          <PageCoversPanel
            items={filteredHidden}
            pdfUrls={pdfUrls}
            onUnhide={async (documentId, page) => {
              await documentRepo.setPageHidden(documentId, page, false)
              await refresh()
            }}
          />
        )}
      </div>
    </div>
  )
}

function FavoritesPanel({
  items,
  pdfUrls,
  onRemove,
}: {
  items: PageFavoriteItem[]
  pdfUrls: Record<string, string>
  onRemove: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <Bookmark className="mx-auto h-8 w-8 text-[var(--muted)]" />
        <p className="mt-3 text-sm font-medium text-[var(--ink)]">즐겨찾기한 페이지가 없습니다</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          PDF를 연 뒤 상단 <strong>페이지 북마크</strong>로 현재 페이지를 저장하세요.
        </p>
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item) => (
        <li
          key={item.id}
          className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
        >
          <Link
            to={`/read/${item.documentId}?page=${item.page}`}
            className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <div className="flex justify-center bg-[var(--bg)] py-2">
              <PdfPageThumb
                fileUrl={pdfUrls[item.documentId]}
                page={item.page}
                width={140}
                badge={
                  <span className="absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow">
                    <Bookmark className="h-3 w-3 fill-current" strokeWidth={2} />
                  </span>
                }
              />
            </div>
            <p className="border-t border-[var(--border)] bg-[var(--bg)] py-1.5 text-center text-xs font-semibold tabular-nums text-[var(--ink)]">
              {item.page}페이지
            </p>
          </Link>
          <Button
            size="icon"
            variant="ghost"
            title="즐겨찾기 해제"
            className="absolute top-1 right-1 h-8 w-8 bg-[var(--surface)]/90 opacity-90 shadow-sm hover:opacity-100"
            onClick={() => void onRemove(item.id)}
          >
            <Trash2 className="h-4 w-4 text-[var(--muted)]" />
          </Button>
        </li>
      ))}
    </ul>
  )
}

function WordCoversPanel({
  items,
  pdfUrls,
  onDelete,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  items: MarkRow[]
  pdfUrls: Record<string, string>
  onDelete: (id: string) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}) {
  if (items.length === 0 && !canUndo) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <EyeOff className="mx-auto h-8 w-8 text-[var(--muted)]" />
        <p className="mt-3 text-sm font-medium text-[var(--ink)]">아직 단어 가림이 없습니다</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          리더 → <strong>단어 가림</strong> 모드에서 드래그로 만들면 여기에 모입니다.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--accent-soft)]/40 px-3 py-2">
        <span className="text-[10px] font-semibold tracking-wide text-[var(--accent)]">편집</span>
        <UndoRedoButtons canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} />
        <p className="text-[11px] text-[var(--muted)]">삭제한 가림은 실행 취소로 되돌릴 수 있습니다.</p>
      </div>
      {items.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
            >
              <Link
                to={`/read/${item.documentId}?page=${item.page}&mark=${item.id}&mode=wordCover`}
                className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                <div className="flex justify-center bg-[var(--bg)] py-2">
                  <PdfPageThumb
                    fileUrl={pdfUrls[item.documentId]}
                    page={item.page}
                    width={140}
                    badge={
                      <>
                        <span
                          className={cn(
                            'absolute top-1.5 left-1.5 h-3.5 w-3.5 rounded-full border-2 border-white shadow',
                            COLOR_DOT[item.color],
                          )}
                          title={item.color}
                        />
                        <MarkRectOverlay mark={item} />
                      </>
                    }
                  />
                </div>
                <p className="border-t border-[var(--border)] bg-[var(--bg)] py-1.5 text-center text-xs font-semibold tabular-nums text-[var(--ink)]">
                  {item.page}페이지
                </p>
              </Link>
              <Button
                size="icon"
                variant="ghost"
                title="단어 가림 삭제"
                className="absolute top-1 right-1 h-8 w-8 bg-[var(--surface)]/90 opacity-90 shadow-sm hover:opacity-100"
                onClick={() => void onDelete(item.id)}
              >
                <Trash2 className="h-4 w-4 text-[var(--muted)]" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PageCoversPanel({
  items,
  pdfUrls,
  onUnhide,
}: {
  items: HiddenPageItem[]
  pdfUrls: Record<string, string>
  onUnhide: (documentId: string, page: number) => void
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <Eye className="mx-auto h-8 w-8 text-[var(--muted)]" />
        <p className="mt-3 text-sm font-medium text-[var(--ink)]">숨긴 페이지가 없습니다</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          리더 → <strong>페이지 가림</strong>에서 필요 없는 페이지를 숨기면 여기에 모입니다.
        </p>
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item) => (
        <li
          key={`${item.documentId}:${item.page}`}
          className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
        >
          <Link
            to={`/read/${item.documentId}?page=${item.page}&mode=pageCover`}
            className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <div className="flex justify-center bg-[var(--bg)] py-2">
              <PdfPageThumb
                fileUrl={pdfUrls[item.documentId]}
                page={item.page}
                width={140}
                badge={
                  <span className="absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800 text-white shadow">
                    <EyeOff className="h-3 w-3" strokeWidth={2} />
                  </span>
                }
              />
            </div>
            <div className="border-t border-[var(--border)] bg-[var(--bg)] px-2 py-1.5">
              <p className="truncate text-center text-[10px] text-[var(--muted)]">{item.fileName}</p>
              <p className="text-center text-xs font-semibold tabular-nums text-[var(--ink)]">
                {item.page}페이지 · 숨김
              </p>
            </div>
          </Link>
          <Button
            size="sm"
            variant="secondary"
            title="다시 보이기"
            className="absolute top-1 right-1 h-8 gap-1 bg-[var(--surface)]/95 px-2 text-[10px] shadow-sm"
            onClick={() => void onUnhide(item.documentId, item.page)}
          >
            <Eye className="h-3.5 w-3.5" />
            보이기
          </Button>
        </li>
      ))}
    </ul>
  )
}

function MarkRectOverlay({ mark }: { mark: Mark }) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute box-border border-2',
        mark.color === 'yellow' && 'border-yellow-500 bg-yellow-300/50',
        mark.color === 'red' && 'border-red-500 bg-red-300/50',
        mark.color === 'purple' && 'border-purple-500 bg-purple-300/50',
      )}
      style={{
        left: `${mark.x * 100}%`,
        top: `${mark.y * 100}%`,
        width: `${mark.w * 100}%`,
        height: `${mark.h * 100}%`,
      }}
    />
  )
}
