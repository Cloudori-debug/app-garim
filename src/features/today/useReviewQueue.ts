import { useCallback, useEffect, useState } from 'react'

import { db } from '@/entities/db'
import * as folderRepo from '@/entities/folder/repository'
import * as reviewRepo from '@/entities/review/repository'
import type { ReviewQueueItem } from '@/entities/review/types'

export type DocCount = {
  documentId: string
  fileName: string
  folderId: string
  dueCount: number
  practiceCount: number
}

export type SubjectGroup = {
  folderId: string
  name: string
  dueCount: number
  practiceCount: number
  docs: DocCount[]
}

function groupByDoc(items: ReviewQueueItem[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of items) {
    map.set(item.documentId, (map.get(item.documentId) ?? 0) + 1)
  }
  return map
}

export function useReviewQueue() {
  const [dueCount, setDueCount] = useState(0)
  const [practiceCount, setPracticeCount] = useState(0)
  const [subjects, setSubjects] = useState<SubjectGroup[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      await reviewRepo.backfillMissingReviewStates()
      await folderRepo.ensureDefaultFolder()

      const dueItems = await reviewRepo.listDueQueue()
      const practiceItems = await reviewRepo.listPracticeQueue({ shuffle: false })
      setDueCount(dueItems.length)
      setPracticeCount(practiceItems.length)

      const dueMap = groupByDoc(dueItems)
      const practiceMap = groupByDoc(practiceItems)
      const docIds = new Set([...dueMap.keys(), ...practiceMap.keys()])
      if (docIds.size === 0) {
        setSubjects([])
        return
      }

      const folders = await folderRepo.listFolders()
      const folderName = new Map(folders.map((f) => [f.id, f.name]))
      const byFolder = new Map<string, DocCount[]>()

      for (const documentId of docIds) {
        const doc = await db.documents.get(documentId)
        if (!doc) continue
        const entry: DocCount = {
          documentId: doc.id,
          fileName: doc.fileName,
          folderId: doc.folderId,
          dueCount: dueMap.get(documentId) ?? 0,
          practiceCount: practiceMap.get(documentId) ?? 0,
        }
        const list = byFolder.get(doc.folderId) ?? []
        list.push(entry)
        byFolder.set(doc.folderId, list)
      }

      const groups: SubjectGroup[] = [...byFolder.entries()]
        .map(([folderId, docs]) => {
          docs.sort((a, b) => a.fileName.localeCompare(b.fileName, 'ko'))
          return {
            folderId,
            name: folderName.get(folderId) ?? '서재',
            dueCount: docs.reduce((s, d) => s + d.dueCount, 0),
            practiceCount: docs.reduce((s, d) => s + d.practiceCount, 0),
            docs,
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

      setSubjects(groups)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refresh])

  return { dueCount, practiceCount, subjects, loading, refresh }
}
