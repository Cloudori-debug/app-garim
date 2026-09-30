import Dexie, { type EntityTable } from 'dexie'

import type { AppState } from '@/entities/app-state/types'
import type { Document, PdfBlob } from '@/entities/document/types'
import type { Folder } from '@/entities/folder/types'
import type { Mark } from '@/entities/mark/types'
import type { PageFavorite } from '@/entities/pageFavorite/types'
import type { ReviewState } from '@/entities/review/types'
import { legacyStrokeFromRect, strokeBounds } from '@/shared/lib/stroke'

export const DB_NAME = 'AmgiNote'
export const DB_VERSION = 6

class AmgiNoteDatabase extends Dexie {
  folders!: EntityTable<Folder, 'id'>
  documents!: EntityTable<Document, 'id'>
  pdfBlobs!: EntityTable<PdfBlob, 'id'>
  marks!: EntityTable<Mark, 'id'>
  appState!: EntityTable<AppState, 'id'>
  reviewStates!: EntityTable<ReviewState, 'id'>
  pageFavorites!: EntityTable<PageFavorite, 'id'>

  constructor() {
    super(DB_NAME)
    this.version(1).stores({
      folders: 'id, parentId, sortOrder, updatedAt',
      documents: 'id, folderId, blobId, isFavorite, updatedAt',
      pdfBlobs: 'id, createdAt',
      marks: 'id, documentId, page, isFavorite, updatedAt',
      appState: 'id',
    })
    this.version(2)
      .stores({
        folders: 'id, parentId, sortOrder, updatedAt',
        documents: 'id, folderId, blobId, isFavorite, updatedAt',
        pdfBlobs: 'id, createdAt',
        marks: 'id, documentId, page, isFavorite, updatedAt',
        appState: 'id',
        reviewStates: 'id, markId, documentId, dueAt, updatedAt',
      })
      .upgrade(async (tx) => {
        const marks = await tx.table('marks').toArray()
        const now = new Date().toISOString()
        for (const m of marks) {
          await tx.table('reviewStates').put({
            id: m.id,
            markId: m.id,
            documentId: m.documentId,
            interval: 0,
            ease: 2.5,
            repetitions: 0,
            lapses: 0,
            dueAt: now,
            lastReviewedAt: null,
            createdAt: now,
            updatedAt: now,
          })
        }
      })
    this.version(3).stores({
      folders: 'id, parentId, sortOrder, updatedAt',
      documents: 'id, folderId, blobId, isFavorite, updatedAt',
      pdfBlobs: 'id, createdAt',
      marks: 'id, documentId, page, isFavorite, updatedAt',
      appState: 'id',
      reviewStates: 'id, markId, documentId, dueAt, updatedAt',
      pageFavorites: 'id, documentId, page, createdAt',
    })
    this.version(4)
      .stores({
        folders: 'id, parentId, sortOrder, updatedAt',
        documents: 'id, folderId, blobId, isFavorite, pageLayout, updatedAt',
        pdfBlobs: 'id, createdAt',
        marks: 'id, documentId, page, isFavorite, updatedAt',
        appState: 'id',
        reviewStates: 'id, markId, documentId, dueAt, updatedAt',
        pageFavorites: 'id, documentId, page, createdAt',
      })
      .upgrade(async (tx) => {
        const docs = await tx.table('documents').toArray()
        for (const d of docs) {
          if (!d.pageLayout) {
            await tx.table('documents').update(d.id, { pageLayout: 'portrait' })
          }
        }
      })
    this.version(5)
      .stores({
        folders: 'id, parentId, sortOrder, updatedAt',
        documents: 'id, folderId, blobId, isFavorite, pageLayout, updatedAt',
        pdfBlobs: 'id, createdAt',
        marks: 'id, documentId, page, isFavorite, updatedAt',
        appState: 'id',
        reviewStates: 'id, markId, documentId, dueAt, updatedAt',
        pageFavorites: 'id, documentId, page, createdAt',
      })
      .upgrade(async (tx) => {
        const docs = await tx.table('documents').toArray()
        for (const d of docs) {
          if (!Array.isArray(d.hiddenPages)) {
            await tx.table('documents').update(d.id, { hiddenPages: [] })
          }
        }
      })
    this.version(6)
      .stores({
        folders: 'id, parentId, sortOrder, updatedAt',
        documents: 'id, folderId, blobId, isFavorite, pageLayout, updatedAt',
        pdfBlobs: 'id, createdAt',
        marks: 'id, documentId, page, isFavorite, updatedAt',
        appState: 'id',
        reviewStates: 'id, markId, documentId, dueAt, updatedAt',
        pageFavorites: 'id, documentId, page, createdAt',
      })
      .upgrade(async (tx) => {
        const marks = await tx.table('marks').toArray()
        for (const m of marks) {
          if (Array.isArray(m.points) && m.points.length > 0) continue
          const stroke = legacyStrokeFromRect(m)
          const box = strokeBounds(stroke.points, stroke.strokeWidth)
          await tx.table('marks').update(m.id, {
            points: stroke.points,
            strokeWidth: stroke.strokeWidth,
            ...box,
          })
        }
      })
  }
}

export const db = new AmgiNoteDatabase()
