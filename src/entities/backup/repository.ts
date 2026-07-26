import { db, DB_VERSION } from '@/entities/db'
import type { AppState } from '@/entities/app-state/types'
import type { Document, PdfBlob } from '@/entities/document/types'
import type { Folder } from '@/entities/folder/types'
import type { Mark } from '@/entities/mark/types'
import type { PageFavorite } from '@/entities/pageFavorite/types'
import type { ReviewState } from '@/entities/review/types'
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type BackupBundle,
  type BackupPdfBlob,
} from '@/entities/backup/types'
import { THEME_STORAGE_KEY } from '@/shared/lib/theme'

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  const parts: string[] = []
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk)
    let s = ''
    for (let j = 0; j < slice.length; j++) {
      s += String.fromCharCode(slice[j]!)
    }
    parts.push(s)
  }
  return btoa(parts.join(''))
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType || 'application/pdf' })
}

export async function buildBackupBundle(): Promise<BackupBundle> {
  const [folders, documents, marks, reviewStates, pageFavorites, appState, pdfBlobRows] =
    await Promise.all([
      db.folders.toArray(),
      db.documents.toArray(),
      db.marks.toArray(),
      db.reviewStates.toArray(),
      db.pageFavorites.toArray(),
      db.appState.toArray(),
      db.pdfBlobs.toArray(),
    ])

  const pdfBlobs: BackupPdfBlob[] = []
  for (const row of pdfBlobRows) {
    pdfBlobs.push({
      id: row.id,
      mimeType: row.mimeType,
      size: row.size,
      createdAt: row.createdAt,
      dataBase64: await blobToBase64(row.blob),
    })
  }

  let theme: string | null = null
  try {
    theme = localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    theme = null
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    dbVersion: DB_VERSION,
    theme,
    folders,
    documents,
    marks,
    reviewStates,
    pageFavorites,
    appState,
    pdfBlobs,
  }
}

export async function downloadBackupFile(): Promise<{ fileName: string; byteSize: number }> {
  const bundle = await buildBackupBundle()
  const json = JSON.stringify(bundle)
  const blob = new Blob([json], { type: 'application/json' })
  const stamp = new Date().toISOString().slice(0, 10)
  const fileName = `암기노트-백업-${stamp}.json`
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
  return { fileName, byteSize: blob.size }
}

function isBackupBundle(value: unknown): value is BackupBundle {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    v.format === BACKUP_FORMAT &&
    v.version === BACKUP_VERSION &&
    Array.isArray(v.folders) &&
    Array.isArray(v.documents) &&
    Array.isArray(v.marks) &&
    Array.isArray(v.pdfBlobs)
  )
}

export async function parseBackupFile(file: File): Promise<BackupBundle> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('백업 파일을 읽을 수 없습니다. JSON 형식인지 확인하세요.')
  }
  if (!isBackupBundle(parsed)) {
    throw new Error('암기노트 백업 파일이 아닙니다.')
  }
  return parsed
}

/** 기존 데이터를 지우고 백업으로 교체합니다. */
export async function restoreBackupBundle(bundle: BackupBundle): Promise<void> {
  if (!isBackupBundle(bundle)) {
    throw new Error('암기노트 백업 파일이 아닙니다.')
  }

  const folders = bundle.folders as Folder[]
  const documents = bundle.documents as Document[]
  const marks = bundle.marks as Mark[]
  const reviewStates = (bundle.reviewStates ?? []) as ReviewState[]
  const pageFavorites = (bundle.pageFavorites ?? []) as PageFavorite[]
  const appState = (bundle.appState ?? []) as AppState[]

  const pdfBlobs: PdfBlob[] = bundle.pdfBlobs.map((row) => ({
    id: row.id,
    mimeType: row.mimeType || 'application/pdf',
    size: row.size,
    createdAt: row.createdAt,
    blob: base64ToBlob(row.dataBase64, row.mimeType || 'application/pdf'),
  }))

  await db.transaction('rw', db.tables, async () => {
    await Promise.all([
      db.folders.clear(),
      db.documents.clear(),
      db.pdfBlobs.clear(),
      db.marks.clear(),
      db.reviewStates.clear(),
      db.pageFavorites.clear(),
      db.appState.clear(),
    ])
    if (folders.length) await db.folders.bulkPut(folders)
    if (documents.length) await db.documents.bulkPut(documents)
    if (pdfBlobs.length) await db.pdfBlobs.bulkPut(pdfBlobs)
    if (marks.length) await db.marks.bulkPut(marks)
    if (reviewStates.length) await db.reviewStates.bulkPut(reviewStates)
    if (pageFavorites.length) await db.pageFavorites.bulkPut(pageFavorites)
    if (appState.length) await db.appState.bulkPut(appState)
  })

  if (bundle.theme) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, bundle.theme)
    } catch {
      /* ignore */
    }
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
