export type PageLayout = 'portrait' | 'landscape'

export interface Document {
  id: string
  folderId: string
  fileName: string
  blobId: string
  pageCount: number
  lastPage: number
  isFavorite: boolean
  /** 세로(기본) | 가로 스캔 — 리더 맞춤 배율에 사용 */
  pageLayout: PageLayout
  /** 학습·단어가림에서 숨길 PDF 페이지(1-based). PDF 파일 자체는 변경하지 않음 */
  hiddenPages: number[]
  createdAt: string
  updatedAt: string
}

export interface HiddenPageItem {
  documentId: string
  fileName: string
  page: number
}

export interface PdfBlob {
  id: string
  blob: Blob
  mimeType: string
  size: number
  createdAt: string
}
