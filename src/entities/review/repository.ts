import { db } from '@/entities/db'
import type { ReviewGrade, ReviewQueueItem, ReviewState } from '@/entities/review/types'
import { isDue, scheduleAfterGrade } from '@/shared/lib/reviewSchedule'
import { nowIso } from '@/shared/lib/id'

export async function ensureReviewState(markId: string, documentId: string): Promise<ReviewState> {
  const existing = await db.reviewStates.get(markId)
  if (existing) return existing
  const now = nowIso()
  const state: ReviewState = {
    id: markId,
    markId,
    documentId,
    interval: 0,
    ease: 2.5,
    repetitions: 0,
    lapses: 0,
    dueAt: now,
    lastReviewedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  await db.reviewStates.put(state)
  return state
}

export async function deleteReviewState(markId: string): Promise<void> {
  await db.reviewStates.delete(markId)
}

export async function deleteReviewStatesByDocument(documentId: string): Promise<void> {
  await db.reviewStates.where('documentId').equals(documentId).delete()
}

export async function countDue(now = new Date()): Promise<number> {
  const all = await db.reviewStates.toArray()
  return all.filter((s) => isDue(s.dueAt, now)).length
}

export async function listDueQueue(
  now = new Date(),
  options: { documentId?: string; shuffle?: boolean } = {},
): Promise<ReviewQueueItem[]> {
  const states = await db.reviewStates.toArray()
  let due = states.filter((s) => isDue(s.dueAt, now))
  if (options.documentId) {
    due = due.filter((s) => s.documentId === options.documentId)
  }
  due.sort((a, b) => a.dueAt.localeCompare(b.dueAt))

  const items: ReviewQueueItem[] = []
  for (const s of due) {
    const mark = await db.marks.get(s.markId)
    const doc = await db.documents.get(s.documentId)
    if (!mark || !doc) continue
    if ((doc.hiddenPages ?? []).includes(mark.page)) continue
    items.push({
      markId: mark.id,
      documentId: doc.id,
      fileName: doc.fileName,
      page: mark.page,
      dueAt: s.dueAt,
    })
  }

  if (options.shuffle) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = items[i]!
      items[i] = items[j]!
      items[j] = tmp
    }
  }
  return items
}

export async function countDueByDocument(now = new Date()): Promise<Record<string, number>> {
  const queue = await listDueQueue(now)
  const map: Record<string, number> = {}
  for (const item of queue) {
    map[item.documentId] = (map[item.documentId] ?? 0) + 1
  }
  return map
}

/** due와 무관하게 가림 전체(또는 문서별) — 연습용, 스케줄 미반영 */
export async function listPracticeQueue(
  options: { documentId?: string; shuffle?: boolean } = {},
): Promise<ReviewQueueItem[]> {
  const states = await db.reviewStates.toArray()
  let pool = states
  if (options.documentId) {
    pool = pool.filter((s) => s.documentId === options.documentId)
  }

  const items: ReviewQueueItem[] = []
  for (const s of pool) {
    const mark = await db.marks.get(s.markId)
    const doc = await db.documents.get(s.documentId)
    if (!mark || !doc) continue
    if ((doc.hiddenPages ?? []).includes(mark.page)) continue
    items.push({
      markId: mark.id,
      documentId: doc.id,
      fileName: doc.fileName,
      page: mark.page,
      dueAt: s.dueAt,
    })
  }

  const shuffle = options.shuffle !== false
  if (shuffle) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = items[i]!
      items[i] = items[j]!
      items[j] = tmp
    }
  }
  return items
}

export async function gradeMark(markId: string, grade: ReviewGrade): Promise<ReviewState | null> {
  const state = await db.reviewStates.get(markId)
  if (!state) return null
  const next = scheduleAfterGrade(state, grade)
  const updated: ReviewState = {
    ...state,
    ...next,
    lastReviewedAt: nowIso(),
    updatedAt: nowIso(),
  }
  await db.reviewStates.put(updated)
  return updated
}

/** 기존 Mark에 ReviewState가 없으면 생성 (마이그레이션) */
export async function backfillMissingReviewStates(): Promise<number> {
  const marks = await db.marks.toArray()
  let n = 0
  for (const m of marks) {
    const exists = await db.reviewStates.get(m.id)
    if (!exists) {
      await ensureReviewState(m.id, m.documentId)
      n += 1
    }
  }
  return n
}
