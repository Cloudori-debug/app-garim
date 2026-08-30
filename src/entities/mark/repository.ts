import { db } from '@/entities/db'
import type { Mark, MarkColor } from '@/entities/mark/types'
import * as reviewRepo from '@/entities/review/repository'
import type { ReviewState } from '@/entities/review/types'
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

/** 삭제한 가림을 같은 id로 되돌립니다. 복습 일정도 함께 복구합니다. */
export async function restoreMark(mark: Mark, review?: ReviewState | null): Promise<void> {
  await db.transaction('rw', db.marks, db.reviewStates, async () => {
    await db.marks.put(mark)
    if (review) await db.reviewStates.put(review)
    else await reviewRepo.ensureReviewState(mark.id, mark.documentId)
  })
}

export async function toggleMarkHidden(id: string): Promise<void> {
  const mark = await db.marks.get(id)
  if (!mark) return
  await db.marks.update(id, { hiddenInStudy: !mark.hiddenInStudy, updatedAt: nowIso() })
}

/** 문서(또는 특정 페이지) 가림을 일괄 열기/가리기. 변경된 개수 반환 */
export async function setMarksHiddenInStudy(
  documentId: string,
  hiddenInStudy: boolean,
  page?: number,
): Promise<number> {
  let marks = await listMarksByDocument(documentId)
  if (page != null) marks = marks.filter((m) => m.page === page)
  const targets = marks.filter((m) => m.hiddenInStudy !== hiddenInStudy)
  if (targets.length === 0) return 0
  const now = nowIso()
  await db.transaction('rw', db.marks, async () => {
    await Promise.all(
      targets.map((m) => db.marks.update(m.id, { hiddenInStudy, updatedAt: now })),
    )
  })
  return targets.length
}

export async function setMarkFavorite(id: string, isFavorite: boolean): Promise<void> {
  await db.marks.update(id, { isFavorite, updatedAt: nowIso() })
}

export async function setMarkColor(id: string, color: MarkColor): Promise<void> {
  await db.marks.update(id, { color, updatedAt: nowIso() })
}
