import { db } from '@/entities/db'
import type { Folder } from '@/entities/folder/types'
import { createId, nowIso } from '@/shared/lib/id'

const MAX_DEPTH = 2

async function folderDepth(folderId: string | null): Promise<number> {
  let depth = 0
  let current = folderId
  while (current) {
    depth += 1
    const folder = await db.folders.get(current)
    current = folder?.parentId ?? null
  }
  return depth
}

export async function listFolders(): Promise<Folder[]> {
  const all = await db.folders.toArray()
  return all.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export async function createFolder(name: string, parentId: string | null = null): Promise<Folder> {
  const depth = await folderDepth(parentId)
  if (depth >= MAX_DEPTH) {
    throw new Error(`폴더는 최대 ${MAX_DEPTH}단까지 가능합니다.`)
  }
  const sameParent = (await db.folders.toArray()).filter((f) => f.parentId === parentId)
  const now = nowIso()
  const folder: Folder = {
    id: createId(),
    parentId,
    name: name.trim() || '새 폴더',
    sortOrder: Math.max(0, ...sameParent.map((f) => f.sortOrder)) + 1,
    createdAt: now,
    updatedAt: now,
  }
  await db.folders.put(folder)
  return folder
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) return
  await db.folders.update(id, { name: trimmed, updatedAt: nowIso() })
}

export async function deleteFolder(id: string): Promise<void> {
  const children = (await db.folders.toArray()).filter((f) => f.parentId === id)
  for (const child of children) {
    await deleteFolder(child.id)
  }
  const docs = await db.documents.where('folderId').equals(id).toArray()
  for (const doc of docs) {
    await db.marks.where('documentId').equals(doc.id).delete()
    await db.pdfBlobs.delete(doc.blobId)
    await db.documents.delete(doc.id)
  }
  await db.folders.delete(id)
}

/** 폴더를 다른 부모(또는 루트)로 옮김. 최대 2단 계층 유지. */
export async function moveFolder(id: string, newParentId: string | null): Promise<void> {
  const folder = await db.folders.get(id)
  if (!folder) return
  if (folder.parentId === newParentId) return
  if (newParentId === id) throw new Error('자기 자신 아래로 옮길 수 없습니다.')

  if (newParentId) {
    const parent = await db.folders.get(newParentId)
    if (!parent) throw new Error('대상 폴더를 찾을 수 없습니다.')
    if (parent.parentId !== null) {
      throw new Error('하위 폴더 아래로는 옮길 수 없습니다.')
    }
    const hasChildren = (await db.folders.toArray()).some((f) => f.parentId === id)
    if (hasChildren) {
      throw new Error('하위 폴더가 있는 폴더는 다른 폴더 안으로 옮길 수 없습니다.')
    }
  }

  const sameParent = (await db.folders.toArray()).filter(
    (f) => f.parentId === newParentId && f.id !== id,
  )
  await db.folders.update(id, {
    parentId: newParentId,
    sortOrder: Math.max(0, ...sameParent.map((f) => f.sortOrder)) + 1,
    updatedAt: nowIso(),
  })
}

/** 편집 모드 초안을 DB에 반영 (삭제 → 생성/수정) */
export async function commitFolderDraft(baseline: Folder[], draft: Folder[]): Promise<void> {
  const draftIds = new Set(draft.map((f) => f.id))
  const baselineMap = new Map(baseline.map((f) => [f.id, f]))

  for (const base of baseline) {
    if (draftIds.has(base.id)) continue
    const still = await db.folders.get(base.id)
    if (still) await deleteFolder(base.id)
  }

  for (const folder of draft) {
    const prev = baselineMap.get(folder.id)
    if (!prev) {
      await db.folders.put({ ...folder, updatedAt: nowIso() })
      continue
    }
    if (
      prev.name !== folder.name ||
      prev.parentId !== folder.parentId ||
      prev.sortOrder !== folder.sortOrder
    ) {
      await db.folders.update(folder.id, {
        name: folder.name,
        parentId: folder.parentId,
        sortOrder: folder.sortOrder,
        updatedAt: nowIso(),
      })
    }
  }
}
