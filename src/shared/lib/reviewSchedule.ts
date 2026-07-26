import type { ReviewGrade } from '@/entities/review/types'

const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * 60 * 1000

export function startOfLocalDay(d = new Date()): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function endOfLocalDay(d = new Date()): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

/** SM-2 단순판: Again / Good 두 버튼 */
export function scheduleAfterGrade(
  prev: { interval: number; ease: number; repetitions: number; lapses: number },
  grade: ReviewGrade,
  now = new Date(),
): {
  interval: number
  ease: number
  repetitions: number
  lapses: number
  dueAt: string
} {
  if (grade === 'again') {
    return {
      interval: 0,
      ease: Math.max(1.3, prev.ease - 0.2),
      repetitions: 0,
      lapses: prev.lapses + 1,
      dueAt: new Date(now.getTime() + 10 * MINUTE_MS).toISOString(),
    }
  }

  let interval: number
  let repetitions = prev.repetitions + 1
  let ease = prev.ease

  if (prev.repetitions === 0) {
    interval = 1
  } else if (prev.repetitions === 1) {
    interval = 3
  } else {
    interval = Math.max(1, Math.round(prev.interval * ease))
    ease = Math.min(2.5, ease + 0.1)
  }

  return {
    interval,
    ease,
    repetitions,
    lapses: prev.lapses,
    dueAt: new Date(now.getTime() + interval * DAY_MS).toISOString(),
  }
}

export function isDue(dueAt: string, now = new Date()): boolean {
  return new Date(dueAt).getTime() <= now.getTime()
}
