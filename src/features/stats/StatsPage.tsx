import { useCallback, useEffect, useState } from 'react'

import * as reviewRepo from '@/entities/review/repository'
import type { ReviewStatsSummary } from '@/entities/review/types'

export function StatsPage() {
  const [stats, setStats] = useState<ReviewStatsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setStats(await reviewRepo.getReviewStats())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refresh])

  return (
    <div className="h-full overflow-auto px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <h1 className="text-lg font-bold">통계</h1>

      {loading && !stats ? (
        <p className="mt-10 text-sm text-[var(--muted)]">불러오는 중…</p>
      ) : stats && stats.total === 0 ? (
        <p className="mt-10 text-sm text-[var(--muted)]">가림을 만들면 통계가 모여요.</p>
      ) : stats ? (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <StatCard label="오늘 할 일" value={stats.due} />
            <StatCard label="오늘 복습" value={stats.reviewedToday} />
            <StatCard label="오답 이력" value={stats.weak} hint="한 번 이상 틀림" />
            <StatCard label="전체 가림" value={stats.total} />
          </div>

          <section className="mt-10">
            <h2 className="text-xs font-medium text-[var(--muted)]">과목별</h2>
            {stats.bySubject.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">과목 데이터 없음</p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--border)] rounded-xl border border-[var(--border-strong)] bg-[var(--surface)]">
                {stats.bySubject.map((s) => (
                  <li
                    key={s.folderId}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium text-[var(--ink)]">{s.name}</span>
                    <span className="shrink-0 tabular-nums text-[var(--muted)]">
                      할 일 {s.due} · 오답 {s.weak} · {s.total}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--ink)]">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  )
}
