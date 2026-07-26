export interface PageFavorite {
  id: string
  documentId: string
  page: number
  createdAt: string
}

export interface PageFavoriteItem extends PageFavorite {
  fileName: string
}
