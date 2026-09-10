import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, CornerUpLeft } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/cn'

export type CoverPageItem = { page: number; count: number }

export function CoverPageNav({
  pages,
  currentPage,
  lastCoverPage,
  onGo,
}: {
  pages: CoverPageItem[]
  currentPage: number
  lastCoverPage: number | null
  onGo: (page: number) => void
}) {
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'smooth',
    })
  }, [currentPage, pages])

  if (pages.length === 0) return null

  const prev = [...pages].reverse().find((item) => item.page < currentPage)
  const next = pages.find((item) => item.page > currentPage)
  const showReturn =
    lastCoverPage != null &&
    lastCoverPage !== currentPage &&
    pages.some((item) => item.page === lastCoverPage)

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <span className="shrink-0 text-[10px] font-semibold tracking-wide text-[var(--muted)]">
        가림
      </span>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        disabled={!prev}
        title={prev ? `이전 가림 ${prev.page}페이지` : '이전 가림 페이지 없음'}
        onClick={() => prev && onGo(prev.page)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pages.map((item) => {
          const active = item.page === currentPage
          return (
            <button
              key={item.page}
              ref={active ? activeRef : undefined}
              type="button"
              title={`${item.page}페이지 · 가림 ${item.count}개`}
              onClick={() => onGo(item.page)}
              className={cn(
                'inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] font-semibold tabular-nums',
                active
                  ? 'bg-[var(--accent)] text-white'
                  : 'border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--accent)]/50',
              )}
            >
              {item.page}
              <span className={cn('text-[10px] font-medium', active ? 'text-white/80' : 'text-[var(--muted)]')}>
                {item.count}
              </span>
            </button>
          )
        })}
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        disabled={!next}
        title={next ? `다음 가림 ${next.page}페이지` : '다음 가림 페이지 없음'}
        onClick={() => next && onGo(next.page)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      {showReturn ? (
        <Button
          size="sm"
          variant="secondary"
          className="h-7 shrink-0"
          title={`방금 작업하던 ${lastCoverPage}페이지로`}
          onClick={() => lastCoverPage && onGo(lastCoverPage)}
        >
          <CornerUpLeft className="h-3.5 w-3.5" />
          {lastCoverPage}p
        </Button>
      ) : null}
    </div>
  )
}
