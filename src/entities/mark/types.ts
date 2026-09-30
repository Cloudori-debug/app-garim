export type MarkColor = 'yellow' | 'red' | 'purple'

export type MarkPoint = { x: number; y: number }

export interface Mark {
  id: string
  documentId: string
  page: number
  x: number
  y: number
  w: number
  h: number
  /** 형광펜 경로(정규화 좌표). 없으면 예전 네모에서 복원 */
  points?: MarkPoint[]
  /** 페이지 높이 기준 획 굵기(0–1) */
  strokeWidth?: number
  color: MarkColor
  hiddenInStudy: boolean
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}
