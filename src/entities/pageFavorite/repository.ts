import { db } from '@/entities/db'
import type { PageFavorite, PageFavoriteItem } from '@/entities/pageFavorite/types'
import { nowIso } from '@/shared/lib/id'

function favId(documentId: string, page: number) {
  return `${documentId}:${page}`
}

export async function listPageFavorites(): Promise<PageFavoriteItem[]> {
  const rows = await db.pageFavorites.toArray()
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const items: PageFavoriteItem[] = []
  for (const row of rows) {
    const doc = await db.documents.get(row.documentId)
    if (!doc) continue
    items.push({ ...row, fileName: doc.fileName })
  }
  return items
}

export async function listFavoritePagesForDocument(documentId: string): Promise<number[]> {
  const rows = await db.pageFavorites.where('documentId').equals(documentId).toArray()
  return rows.map((r) => r.page).sort((a, b) => a - b)
}

export async function isPageFavorite(documentId: string, page: number): Promise<boolean> {
  const row = await db.pageFavorites.get(favId(documentId, page))
  return !!row
}

export async function togglePageFavorite(documentId: string, page: number): Promise<boolean> {
  const id = favId(documentId, page)
  const existing = await db.pageFavorites.get(id)
  if (existing) {
    await db.pageFavorites.delete(id)
    return false
  }
  const row: PageFavorite = {
    id,
    documentId,
    page,
    createdAt: nowIso(),
  }
  await db.pageFavorites.put(row)
  return true
}

export async function removePageFavorite(id: string): Promise<void> {
  await db.pageFavorites.delete(id)
}

export async function deletePageFavoritesByDocument(documentId: string): Promise<void> {
  await db.pageFavorites.where('documentId').equals(documentId).delete()
}
