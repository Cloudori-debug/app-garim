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

export type SubjectReviewStat = {
  folderId: string
  name: string
  total: number
  due: number
  /** 한 번이라도 틀림(lapses>0) */
  weak: number
}

export type ReviewStatsSummary = {
  total: number
  due: number
  reviewedToday: number
  weak: number
  bySubject: SubjectReviewStat[]
}
