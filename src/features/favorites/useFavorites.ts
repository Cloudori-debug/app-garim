import { useCallback, useEffect, useState } from 'react'

import * as documentRepo from '@/entities/document/repository'
import * as markRepo from '@/entities/mark/repository'
import type { Document } from '@/entities/document/types'
import type { Mark } from '@/entities/mark/types'

export interface FavoriteMarkItem extends Mark {
  documentName: string
}

export function useFavorites() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [marks, setMarks] = useState<FavoriteMarkItem[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [docs, markList] = await Promise.all([
        documentRepo.listFavoriteDocuments(),
        markRepo.listFavoriteMarks(),
      ])
      const withNames: FavoriteMarkItem[] = await Promise.all(
        markList.map(async (mark) => {
          const doc = await documentRepo.getDocument(mark.documentId)
          return { ...mark, documentName: doc?.fileName ?? 'PDF' }
        }),
      )
      setDocuments(docs)
      setMarks(withNames)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { documents, marks, loading, refresh }
}
