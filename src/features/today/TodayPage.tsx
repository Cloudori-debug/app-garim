import { Link } from 'react-router-dom'

import { useReviewQueue } from '@/features/today/useReviewQueue'
import { Button } from '@/shared/ui/button'

export function TodayPage() {
  const { dueCount, byDoc, loading } = useReviewQueue()

  return (
    <div className="flex h-full flex-col overflow-auto">
      <header className="flex items-center justify-between px-5 pt-5 pb-2">
        <h1 className="text-base font-bold tracking-tight">암기노트</h1>
        <Link to="/more" className="text-xs text-[var(--muted)] underline-offset-2 hover:underline">
          더보기
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-10 text-center">
        <p className="text-xs font-medium tracking-wide text-[var(--muted)]">오늘 복습</p>
        <p className="mt-1 text-7xl font-bold tracking-tight tabular-nums text-[var(--ink)]">
          {loading ? '—' : dueCount}
        </p>

        {dueCount > 0 ? (
          <Button
            asChild
            className="mt-5 min-w-40 rounded-xl bg-[var(--accent)] px-8 py-3 text-base font-semibold text-white hover:bg-[var(--accent-hover)]"
          >
            <Link to="/review">복습 시작</Link>
          </Button>
        ) : (
          <div className="mt-6 max-w-xs space-y-3">
            <p className="text-sm text-[var(--muted)]">
              서재에서 가림을 만들면 오늘 복습에 모여요.
            </p>
            <Button asChild variant="outline" className="rounded-xl border-[var(--ink)]">
              <Link to="/library">서재로</Link>
            </Button>
          </div>
        )}

        {byDoc.length > 0 && (
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {byDoc.slice(0, 6).map((d) => (
              <span
                key={d.documentId}
                className="rounded-full border border-[var(--border-strong)] px-3 py-1 text-xs text-[var(--ink)]"
              >
                {d.fileName.replace(/\.pdf$/i, '')} {d.count}
              </span>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
