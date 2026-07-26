export type MarkColor = 'yellow' | 'red' | 'purple'

export interface Mark {
  id: string
  documentId: string
  page: number
  x: number
  y: number
  w: number
  h: number
  color: MarkColor
  hiddenInStudy: boolean
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}
