import type { MarkGeometry } from '@/entities/mark/repository'
import type { Mark, MarkColor } from '@/entities/mark/types'
import type { ReviewState } from '@/entities/review/types'

export type { MarkGeometry }

export type MarkHistoryOp =
  | { kind: 'create'; mark: Mark }
  | { kind: 'delete'; mark: Mark; review: ReviewState | null }
  | { kind: 'geometry'; id: string; before: MarkGeometry; after: MarkGeometry }
  | { kind: 'color'; id: string; before: MarkColor; after: MarkColor }

export function geometriesEqual(a: MarkGeometry, b: MarkGeometry) {
  if (
    a.x !== b.x ||
    a.y !== b.y ||
    a.w !== b.w ||
    a.h !== b.h ||
    a.strokeWidth !== b.strokeWidth ||
    a.points.length !== b.points.length
  ) {
    return false
  }
  return a.points.every((p, i) => p.x === b.points[i]?.x && p.y === b.points[i]?.y)
}
