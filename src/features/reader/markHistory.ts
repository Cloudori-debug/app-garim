import type { Mark, MarkColor } from '@/entities/mark/types'
import type { ReviewState } from '@/entities/review/types'

export type MarkRect = { x: number; y: number; w: number; h: number }

export type MarkHistoryOp =
  | { kind: 'create'; mark: Mark }
  | { kind: 'delete'; mark: Mark; review: ReviewState | null }
  | { kind: 'geometry'; id: string; before: MarkRect; after: MarkRect }
  | { kind: 'color'; id: string; before: MarkColor; after: MarkColor }

export function rectsEqual(a: MarkRect, b: MarkRect) {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
}
