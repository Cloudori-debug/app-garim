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

export async function listDueQueue(now = new Date()): Promise<ReviewQueueItem[]> {
  const states = await db.reviewStates.toArray()
  const due = states.filter((s) => isDue(s.dueAt, now)).sort((a, b) => a.dueAt.localeCompare(b.dueAt))

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
