export type ReviewGrade = 'again' | 'good'

/** 가림(Mark) 1:1 복습 상태. SRS 필드는 Mark에 넣지 않음. */
export interface ReviewState {
  id: string
  markId: string
  documentId: string
  /** 일 단위 간격 */
  interval: number
  ease: number
  repetitions: number
  lapses: number
  /** ISO — 이 시각 이전이면 due */
  dueAt: string
  lastReviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ReviewQueueItem {
  markId: string
  documentId: string
  fileName: string
  page: number
  dueAt: string
}
