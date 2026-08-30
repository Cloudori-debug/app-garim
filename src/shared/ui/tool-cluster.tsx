import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

/** 툴바에서 역할이 같은 버튼을 한 덩어리로 묶습니다. */
export function ToolCluster({
  label,
  children,
  className,
}: {
  label?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {label ? (
        <span className="shrink-0 text-[10px] font-semibold tracking-wide text-[var(--muted)]">
          {label}
        </span>
      ) : null}
      <div className="flex items-center gap-0.5 rounded-md bg-[var(--border)]/80 p-0.5">
        {children}
      </div>
    </div>
  )
}

/** 학습/가림처럼 서로 배타적인 모드를 고르는 세그먼트. */
export function SegmentedGroup({
  children,
  className,
  size = 'sm',
}: {
  children: ReactNode
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div
      className={cn(
        'flex',
        size === 'md' ? 'gap-1 rounded-lg p-1' : 'rounded-md p-0.5',
        'bg-[var(--border)]/80',
        className,
      )}
    >
      {children}
    </div>
  )
}
