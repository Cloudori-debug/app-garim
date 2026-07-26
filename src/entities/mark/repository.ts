import { db } from '@/entities/db'
import type { Mark, MarkColor } from '@/entities/mark/types'
import * as reviewRepo from '@/entities/review/repository'
import { clampNormRect, isValidMarkSize } from '@/shared/lib/geometry'
import { createId, nowIso } from '@/shared/lib/id'

export async function listAllMarks(): Promise<Mark[]> {
  return db.marks.orderBy('updatedAt').reverse().toArray()
}

export async function listMarksByDocument(documentId: string): Promise<Mark[]> {
  return db.marks.where('documentId').equals(documentId).toArray()
}

export async function listFavoriteMarks(): Promise<Mark[]> {
  return db.marks.filter((m) => m.isFavorite).toArray()
}

export async function getMark(id: string): Promise<Mark | undefined> {
  return db.marks.get(id)
}

export async function createMark(params: {
  documentId: string
  page: number
  x: number
  y: number
  w: number
  h: number
  color: MarkColor
}): Promise<Mark | null> {
  const rect = clampNormRect(params.x, params.y, params.w, params.h)
  if (!isValidMarkSize(rect.w, rect.h)) return null
  const now = nowIso()
  const mark: Mark = {
    id: createId(),
    documentId: params.documentId,
    page: params.page,
    ...rect,
    color: params.color,
    hiddenInStudy: true,
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
  }
  await db.transaction('rw', db.marks, db.reviewStates, async () => {
    await db.marks.put(mark)
    await reviewRepo.ensureReviewState(mark.id, mark.documentId)
  })
  return mark
}

export async function updateMarkGeometry(
  id: string,
  rect: { x: number; y: number; w: number; h: number },
): Promise<void> {
  const clamped = clampNormRect(rect.x, rect.y, rect.w, rect.h)
  await db.marks.update(id, { ...clamped, updatedAt: nowIso() })
}

export async function deleteMark(id: string): Promise<void> {
  await db.transaction('rw', db.marks, db.reviewStates, async () => {
    await db.marks.delete(id)
    await reviewRepo.deleteReviewState(id)
  })
}

export async function toggleMarkHidden(id: string): Promise<void> {
  const mark = await db.marks.get(id)
  if (!mark) return
  await db.marks.update(id, { hiddenInStudy: !mark.hiddenInStudy, updatedAt: nowIso() })
}

export async function setMarkFavorite(id: string, isFavorite: boolean): Promise<void> {
  await db.marks.update(id, { isFavorite, updatedAt: nowIso() })
}

export async function setMarkColor(id: string, color: MarkColor): Promise<void> {
  await db.marks.update(id, { color, updatedAt: nowIso() })
}
