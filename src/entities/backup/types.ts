/** 암기노트 백업 포맷 v1 */

export const BACKUP_FORMAT = 'amgi-note-backup' as const
export const BACKUP_VERSION = 1 as const

export type BackupPdfBlob = {
  id: string
  mimeType: string
  size: number
  createdAt: string
  /** PDF bytes as base64 */
  dataBase64: string
}

export type BackupBundle = {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  exportedAt: string
  dbVersion: number
  theme?: string | null
  folders: unknown[]
  documents: unknown[]
  marks: unknown[]
  reviewStates: unknown[]
  pageFavorites: unknown[]
  appState: unknown[]
  pdfBlobs: BackupPdfBlob[]
}
