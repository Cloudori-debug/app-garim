import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'

import * as documentRepo from '@/entities/document/repository'
import * as markRepo from '@/entities/mark/repository'
import * as reviewRepo from '@/entities/review/repository'
import type { Mark } from '@/entities/mark/types'
import type { ReviewQueueItem } from '@/entities/review/types'
import { PdfViewer } from '@/features/reader/PdfViewer'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/cn'

export function ReviewSessionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const documentId = searchParams.get('doc') || undefined
  const isPractice = searchParams.get('mode') === 'practice'
  const restartKey = searchParams.get('r') || ''

  const [queue, setQueue] = useState<ReviewQueueItem[]>([])
  const [index, setIndex] = useState(0)
  const [mark, setMark] = useState<Mark | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scopeLabel, setScopeLabel] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setIndex(0)
    setDone(false)
    setQueue([])
    void (async () => {
      await reviewRepo.backfillMissingReviewStates()
      const items = isPractice
        ? await reviewRepo.listPracticeQueue({ documentId, shuffle: true })
        : await reviewRepo.listDueQueue(new Date(), { documentId, shuffle: true })
      if (cancelled) return
      if (documentId) {
        const doc = await documentRepo.getDocument(documentId)
        setScopeLabel(doc?.fileName.replace(/\.pdf$/i, '') ?? null)
      } else {
        setScopeLabel(null)
      }
      setQueue(items)
      setLoading(false)
      if (items.length === 0) setDone(true)
    })()
    return () => {
      cancelled = true
    }
  }, [documentId, isPractice, restartKey])

  const current = queue[index] ?? null

  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false

    async function loadItem() {
      if (!current) {
        setMark(null)
        setFileUrl(null)
        return
      }
      setRevealed(false)
      setError(null)
      const m = await markRepo.getMark(current.markId)
      const doc = await documentRepo.getDocument(current.documentId)
      if (!m || !doc) {
        setError('항목을 불러올 수 없습니다.')
        return
      }
      const blob = await documentRepo.getPdfBlob(doc.blobId)
      if (!blob) {
        setError('PDF를 찾을 수 없습니다.')
        return
      }
      if (cancelled) return
      const url = URL.createObjectURL(blob.blob)
      revoked = url
      // Force hidden for recall
      if (!m.hiddenInStudy) {
        await markRepo.toggleMarkHidden(m.id)
        const refreshed = await markRepo.getMark(m.id)
        setMark(refreshed ?? m)
      } else {
        setMark(m)
      }
      setFileUrl(url)
    }

    void loadItem()
    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [current])

  const advance = useCallback(() => {
    setIndex((i) => {
      const next = i + 1
      if (next >= queue.length) {
        setDone(true)
        return i
      }
      return next
    })
  }, [queue.length])

  const onGrade = async (grade: 'again' | 'good') => {
    if (!current || !revealed) return
    if (!isPractice) {
      await reviewRepo.gradeMark(current.markId, grade)
    }
    if (mark && !mark.hiddenInStudy) await markRepo.toggleMarkHidden(mark.id)
    advance()
  }

  const practiceHref = (() => {
    const params = new URLSearchParams({ mode: 'practice', r: String(Date.now()) })
    if (documentId) params.set('doc', documentId)
    return `/review?${params.toString()}`
  })()

  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">불러오는 중…</div>
  }

  if (done || !current) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[var(--bg)] p-6 text-center">
        <p className="text-lg font-bold text-[var(--ink)]">
          {queue.length === 0
            ? isPractice
              ? '연습할 항목 없음'
              : '복습할 항목 없음'
            : isPractice
              ? '연습 완료'
              : '오늘 복습 완료'}
        </p>
        <p className="text-sm text-[var(--muted)]">
          {queue.length === 0
            ? scopeLabel
              ? `「${scopeLabel}」에 ${isPractice ? '가림이' : '오늘 할 가림이'} 없어요.`
              : isPractice
                ? '연습할 가림이 없어요.'
                : '오늘 할 가림이 없어요.'
            : isPractice
              ? '일정에는 반영되지 않았어요.'
              : '잘했어요. 내일 또 모여요.'}
        </p>
        <div className="flex flex-col items-center gap-2">
          {queue.length > 0 && (
            <Button asChild className="rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]">
              <Link to={practiceHref}>다시 랜덤 연습</Link>
            </Button>
          )}
          <Button
            asChild
            variant={queue.length > 0 ? 'outline' : 'default'}
            className={
              queue.length > 0
                ? 'rounded-xl border-[var(--ink)]'
                : 'rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
            }
          >
            <Link to="/">오늘로</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-[var(--bg)] pt-[env(safe-area-inset-top)]">
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
        <div className="min-w-0">
          <span className="text-sm font-semibold tabular-nums">
            {isPractice ? '연습' : '복습'}{' '}
            <span className="text-[var(--accent)]">{index + 1}</span>/{queue.length}
          </span>
          <p className="truncate text-xs text-[var(--muted)]">
            {scopeLabel ?? current.fileName.replace(/\.pdf$/i, '')} · {current.page}p
            {isPractice && !scopeLabel ? ' · 일정 미반영' : ''}
          </p>
        </div>
        <button
          type="button"
          className="touch-target inline-flex items-center justify-center rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--bg)]"
          aria-label="닫기"
          onClick={() => navigate('/')}
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {error && (
        <p className="px-3 py-2 text-sm text-[var(--danger)]">{error}</p>
      )}

      <div className="min-h-0 flex-1 overflow-auto bg-[var(--pdf-bg)] p-3">
        {fileUrl && mark && (
          <div className="mx-auto w-fit">
            <PdfViewer
              fileUrl={fileUrl}
              page={mark.page}
              pageCount={mark.page}
              scale={1.15}
              mode="study"
              continuousScroll={false}
              marks={[
                revealed
                  ? { ...mark, hiddenInStudy: false }
                  : { ...mark, hiddenInStudy: true },
              ]}
              selectedMarkId={mark.id}
              onSelectMark={() => setRevealed((r) => !r)}
              onPageCount={() => {}}
              onCreateMark={() => {}}
              onUpdateGeometry={() => {}}
              onDeleteMark={() => {}}
              onToggleStudy={() => setRevealed((r) => !r)}
              onToggleFavorite={() => {}}
            />
          </div>
        )}
        {!revealed && (
          <p className="mt-2 text-center text-xs text-[var(--muted)]">가림을 탭하여 공개</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 border-t-2 border-[var(--ink)] bg-[var(--surface)] p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          disabled={!revealed}
          onClick={() => void onGrade('again')}
          className={cn(
            'min-h-12 rounded-xl border-2 border-[var(--ink)] py-3.5 text-sm font-bold',
            revealed
              ? 'bg-[var(--surface)] text-[var(--ink)]'
              : 'cursor-not-allowed opacity-40',
          )}
        >
          틀림
        </button>
        <button
          type="button"
          disabled={!revealed}
          onClick={() => void onGrade('good')}
          className={cn(
            'min-h-12 rounded-xl border-2 border-transparent py-3.5 text-sm font-bold text-white',
            revealed
              ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]'
              : 'cursor-not-allowed bg-[var(--accent)] opacity-40',
          )}
        >
          알았다
        </button>
      </div>
    </div>
  )
}
