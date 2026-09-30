import { useCallback, useEffect, useState } from 'react'

import * as markRepo from '@/entities/mark/repository'
import type { MarkGeometry } from '@/entities/mark/repository'
import type { Mark, MarkColor, MarkPoint } from '@/entities/mark/types'

export function useMarks(documentId: string | undefined) {
  const [marks, setMarks] = useState<Mark[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!documentId) {
      setMarks([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setMarks(await markRepo.listMarksByDocument(documentId))
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const create = useCallback(
    async (params: {
      page: number
      color: MarkColor
      points: MarkPoint[]
      strokeWidth: number
    }) => {
      if (!documentId) return null
      const mark = await markRepo.createMark({ documentId, ...params })
      await refresh()
      return mark
    },
    [documentId, refresh],
  )

  const updateGeometry = useCallback(
    async (id: string, geo: MarkGeometry) => {
      await markRepo.updateMarkGeometry(id, geo)
      await refresh()
    },
    [refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      await markRepo.deleteMark(id)
      await refresh()
    },
    [refresh],
  )

  const toggleHidden = useCallback(
    async (id: string) => {
      await markRepo.toggleMarkHidden(id)
      await refresh()
    },
    [refresh],
  )

  const setHiddenBulk = useCallback(
    async (hiddenInStudy: boolean, page?: number) => {
      if (!documentId) return 0
      const n = await markRepo.setMarksHiddenInStudy(documentId, hiddenInStudy, page)
      await refresh()
      return n
    },
    [documentId, refresh],
  )

  const toggleFavorite = useCallback(
    async (id: string, isFavorite: boolean) => {
      await markRepo.setMarkFavorite(id, isFavorite)
      await refresh()
    },
    [refresh],
  )

  const setColor = useCallback(
    async (id: string, color: MarkColor) => {
      await markRepo.setMarkColor(id, color)
      await refresh()
    },
    [refresh],
  )

  return {
    marks,
    loading,
    refresh,
    create,
    updateGeometry,
    remove,
    toggleHidden,
    setHiddenBulk,
    toggleFavorite,
    setColor,
  }
}
