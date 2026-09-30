import { db } from '@/entities/db'
import type { Document, HiddenPageItem, PageLayout, PdfBlob } from '@/entities/document/types'
import { createId, nowIso } from '@/shared/lib/id'

export async function countDocuments(): Promise<number> {
  return db.documents.count()
}

export async function listDocumentsByFolder(folderId: string): Promise<Document[]> {
  const docs = await db.documents.where('folderId').equals(folderId).toArray()
  return docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function listFavoriteDocuments(): Promise<Document[]> {
  const docs = await db.documents.filter((d) => d.isFavorite).toArray()
  return docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getDocument(id: string): Promise<Document | undefined> {
  return db.documents.get(id)
}

export async function getPdfBlob(blobId: string): Promise<PdfBlob | undefined> {
  return db.pdfBlobs.get(blobId)
}

export async function addDocument(params: {
  folderId: string
  file: File
  pageCount: number
  pageLayout?: PageLayout
}): Promise<Document> {
  const now = nowIso()
  const blobId = createId()
  const blobRow: PdfBlob = {
    id: blobId,
    blob: params.file,
    mimeType: params.file.type || 'application/pdf',
    size: params.file.size,
    createdAt: now,
  }
  const doc: Document = {
    id: createId(),
    folderId: params.folderId,
    fileName: params.file.name,
    blobId,
    pageCount: params.pageCount,
    lastPage: 1,
    isFavorite: false,
    pageLayout: params.pageLayout ?? 'portrait',
    hiddenPages: [],
    createdAt: now,
    updatedAt: now,
  }
  await db.transaction('rw', db.pdfBlobs, db.documents, async () => {
    await db.pdfBlobs.put(blobRow)
    await db.documents.put(doc)
  })
  return doc
}

export async function deleteDocument(id: string): Promise<void> {
  const doc = await db.documents.get(id)
  if (!doc) return
  await db.transaction(
    'rw',
    db.documents,
    db.pdfBlobs,
    db.marks,
    db.reviewStates,
    db.pageFavorites,
    async () => {
      await db.pageFavorites.where('documentId').equals(id).delete()
      await db.reviewStates.where('documentId').equals(id).delete()
      await db.marks.where('documentId').equals(id).delete()
      await db.pdfBlobs.delete(doc.blobId)
      await db.documents.delete(id)
    },
  )
}

export async function updateLastPage(id: string, page: number): Promise<void> {
  await db.documents.update(id, { lastPage: page, updatedAt: nowIso() })
}

export async function setDocumentFavorite(id: string, isFavorite: boolean): Promise<void> {
  await db.documents.update(id, { isFavorite, updatedAt: nowIso() })
}

export async function setDocumentPageLayout(id: string, pageLayout: PageLayout): Promise<void> {
  await db.documents.update(id, { pageLayout, updatedAt: nowIso() })
}

export async function setPageHidden(
  id: string,
  page: number,
  hidden: boolean,
): Promise<Document | undefined> {
  const doc = await db.documents.get(id)
  if (!doc) return undefined
  const set = new Set(doc.hiddenPages ?? [])
  if (hidden) set.add(page)
  else set.delete(page)
  const hiddenPages = [...set].sort((a, b) => a - b)
  await db.documents.update(id, { hiddenPages, updatedAt: nowIso() })
  return db.documents.get(id)
}

export async function listHiddenPages(): Promise<HiddenPageItem[]> {
  const docs = await db.documents.toArray()
  const items: HiddenPageItem[] = []
  for (const doc of docs) {
    for (const page of doc.hiddenPages ?? []) {
      items.push({ documentId: doc.id, fileName: doc.fileName, page })
    }
  }
  items.sort((a, b) => a.fileName.localeCompare(b.fileName) || a.page - b.page)
  return items
}

export function normalizePdfFileName(name: string): string | null {
  const trimmed = name.trim().replace(/[/\\]/g, '')
  if (!trimmed) return null
  const base = trimmed.replace(/\.pdf$/i, '')
  if (!base) return null
  return `${base}.pdf`
}

export async function renameDocument(id: string, fileName: string): Promise<void> {
  const next = normalizePdfFileName(fileName)
  if (!next) return
  const doc = await db.documents.get(id)
  if (!doc || doc.fileName === next) return
  await db.documents.update(id, { fileName: next, updatedAt: nowIso() })
}

export async function moveDocument(id: string, folderId: string): Promise<void> {
  const doc = await db.documents.get(id)
  if (!doc) return
  if (doc.folderId === folderId) return
  const folder = await db.folders.get(folderId)
  if (!folder) throw new Error('대상 폴더를 찾을 수 없습니다.')
  await db.documents.update(id, { folderId, updatedAt: nowIso() })
}

export async function updatePageCount(id: string, pageCount: number): Promise<void> {
  await db.documents.update(id, { pageCount, updatedAt: nowIso() })
}
